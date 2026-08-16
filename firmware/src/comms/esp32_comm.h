#pragma once

#include <Arduino.h>

namespace aerochamber {

class Esp32CommManager {
 public:
  void begin();
  void update();

 private:
  bool wifiStarted_ = false;
  bool bluetoothStarted_ = false;
};

}  // namespace aerochamber
