# AeroChamber Firmware

Firmware for the ESP32 that reads two BMP280 sensors and serves a mobile-friendly, offline-capable measurement page over its local Wi-Fi access point.

## Structure

```text
firmware/
├── data/                  # assets served by the ESP32 (HTML, CSS, JS)
├── include/               # global definitions and configuration
├── src/
│   ├── comms/             # Wi‑Fi / Bluetooth / network control
│   ├── sensors/           # BMP280 sensor read and aggregation logic
│   ├── web/               # HTTP server and web page
│   ├── config.h           # firmware configuration
│   ├── main.cpp           # entry point
│   └── app.cpp            # system orchestration
├── platformio.ini         # PlatformIO project configuration
└── README.md
```

## Responsibilities

- Read two BMP280 sensors over I2C (addresses `0x76` and `0x77`).
- Serve the web interface and sensor API from LittleFS on the ESP32.
- Update pressure plots from each new sensor sample without reloading the page.
- Set a differential zero from the current `sensor 1 - sensor 2` reading and apply an additional offset in Pa.
- Record lapses, compare runs, and export pressure/lapse data as CSV or plots as PNG. Lapse data and calibration are stored in the browser on that device.
- Keep all application assets local; no internet access or external chart library is required.

## Build and upload

Run these commands from the `firmware/` directory after connecting the ESP32:

```sh
pio run -t upload
pio run -t uploadfs
```

`upload` flashes the firmware; it does **not** upload the page. `uploadfs` builds and flashes the LittleFS image from `data/`, including `data/index.html`. Run `uploadfs` whenever web assets change. The page responds with HTTP 503 and a clear deployment hint if `/index.html` is missing. Connect to the `AESP32` access point, then open `http://192.168.4.1/` on the mobile device.

The live charts show every sample received during the current browser session. Stored lapses persist in that browser's local storage. Clearing browser storage removes saved runs and calibration.

## Conceptual flow

```text
BMP280 -> Sensor Manager -> Web API -> Browser
                              |          |
                              |          +--> Live charts / differential correction
                              |          +--> Locally stored lapses / CSV / PNG
                              +--> ESP32 access point
```
