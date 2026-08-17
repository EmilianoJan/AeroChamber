#include "device_protocol.h"

#include <ArduinoJson.h>

namespace protocol {

static CommandResult makeResult(bool ok, const char *error) {
    CommandResult result;
    result.ok = ok;
    result.error = error == nullptr ? "" : error;
    return result;
}

static uint16_t readU16(const uint8_t *p) {
    return static_cast<uint16_t>((static_cast<uint16_t>(p[0]) << 8U) | p[1]);
}

static void writeU16(uint8_t *p, uint16_t value) {
    p[0] = static_cast<uint8_t>((value >> 8U) & 0xFFU);
    p[1] = static_cast<uint8_t>(value & 0xFFU);
}

void Reassembler::reset() {
    active_ = false;
    messageId_ = 0;
    totalLen_ = 0;
    receivedLen_ = 0;
    startedAtMs_ = 0;
    buffer_.clear();
}

ReassemblyResult Reassembler::ingest(const uint8_t *data, size_t len, uint32_t nowMs) {
    ReassemblyResult result;

    if (data == nullptr || len < kFrameHeaderSize) {
        result.malformed = true;
        return result;
    }

    if (active_ && (nowMs - startedAtMs_ > kReassemblyTimeoutMs)) {
        reset();
    }

    const uint8_t version = data[0];
    const uint8_t flags = data[1];
    const uint16_t messageId = readU16(data + 2);
    const uint16_t totalLen = readU16(data + 4);
    const uint16_t offset = readU16(data + 6);
    const uint8_t *payload = data + kFrameHeaderSize;
    const size_t payloadLen = len - kFrameHeaderSize;

    if (version != kFrameVersion || totalLen == 0 || totalLen > kMaxAppMessageSize) {
        result.malformed = true;
        return result;
    }

    const bool isStart = (flags & 0x01U) != 0;
    const bool isEnd = (flags & 0x02U) != 0;

    if (isStart) {
        active_ = true;
        messageId_ = messageId;
        totalLen_ = totalLen;
        receivedLen_ = 0;
        startedAtMs_ = nowMs;
        buffer_.assign(totalLen_, '\0');
    }

    if (!active_ || messageId_ != messageId || totalLen_ != totalLen || offset != receivedLen_) {
        result.malformed = true;
        return result;
    }

    if (static_cast<size_t>(offset) + payloadLen > totalLen_) {
        result.malformed = true;
        reset();
        return result;
    }

    for (size_t i = 0; i < payloadLen; i++) {
        buffer_[offset + i] = static_cast<char>(payload[i]);
    }
    receivedLen_ = static_cast<uint16_t>(receivedLen_ + payloadLen);

    if (isEnd) {
        if (receivedLen_ != totalLen_) {
            result.malformed = true;
            reset();
            return result;
        }

        result.complete = true;
        result.messageId = messageId_;
        result.json = buffer_;
        reset();
    }

    return result;
}

bool parseCommand(const std::string &json, Command &outCommand) {
    StaticJsonDocument<512> doc;
    const auto err = deserializeJson(doc, json);
    if (err) {
        return false;
    }

    if (!doc["id"].is<uint32_t>() || !doc["command"].is<const char *>()) {
        return false;
    }

    outCommand = Command{};
    outCommand.id = doc["id"].as<uint32_t>();
    outCommand.command = doc["command"].as<const char *>();

    if (doc["parameter"].is<const char *>()) {
        outCommand.parameter = doc["parameter"].as<const char *>();
    }

    if (doc["value"].is<int>()) {
        outCommand.value = doc["value"].as<int>();
        outCommand.hasValue = true;
    }

    return true;
}

CommandResult validateCommand(const Command &command) {
    if (command.id == 0) {
        return makeResult(false, "Invalid request id");
    }

    if (command.command == "GET_STATUS" || command.command == "GET_DEVICE_INFO" || command.command == "START" ||
        command.command == "STOP") {
        return makeResult(true, "");
    }

    if (command.command == "SET_PARAMETER") {
        if (command.parameter != "frequency") {
            return makeResult(false, "Invalid parameter");
        }
        if (!command.hasValue) {
            return makeResult(false, "Missing value");
        }
        if (command.value < 1 || command.value > 5000) {
            return makeResult(false, "Frequency out of range");
        }
        return makeResult(true, "");
    }

    return makeResult(false, "Unknown command");
}

std::string buildSuccessResponse(uint32_t requestId, const DeviceSnapshot *snapshot, bool includeStatus,
                                 bool includeDeviceInfo) {
    StaticJsonDocument<512> doc;
    doc["id"] = requestId;
    doc["success"] = true;

    JsonObject data = doc.createNestedObject("data");
    if (includeStatus && snapshot != nullptr) {
        data["state"] = DeviceState::toString(snapshot->appState);
        data["temperature"] = snapshot->temperature;
        data["battery"] = snapshot->battery;
        data["frequency"] = snapshot->frequency;
    }

    if (includeDeviceInfo) {
        data["device"] = kDeviceName;
        data["firmware"] = kFirmwareVersion;
        data["protocol"] = kProtocolVersion;
    }

    std::string out;
    serializeJson(doc, out);
    return out;
}

std::string buildErrorResponse(uint32_t requestId, const std::string &error) {
    StaticJsonDocument<256> doc;
    doc["id"] = requestId;
    doc["success"] = false;
    doc["error"] = error;

    std::string out;
    serializeJson(doc, out);
    return out;
}

std::string buildStatusEvent(const DeviceSnapshot &snapshot) {
    StaticJsonDocument<256> doc;
    doc["state"] = DeviceState::toString(snapshot.appState);
    doc["temperature"] = snapshot.temperature;
    doc["battery"] = snapshot.battery;
    doc["frequency"] = snapshot.frequency;
    doc["bleConnected"] = snapshot.bleConnected;

    std::string out;
    serializeJson(doc, out);
    return out;
}

std::vector<std::vector<uint8_t>> fragmentMessage(const std::string &json, uint16_t messageId, uint16_t attMtu) {
    std::vector<std::vector<uint8_t>> frames;
    if (json.empty() || json.size() > kMaxAppMessageSize) {
        return frames;
    }

    size_t attPayload = 20;
    if (attMtu > 3) {
        attPayload = attMtu - 3;
    }

    size_t maxChunk = attPayload > kFrameHeaderSize ? attPayload - kFrameHeaderSize : 1;
    size_t offset = 0;

    while (offset < json.size()) {
        size_t chunk = json.size() - offset;
        if (chunk > maxChunk) {
            chunk = maxChunk;
        }

        std::vector<uint8_t> frame(kFrameHeaderSize + chunk);
        frame[0] = kFrameVersion;
        frame[1] = 0;
        if (offset == 0) {
            frame[1] |= 0x01;
        }
        if (offset + chunk == json.size()) {
            frame[1] |= 0x02;
        }

        writeU16(frame.data() + 2, messageId);
        writeU16(frame.data() + 4, static_cast<uint16_t>(json.size()));
        writeU16(frame.data() + 6, static_cast<uint16_t>(offset));

        for (size_t i = 0; i < chunk; i++) {
            frame[kFrameHeaderSize + i] = static_cast<uint8_t>(json[offset + i]);
        }

        frames.push_back(frame);
        offset += chunk;
    }

    return frames;
}

}  // namespace protocol
