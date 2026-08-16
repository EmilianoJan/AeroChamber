#pragma once

#include <Arduino.h>

namespace aerochamber {

constexpr uint8_t kBmp280SensorCount = 4;
constexpr uint8_t kBmp280BaseAddress = 0x76;
constexpr uint8_t kWebServerPort = 80;
constexpr uint32_t kSensorReadIntervalMs = 1000;
constexpr uint32_t kWebRefreshIntervalMs = 500;

constexpr char kWifiSsid[] = "AeroChamber-ESP32";
constexpr char kWifiPassword[] = "aerochamber123";
constexpr char kBluetoothName[] = "AeroChamber";

}  // namespace aerochamber
