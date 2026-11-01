#pragma once

#include <Arduino.h>
#include <Adafruit_BMP280.h>
#include <array>
#include <vector>

#include "config.h"

namespace aerochamber {

struct SensorSample {
  uint8_t sensorId = 0;
  float temperatureC = 0.0f;
  float pressurePa = 0.0f;
  float altitudeM = 0.0f;
  bool valid = false;
};

struct SensorRecord {
  uint32_t sampleNumber = 0;
  uint32_t timestampMs = 0;
  std::array<SensorSample, kBmp280SensorCount> sensors;
};

class Bmp280Manager {
 public:
  static constexpr size_t kHistoryCapacity = 100;

  void begin();
  size_t snapshotHistory(std::array<SensorRecord, kHistoryCapacity>& destination) const;

 private:
  static void acquisitionTask(void* parameter);
  void acquireSample();

  std::vector<Adafruit_BMP280> sensors_;
  std::vector<bool> sensorInitialized_;
  std::array<SensorRecord, kHistoryCapacity> history_;
  size_t nextHistoryIndex_ = 0;
  size_t historyCount_ = 0;
  uint32_t nextSampleNumber_ = 1;
  mutable portMUX_TYPE historyMux_ = portMUX_INITIALIZER_UNLOCKED;
};

}  // namespace aerochamber
