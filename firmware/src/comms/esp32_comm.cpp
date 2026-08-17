#include "comms/esp32_comm.h"

#include <BluetoothSerial.h>
#include <WiFi.h>

#include "config.h"

namespace aerochamber {

void Esp32CommManager::begin() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  // TODO: configure AP or station mode depending on the desired mobile UX.
  Serial.println("Wi‑Fi + Bluetooth communication manager initialized.");
}

void Esp32CommManager::update() {
  if (!wifiStarted_) {
    WiFi.begin(kWifiSsid, kWifiPassword);
    wifiStarted_ = true;
    Serial.println("Starting Wi‑Fi connection...");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi‑Fi connected: ");
    Serial.println(WiFi.localIP());
  }

  if (!bluetoothStarted_) {
    // TODO: integrate a proper Bluetooth serial or BLE service.
    Serial.println("Bluetooth ready to be configured.");
    bluetoothStarted_ = true;
  }
}

}  // namespace aerochamber
