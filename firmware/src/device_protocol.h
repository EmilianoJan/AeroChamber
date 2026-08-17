#pragma once

#include <stddef.h>
#include <stdint.h>

#include <string>
#include <vector>

#include "device_state.h"

namespace protocol {

static constexpr char kDeviceName[] = "ESP32-BLE-DEVICE";
static constexpr char kFirmwareVersion[] = "0.1.0";
static constexpr char kProtocolVersion[] = "1.0";

static constexpr char kServiceUuid[] = "12345678-1234-5678-1234-56789abcdef0";
static constexpr char kCommandUuid[] = "12345678-1234-5678-1234-56789abcdef1";
static constexpr char kResponseUuid[] = "12345678-1234-5678-1234-56789abcdef2";
static constexpr char kStatusUuid[] = "12345678-1234-5678-1234-56789abcdef3";

static constexpr uint8_t kFrameVersion = 1;
static constexpr size_t kFrameHeaderSize = 8;
static constexpr size_t kMaxAppMessageSize = 512;
static constexpr uint32_t kReassemblyTimeoutMs = 3000;

struct Command {
    uint32_t id = 0;
    std::string command;
    std::string parameter;
    int value = 0;
    bool hasValue = false;
};

struct CommandResult {
    bool ok = false;
    std::string error;
};

struct Frame {
    uint8_t version = kFrameVersion;
    uint8_t flags = 0;
    uint16_t messageId = 0;
    uint16_t totalLen = 0;
    uint16_t offset = 0;
    std::vector<uint8_t> payload;
};

struct ReassemblyResult {
    bool complete = false;
    bool malformed = false;
    uint16_t messageId = 0;
    std::string json;
};

class Reassembler {
  public:
    ReassemblyResult ingest(const uint8_t *data, size_t len, uint32_t nowMs);

  private:
    void reset();

    bool active_ = false;
    uint16_t messageId_ = 0;
    uint16_t totalLen_ = 0;
    uint16_t receivedLen_ = 0;
    uint32_t startedAtMs_ = 0;
    std::string buffer_;
};

bool parseCommand(const std::string &json, Command &outCommand);
CommandResult validateCommand(const Command &command);
std::string buildSuccessResponse(uint32_t requestId, const DeviceSnapshot *snapshot, bool includeStatus,
                                 bool includeDeviceInfo);
std::string buildErrorResponse(uint32_t requestId, const std::string &error);
std::string buildStatusEvent(const DeviceSnapshot &snapshot);

std::vector<std::vector<uint8_t>> fragmentMessage(const std::string &json, uint16_t messageId, uint16_t attMtu);

}  // namespace protocol
