#pragma once

#include <Arduino.h>

namespace aerochamber {

constexpr uint8_t kBmp280SensorCount = 2;
constexpr uint8_t kBmp280BaseAddress = 0x76;
constexpr uint8_t kWebServerPort = 80;
constexpr uint32_t kSensorReadIntervalMs = 20;
constexpr uint32_t kWebRefreshIntervalMs = 1000;

constexpr char kWifiSsid[] = "VALVULIX";
constexpr char kWifiPassword[] = "valvulix";
constexpr char kBluetoothName[] = "valvulix";

}  // namespace aerochamber
