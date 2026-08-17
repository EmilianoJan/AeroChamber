# AeroChamber Firmware

Base project for the ESP32 that centralizes BMP280 sensor reads, Wi‑Fi/Bluetooth connection management, and publication of data on a local web page.

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

- Read one or more BMP280 sensors over I2C.
- Expose an API or web page from the ESP32.
- Allow mobile access over Wi‑Fi or Bluetooth.
- Update values in the interface without reloading the page.

## Recommended next steps

1. Define the actual number of BMP280 sensors and their I2C addresses.
2. Define the Wi‑Fi network topology for the ESP32.
3. Implement the JSON API to send data to the browser.
4. Add a reconnect flow and error handling for sensors and network.

## Conceptual flow

```text
BMP280 -> Sensor Manager -> App State -> Web Server -> Browser
                                |
                                +--> Bluetooth / Wi‑Fi
```
