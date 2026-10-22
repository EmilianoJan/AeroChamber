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

## Web dashboard (offline)

The dashboard is served from LittleFS (`data/`). It needs no internet access: all libraries are bundled under `data/lib/`.

- **Monitor**: absolute pressures for sensors 1 and 2, a software tare (zero) that uses sensor 2 as reference, and a constant to add to the corrected difference. Raw and difference plots support zoom, PNG, CSV and "add to report".
- **Lapsos**: records the corrected difference of sensor 1 from the moment "Nuevo lapso" is pressed. Lapses can be compared with distinct colours or with faded historical series.
- **Informe**: free-text report with plots snapshots, exported as PDF or Word (.docx).

Notes:
- Tare, constant, lapses and report are stored in the browser (`localStorage`) of the device that uses the page.
- Native share needs HTTPS. Over the ESP32's plain HTTP the share buttons fall back to a file download.

### Uploading the web assets

After changing anything in `data/`, upload the filesystem before flashing or reloading:

```bash
pio run -t uploadfs
```

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
