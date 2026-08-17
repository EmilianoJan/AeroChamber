# AeroChamber
This repository contains the electronics, mechanics and software to build an aerochamber valve tester. The main target of this setup is validate commercial available aerochambers for infants.

# Basic file structure

```text
AeroChamber/
├── firmware/
│   ├── data/
│   ├── include/
│   ├── src/
│   ├── platformio.ini
│   └── README.md
├── electronics/
├── hardware/
├── software/
├── LICENSE
└── README.md
```

## Firmware

The `firmware/` folder contains the ESP32 project and is organized around these responsibilities:

- Sensor acquisition: BMP280 reading, filtering, calibration, and aggregation.
- Communications: Wi‑Fi and Bluetooth management for mobile connectivity.
- Web interface: HTML/JS served by the ESP32 and refreshed with sensor data.
- Application orchestration: the main loop, state management, and data flow among layers.

This layout is the base for a PlatformIO project for an ESP32 with one or several BMP280 sensors.
