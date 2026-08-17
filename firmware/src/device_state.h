#pragma once

#include <stdint.h>
#include <string>

enum class AppState {
    Idle,
    Running,
    Error,
};

struct DeviceSnapshot {
    AppState appState;
    bool bleConnected;
    float temperature;
    uint8_t battery;
    uint32_t frequency;
};

class DeviceState {
  public:
    DeviceState();

    void setBleConnected(bool connected);
    void start();
    void stop();
    bool setFrequency(uint32_t frequency);

    DeviceSnapshot snapshot() const;

    static const char *toString(AppState state);

  private:
    DeviceSnapshot snapshot_;
};
