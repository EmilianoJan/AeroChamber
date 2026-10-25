#include "sensors/bmp280_manager.h"

#include "config.h"

#include <Adafruit_BMP280.h>

namespace aerochamber {

void Bmp280Manager::begin() {
  sensorSamples_.clear();
  sensorSamples_.resize(kBmp280SensorCount);
  sensors_.clear();
  sensors_.resize(kBmp280SensorCount);
  sensorInitialized_.assign(kBmp280SensorCount, false);

  for (size_t i = 0; i < sensorSamples_.size(); ++i) {
    sensorSamples_[i].sensorId = static_cast<uint8_t>(i + 1);
  }

  for (size_t i = 0; i < sensors_.size(); ++i) {
    const uint8_t address = kBmp280BaseAddress + i;
    sensorInitialized_[i] = sensors_[i].begin(address);
    if (sensorInitialized_[i]) {
      Serial.printf("BMP280 sensor %u initialized on I2C address 0x%02X\n",
                    static_cast<unsigned>(i + 1), address);
    } else {
      Serial.printf("BMP280 sensor %u initialization failed. Check wiring and I2C address.\n",
                    static_cast<unsigned>(i + 1));
    }
  }
}

void Bmp280Manager::update() {
  for (auto& sample : sensorSamples_) {
    sample.valid = false;
    sample.temperatureC = 0.0f;
    sample.pressurePa = 0.0f;
    sample.altitudeM = 0.0f;
  }

  for (size_t i = 0; i < sensorSamples_.size(); ++i) {
    if (i >= sensors_.size() || i >= sensorInitialized_.size() || !sensorInitialized_[i]) {
      continue;
    }

    auto& sample = sensorSamples_[i];
    sample.temperatureC = sensors_[i].readTemperature();
    sample.pressurePa = sensors_[i].readPressure();
    sample.altitudeM = sensors_[i].readAltitude(101325.0f);
    sample.valid = std::isfinite(sample.temperatureC) &&
                   std::isfinite(sample.pressurePa) &&
                   std::isfinite(sample.altitudeM);

    if (!sample.valid) {
      sample.temperatureC = 0.0f;
      sample.pressurePa = 0.0f;
      sample.altitudeM = 0.0f;
    }
  }
}

const std::vector<SensorSample>& Bmp280Manager::readings() const {
  return sensorSamples_;
}

size_t Bmp280Manager::count() const {
  return sensorSamples_.size();
}

}  // namespace aerochamber
