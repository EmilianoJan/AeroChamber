#include "comms/esp32_comm.h"

#include <BluetoothSerial.h>
#include <WiFi.h>

#include "config.h"

namespace aerochamber {

void Esp32CommManager::begin() {
  WiFi.mode(WIFI_AP);
  wifiStarted_ = WiFi.softAP(kWifiSsid, kWifiPassword);

  if (wifiStarted_) {
    Serial.print("Wi-Fi AP started. SSID: ");
    Serial.println(kWifiSsid);
    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.println("Failed to start Wi-Fi AP.");
  }

  // TODO: configure AP or station mode depending on the desired mobile UX.
  Serial.println("Wi-Fi + Bluetooth communication manager initialized.");
}

void Esp32CommManager::update() {
  if (!wifiStarted_) {
    wifiStarted_ = WiFi.softAP(kWifiSsid, kWifiPassword);
    if (wifiStarted_) {
      Serial.print("Wi-Fi AP restarted. AP IP: ");
      Serial.println(WiFi.softAPIP());
    }
  }

  if (!bluetoothStarted_) {
    // TODO: integrate a proper Bluetooth serial or BLE service.
    Serial.println("Bluetooth ready to be configured.");
    bluetoothStarted_ = true;
  }
}

}  // namespace aerochamber
