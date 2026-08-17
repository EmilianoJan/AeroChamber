#include <Arduino.h>

#include "ble_server.h"
#include "device_protocol.h"
#include "device_state.h"

BleServer g_ble;
DeviceState g_state;
protocol::Reassembler g_reassembler;

static uint32_t g_lastStatusPushMs = 0;

static void sendStatusEvent() {
    const auto snapshot = g_state.snapshot();
    g_ble.notifyStatusJson(protocol::buildStatusEvent(snapshot));
}

static void handleCommand(const protocol::Command &cmd) {
    const auto validation = protocol::validateCommand(cmd);
    if (!validation.ok) {
        g_ble.notifyResponseJson(protocol::buildErrorResponse(cmd.id, validation.error));
        return;
    }

    const auto snapshot = g_state.snapshot();

    if (cmd.command == "GET_STATUS") {
        g_ble.notifyResponseJson(protocol::buildSuccessResponse(cmd.id, &snapshot, true, false));
        return;
    }

    if (cmd.command == "GET_DEVICE_INFO") {
        g_ble.notifyResponseJson(protocol::buildSuccessResponse(cmd.id, &snapshot, false, true));
        return;
    }

    if (cmd.command == "START") {
        g_state.start();
        const auto updated = g_state.snapshot();
        g_ble.notifyResponseJson(protocol::buildSuccessResponse(cmd.id, &updated, true, false));
        sendStatusEvent();
        return;
    }

    if (cmd.command == "STOP") {
        g_state.stop();
        const auto updated = g_state.snapshot();
        g_ble.notifyResponseJson(protocol::buildSuccessResponse(cmd.id, &updated, true, false));
        sendStatusEvent();
        return;
    }

    if (cmd.command == "SET_PARAMETER") {
        if (cmd.parameter == "frequency" && g_state.setFrequency(static_cast<uint32_t>(cmd.value))) {
            const auto updated = g_state.snapshot();
            g_ble.notifyResponseJson(protocol::buildSuccessResponse(cmd.id, &updated, true, false));
            sendStatusEvent();
        } else {
            g_ble.notifyResponseJson(protocol::buildErrorResponse(cmd.id, "Invalid frequency"));
        }
        return;
    }

    g_ble.notifyResponseJson(protocol::buildErrorResponse(cmd.id, "Unknown command"));
}

static void onFrameReceived(const uint8_t *data, size_t len) {
    const auto result = g_reassembler.ingest(data, len, millis());
    if (result.malformed) {
        g_ble.notifyResponseJson(protocol::buildErrorResponse(0, "Malformed packet"));
        return;
    }

    if (!result.complete) {
        return;
    }

    protocol::Command cmd;
    if (!protocol::parseCommand(result.json, cmd)) {
        g_ble.notifyResponseJson(protocol::buildErrorResponse(0, "Invalid JSON"));
        return;
    }

    Serial.printf("[BLE] RX command: %s\n", cmd.command.c_str());
    handleCommand(cmd);
    Serial.println("[BLE] TX response");
}

void setup() {
    Serial.begin(115200);
    delay(500);

    g_ble.setFrameHandler(onFrameReceived);
    g_ble.begin();
}

void loop() {
    g_state.setBleConnected(g_ble.isConnected());
    g_ble.loop();

    const uint32_t nowMs = millis();
    if (g_ble.isConnected() && nowMs - g_lastStatusPushMs >= 2000) {
        g_lastStatusPushMs = nowMs;
        sendStatusEvent();
    }

    delay(10);
}
