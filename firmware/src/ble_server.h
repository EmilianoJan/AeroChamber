#pragma once

#include <functional>
#include <vector>

#include <NimBLEDevice.h>

#include "device_protocol.h"

class BleServer {
  public:
    using FrameHandler = std::function<void(const uint8_t *data, size_t len)>;

    void begin();
    void loop();
    void setFrameHandler(FrameHandler handler);

    void notifyResponseJson(const std::string &json);
    void notifyStatusJson(const std::string &json);

    bool isConnected() const;
    uint16_t attMtu() const;
    const std::string &deviceName() const;

  private:
    class ServerCallbacks;
    class CommandCallbacks;

    void handleCommandWrite(NimBLECharacteristic *characteristic);
    void notifyOnCharacteristic(NimBLECharacteristic *target, const std::string &json);

    NimBLEServer *server_ = nullptr;
    NimBLEService *service_ = nullptr;
    NimBLECharacteristic *commandChar_ = nullptr;
    NimBLECharacteristic *responseChar_ = nullptr;
    NimBLECharacteristic *statusChar_ = nullptr;

    bool connected_ = false;
    uint16_t attMtu_ = 23;
    std::string deviceName_ = protocol::kDeviceName;
    FrameHandler frameHandler_;

    struct FrameBytes {
        std::vector<uint8_t> bytes;
    };

    QueueHandle_t frameQueue_ = nullptr;
};
