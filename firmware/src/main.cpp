#include <Arduino.h>

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
  webServer.update(bmp280Manager);
  commsManager.update();
  delay(1);
}
