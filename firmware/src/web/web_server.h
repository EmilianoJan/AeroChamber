#pragma once

#include <Arduino.h>
#include <WebServer.h>

#include <vector>

#include "sensors/bmp280_manager.h"

namespace aerochamber {

class WebServerManager {
 public:
  void begin();
  void update(const std::vector<SensorSample>& sensorSamples);

 private:
  WebServer server_{80};
  std::vector<SensorSample> latestSensorSamples_;
  void handleRoot();
  void handleApi();
};

}  // namespace aerochamber
