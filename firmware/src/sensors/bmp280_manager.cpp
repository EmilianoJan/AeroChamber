#include "sensors/bmp280_manager.h"

#include "config.h"

#include <Adafruit_BMP280.h>

namespace aerochamber {

void Bmp280Manager::begin() {
  sensors_.clear();
  sensors_.resize(kBmp280SensorCount);
  sensorInitialized_.assign(kBmp280SensorCount, false);

  for (size_t i = 0; i < sensors_.size(); ++i) {
    const uint8_t address = kBmp280BaseAddress + i;
    sensorInitialized_[i] = sensors_[i].begin(address);
    if (sensorInitialized_[i]) {
      sensors_[i].setSampling(Adafruit_BMP280::MODE_NORMAL,
                              Adafruit_BMP280::SAMPLING_X1,
                              Adafruit_BMP280::SAMPLING_X1,
                              Adafruit_BMP280::FILTER_OFF,
                              Adafruit_BMP280::STANDBY_MS_1);
      Serial.printf("BMP280 sensor %u initialized on I2C address 0x%02X\n",
                    static_cast<unsigned>(i + 1), address);
    } else {
      Serial.printf("BMP280 sensor %u initialization failed. Check wiring and I2C address.\n",
                    static_cast<unsigned>(i + 1));
    }
  }

  const BaseType_t taskCreated = xTaskCreatePinnedToCore(
      acquisitionTask, "bmp280-acquisition", 4096, this, 1, nullptr, 1);
  if (taskCreated != pdPASS) {
    Serial.println("BMP280 acquisition task creation failed.");
  }
}

void Bmp280Manager::acquisitionTask(void* parameter) {
  auto* manager = static_cast<Bmp280Manager*>(parameter);
  TickType_t lastWakeTime = xTaskGetTickCount();
  const TickType_t intervalTicks = pdMS_TO_TICKS(kSensorReadIntervalMs);

  for (;;) {
    manager->acquireSample();
    vTaskDelayUntil(&lastWakeTime, intervalTicks);
  }
}

void Bmp280Manager::acquireSample() {
  SensorRecord record;
  record.sampleNumber = nextSampleNumber_++;
  record.timestampMs = millis();

  for (size_t i = 0; i < record.sensors.size(); ++i) {
    auto& sample = record.sensors[i];
    sample.sensorId = static_cast<uint8_t>(i + 1);
    if (i >= sensors_.size() || i >= sensorInitialized_.size() || !sensorInitialized_[i]) {
      continue;
    }

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

  portENTER_CRITICAL(&historyMux_);
  history_[nextHistoryIndex_] = record;
  nextHistoryIndex_ = (nextHistoryIndex_ + 1) % history_.size();
  if (historyCount_ < history_.size()) {
    ++historyCount_;
  }
  portEXIT_CRITICAL(&historyMux_);
}

size_t Bmp280Manager::snapshotHistory(
    std::array<SensorRecord, kHistoryCapacity>& destination) const {
  portENTER_CRITICAL(&historyMux_);
  const size_t count = historyCount_;
  const size_t firstIndex =
      (nextHistoryIndex_ + history_.size() - historyCount_) % history_.size();
  for (size_t i = 0; i < count; ++i) {
    destination[i] = history_[(firstIndex + i) % history_.size()];
  }
  portEXIT_CRITICAL(&historyMux_);
  return count;
}

}  // namespace aerochamber
