# Firmware (PlatformIO + Arduino + NimBLE)

ESP32 BLE GATT firmware for browser-to-device communication over Web Bluetooth.

## Board assumption

The repository previously used `board = esp32dev` in PlatformIO, so this firmware keeps that board target.

## Architecture

- `main.cpp`: startup, command processing orchestration, periodic status notification.
- `ble_server.*`: NimBLE GATT server, characteristics, advertising lifecycle, RX queue dispatch.
- `device_protocol.*`: JSON protocol, request validation, and BLE framing fragmentation/reassembly.
- `device_state.*`: application state and simulated telemetry values.

## BLE-only communication

This firmware does not initialize Wi-Fi, does not start HTTP, and does not create SoftAP.

## Build and flash

```bash
cd firmware
pio run
pio run --target upload
pio device monitor
```

Optional device discovery:

```bash
pio device list
```

## Logs

Serial monitor is configured at 115200 baud.
