#include "web/web_server.h"

#include <ArduinoJson.h>
#include <LittleFS.h>

#include "config.h"

namespace aerochamber {

void WebServerManager::begin() {
  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS mount failed. Web assets will not load.");
  }

  server_.on("/", [this]() { handleRoot(); });
  server_.on("/api/sensors", [this]() { handleApi(); });
  server_.begin();

  Serial.println("Web server started on port 80");
}

void WebServerManager::update(const Bmp280Manager& sensorManager) {
  sensorManager_ = &sensorManager;
  server_.handleClient();
}

void WebServerManager::handleRoot() {
  File file = LittleFS.open("/index.html", "r");
  if (file) {
    server_.streamFile(file, "text/html");
    file.close();
    return;
  }

  server_.send(200, "text/plain", "AeroChamber web UI not found. Add /data/index.html");
}

void WebServerManager::handleApi() {
  JsonDocument json;
  JsonArray samples = json["samples"].to<JsonArray>();

  if (sensorManager_ != nullptr) {
    std::array<SensorRecord, Bmp280Manager::kHistoryCapacity> history;
    const size_t count = sensorManager_->snapshotHistory(history);
    for (size_t i = 0; i < count; ++i) {
      const auto& record = history[i];
      JsonObject item = samples.add<JsonObject>();
      item["sampleNumber"] = record.sampleNumber;
      item["timestampMs"] = record.timestampMs;
      item["pressure1Pa"] = record.sensors[0].pressurePa;
      item["temperature1C"] = record.sensors[0].temperatureC;
      item["pressure2Pa"] = record.sensors[1].pressurePa;
      item["temperature2C"] = record.sensors[1].temperatureC;
      item["valid1"] = record.sensors[0].valid;
      item["valid2"] = record.sensors[1].valid;
    }
  }

  String response;
  serializeJson(json, response);
  server_.send(200, "application/json", response);
}

}  // namespace aerochamber
