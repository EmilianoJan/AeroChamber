#include "sensors/bmp280_manager.h"

#include "config.h"

#include <Adafruit_BMP280.h>

namespace aerochamber {

void Bmp280Manager::begin() {
  sensorSamples_.clear();
  sensorSamples_.resize(kBmp280SensorCount);
  sensors_.clear();
  sensors_.resize(kBmp280SensorCount);
  sensorInitialized_ = false;

  for (size_t i = 0; i < sensorSamples_.size(); ++i) {
    sensorSamples_[i].sensorId = static_cast<uint8_t>(i + 1);
  }

  if (!sensors_.empty()) {
    sensorInitialized_ = sensors_[0].begin(kBmp280BaseAddress);
    if (sensorInitialized_) {
      Serial.printf("BMP280 initialized on I2C address 0x%02X\n", kBmp280BaseAddress);
    } else {
      Serial.println("BMP280 initialization failed. Check wiring and I2C address.");
    }

    sensorInitialized_ = sensors_[1].begin(kBmp280BaseAddress + 1);
    if (sensorInitialized_) {
      Serial.printf("BMP280 initialized on I2C address 0x%02X\n", (kBmp280BaseAddress+1));
    } else {
      Serial.println("BMP280 initialization failed. Check wiring and I2C address.");
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

  if (!sensorInitialized_ || sensors_.empty()) {
    return;
  }

  sensorSamples_[0].valid = true;
  sensorSamples_[0].temperatureC = sensors_[0].readTemperature();
  sensorSamples_[0].pressurePa = sensors_[0].readPressure();
  sensorSamples_[0].altitudeM = sensors_[0].readAltitude(101325.0f);

  if (!std::isfinite(sensorSamples_[0].temperatureC) || !std::isfinite(sensorSamples_[0].pressurePa)) {
    sensorSamples_[0].valid = false;
    sensorSamples_[0].temperatureC = 0.0f;
    sensorSamples_[0].pressurePa = 0.0f;
    sensorSamples_[0].altitudeM = 0.0f;
  }

  sensorSamples_[1].valid = true;
  sensorSamples_[1].temperatureC = sensors_[1].readTemperature();
  sensorSamples_[1].pressurePa = sensors_[1].readPressure();
  sensorSamples_[1].altitudeM = sensors_[1].readAltitude(101325.0f);

  if (!std::isfinite(sensorSamples_[0].temperatureC) || !std::isfinite(sensorSamples_[1].pressurePa)) {
    sensorSamples_[1].valid = false;
    sensorSamples_[1].temperatureC = 0.0f;
    sensorSamples_[1].pressurePa = 0.0f;
    sensorSamples_[1].altitudeM = 0.0f;
  }
}

const std::vector<SensorSample>& Bmp280Manager::readings() const {
  return sensorSamples_;
}

size_t Bmp280Manager::count() const {
  return sensorSamples_.size();
}

}  // namespace aerochamber
