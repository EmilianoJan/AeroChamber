#pragma once

#include <Arduino.h>
#include <WebServer.h>

#include "sensors/bmp280_manager.h"

namespace aerochamber {

class WebServerManager {
 public:
  void begin();
  void update(const Bmp280Manager& sensorManager);

 private:
  WebServer server_{80};
  const Bmp280Manager* sensorManager_ = nullptr;
  void handleRoot();
  void handleApi();
};

}  // namespace aerochamber
