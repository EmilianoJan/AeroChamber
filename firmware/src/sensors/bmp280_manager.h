#pragma once

#include <Arduino.h>
#include <vector>

namespace aerochamber {

struct SensorSample {
  uint8_t sensorId = 0;
  float temperatureC = 0.0f;
  float pressurePa = 0.0f;
  float altitudeM = 0.0f;
  bool valid = false;
};

class Bmp280Manager {
 public:
  void begin();
  void update();
  const std::vector<SensorSample>& readings() const;
  size_t count() const;

 private:
  std::vector<SensorSample> sensorSamples_;
};

}  // namespace aerochamber
