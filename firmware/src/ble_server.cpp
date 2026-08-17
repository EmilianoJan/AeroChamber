#include "ble_server.h"

#include <Arduino.h>

#include <memory>

class BleServer::ServerCallbacks : public NimBLEServerCallbacks {
  public:
    explicit ServerCallbacks(BleServer &owner) : owner_(owner) {}

    void onConnect(NimBLEServer *server, NimBLEConnInfo &connInfo) override {
        (void)server;
        owner_.attMtu_ = connInfo.getMTU();
        owner_.connected_ = true;
        Serial.println("[BLE] CONNECTED");
    }

    void onDisconnect(NimBLEServer *server, NimBLEConnInfo &connInfo, int reason) override {
        (void)connInfo;
        (void)reason;
        owner_.connected_ = false;
        owner_.attMtu_ = 23;
        Serial.println("[BLE] DISCONNECTED");
        server->startAdvertising();
        Serial.println("[BLE] Advertising restarted");
    }

    void onMTUChange(uint16_t mtu, NimBLEConnInfo &connInfo) override {
        (void)connInfo;
        owner_.attMtu_ = mtu;
        Serial.printf("[BLE] MTU updated: %u\n", static_cast<unsigned>(mtu));
    }

  private:
    BleServer &owner_;
};

class BleServer::CommandCallbacks : public NimBLECharacteristicCallbacks {
  public:
    explicit CommandCallbacks(BleServer &owner) : owner_(owner) {}

        void onWrite(NimBLECharacteristic *characteristic, NimBLEConnInfo &connInfo) override {
                (void)connInfo;
        owner_.handleCommandWrite(characteristic);
    }

  private:
    BleServer &owner_;
};

void BleServer::begin() {
    Serial.println("[BLE] Initializing");

    frameQueue_ = xQueueCreate(8, sizeof(FrameBytes *));

    NimBLEDevice::init(deviceName_);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

    server_ = NimBLEDevice::createServer();
    server_->setCallbacks(new ServerCallbacks(*this));

    service_ = server_->createService(protocol::kServiceUuid);

    commandChar_ = service_->createCharacteristic(protocol::kCommandUuid,
                                                  NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);

    responseChar_ = service_->createCharacteristic(protocol::kResponseUuid,
                                                   NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

    statusChar_ = service_->createCharacteristic(protocol::kStatusUuid,
                                                 NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);

    commandChar_->setCallbacks(new CommandCallbacks(*this));

    NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
    advertising->addServiceUUID(protocol::kServiceUuid);
    advertising->enableScanResponse(true);
    advertising->start();
    Serial.println("[BLE] Advertising started");
}

void BleServer::setFrameHandler(FrameHandler handler) {
    frameHandler_ = std::move(handler);
}

void BleServer::handleCommandWrite(NimBLECharacteristic *characteristic) {
    std::string value = characteristic->getValue();
    if (value.empty() || value.size() > protocol::kMaxAppMessageSize) {
        Serial.println("[BLE] Ignored malformed frame length");
        return;
    }

    auto *frame = new FrameBytes();
    frame->bytes.assign(value.begin(), value.end());

    if (xQueueSend(frameQueue_, &frame, 0) != pdTRUE) {
        delete frame;
        Serial.println("[BLE] RX queue full; dropping frame");
    }
}

void BleServer::loop() {
    if (frameQueue_ == nullptr || frameHandler_ == nullptr) {
        return;
    }

    FrameBytes *frame = nullptr;
    while (xQueueReceive(frameQueue_, &frame, 0) == pdTRUE) {
        if (frame != nullptr && !frame->bytes.empty()) {
            frameHandler_(frame->bytes.data(), frame->bytes.size());
        }
        delete frame;
    }
}

void BleServer::notifyOnCharacteristic(NimBLECharacteristic *target, const std::string &json) {
    if (target == nullptr || !connected_ || json.empty()) {
        return;
    }

    const uint16_t messageId = static_cast<uint16_t>(millis() & 0xFFFFU);
    auto frames = protocol::fragmentMessage(json, messageId, attMtu_);

    for (const auto &frame : frames) {
        target->setValue(frame.data(), frame.size());
        target->notify();
    }
}

void BleServer::notifyResponseJson(const std::string &json) {
    notifyOnCharacteristic(responseChar_, json);
}

void BleServer::notifyStatusJson(const std::string &json) {
    notifyOnCharacteristic(statusChar_, json);
}

bool BleServer::isConnected() const {
    return connected_;
}

uint16_t BleServer::attMtu() const {
    return attMtu_;
}

const std::string &BleServer::deviceName() const {
    return deviceName_;
}
