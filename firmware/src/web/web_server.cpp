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
  server_.onNotFound([this]() { handleStaticFile(); });
  server_.begin();

  Serial.println("Web server started on port 80");
}

void WebServerManager::update(const std::vector<SensorSample>& sensorSamples) {
  latestSensorSamples_ = sensorSamples;
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

void WebServerManager::handleStaticFile() {
  String path = server_.uri();
  if (path.endsWith("/")) {
    path += "index.html";
  }

  File file = LittleFS.open(path, "r");
  if (!file || file.isDirectory()) {
    if (file) {
      file.close();
    }
    server_.send(404, "text/plain", "Not found");
    return;
  }

  String contentType = "application/octet-stream";
  if (path.endsWith(".html")) {
    contentType = "text/html";
  } else if (path.endsWith(".js")) {
    contentType = "application/javascript";
  } else if (path.endsWith(".css")) {
    contentType = "text/css";
  } else if (path.endsWith(".json")) {
    contentType = "application/json";
  } else if (path.endsWith(".png")) {
    contentType = "image/png";
  } else if (path.endsWith(".svg")) {
    contentType = "image/svg+xml";
  }

  server_.streamFile(file, contentType);
  file.close();
}

void WebServerManager::handleApi() {
  DynamicJsonDocument json(1024);
  JsonArray sensors = json.createNestedArray("sensors");

  for (const auto& sample : latestSensorSamples_) {
    JsonObject item = sensors.add<JsonObject>();
    item["sensorId"] = sample.sensorId;
    item["temperatureC"] = sample.temperatureC;
    item["pressurePa"] = sample.pressurePa;
    item["altitudeM"] = sample.altitudeM;
    item["valid"] = sample.valid;
  }

  String response;
  serializeJson(json, response);
  server_.send(200, "application/json", response);
}

}  // namespace aerochamber
