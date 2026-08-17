#include "device_state.h"

DeviceState::DeviceState() {
    snapshot_.appState = AppState::Idle;
    snapshot_.bleConnected = false;
    snapshot_.temperature = 24.5f;  // Simulated value until sensor integration is added.
    snapshot_.battery = 87;         // Simulated value for prototype.
    snapshot_.frequency = 1000;
}

void DeviceState::setBleConnected(bool connected) {
    snapshot_.bleConnected = connected;
}

void DeviceState::start() {
    snapshot_.appState = AppState::Running;
}

void DeviceState::stop() {
    snapshot_.appState = AppState::Idle;
}

bool DeviceState::setFrequency(uint32_t frequency) {
    if (frequency < 1 || frequency > 5000) {
        return false;
    }
    snapshot_.frequency = frequency;
    return true;
}

DeviceSnapshot DeviceState::snapshot() const {
    return snapshot_;
}

const char *DeviceState::toString(AppState state) {
    switch (state) {
        case AppState::Idle:
            return "idle";
        case AppState::Running:
            return "running";
        case AppState::Error:
            return "error";
        default:
            return "error";
    }
}
