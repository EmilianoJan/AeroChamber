#include <Arduino.h>

#include "config.h"
#include "comms/esp32_comm.h"
#include "sensors/bmp280_manager.h"
#include "web/web_server.h"

using namespace aerochamber;

Bmp280Manager bmp280Manager;
Esp32CommManager commsManager;
WebServerManager webServer;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("AeroChamber firmware starting...");

  bmp280Manager.begin();
  commsManager.begin();
  webServer.begin();
}

void loop() {
  bmp280Manager.update();
  webServer.update(bmp280Manager.readings());
  commsManager.update();

  delay(100);
}
