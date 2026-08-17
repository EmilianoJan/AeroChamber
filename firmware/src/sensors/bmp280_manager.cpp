#include "sensors/bmp280_manager.h"

#include "config.h"

#include <Adafruit_BMP280.h>

namespace aerochamber {

void Bmp280Manager::begin() {
  sensorSamples_.clear();
  sensorSamples_.resize(kBmp280SensorCount);

  for (size_t i = 0; i < sensorSamples_.size(); ++i) {
    sensorSamples_[i].sensorId = static_cast<uint8_t>(i + 1);
  }

  Serial.println("BMP280 manager initialized. Add sensor discovery and per-device I2C setup here.");
}

void Bmp280Manager::update() {
  for (auto& sample : sensorSamples_) {
    sample.valid = false;
    sample.temperatureC = 0.0f;
    sample.pressurePa = 0.0f;
    sample.altitudeM = 0.0f;
  }

  // TODO: Use a sensor array or one sensor per I2C address.
  // This placeholder keeps the data model ready for the real implementation.
  if (!sensorSamples_.empty()) {
    sensorSamples_[0].valid = true;
    sensorSamples_[0].temperatureC = 25.4f;
    sensorSamples_[0].pressurePa = 101325.0f;
    sensorSamples_[0].altitudeM = 0.0f;
  }
}

const std::vector<SensorSample>& Bmp280Manager::readings() const {
  return sensorSamples_;
}

size_t Bmp280Manager::count() const {
  return sensorSamples_.size();
}

}  // namespace aerochamber
