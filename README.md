# AeroChamber BLE Control Interface

This repository contains hardware, electronics, firmware, and web software for AeroChamber validation tools.

This implementation uses:

- ESP32 firmware with PlatformIO + Arduino + NimBLE-Arduino.
- Browser UI with React + TypeScript + Vite.
- BLE GATT via Web Bluetooth between browser and ESP32.

No Wi-Fi communication is used between phone and ESP32.

## Repository structure

```text
AeroChamber/
├── firmware/
│   ├── platformio.ini
│   ├── README.md
│   ├── include/
│   │   └── README
│   ├── lib/
│   │   └── README
│   ├── src/
│   │   ├── main.cpp
│   │   ├── ble_server.cpp
│   │   ├── ble_server.h
│   │   ├── device_protocol.cpp
│   │   ├── device_protocol.h
│   │   ├── device_state.cpp
│   │   └── device_state.h
│   └── test/
│       └── README.md
├── web/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles.css
│       ├── bluetooth/
│       │   ├── BleClient.ts
│       │   ├── bleTypes.ts
│       │   └── protocol.ts
│       ├── components/
│       │   ├── ConnectionPanel.tsx
│       │   ├── DeviceStatus.tsx
│       │   ├── DeviceControls.tsx
│       │   └── LogPanel.tsx
│       ├── hooks/
│       │   └── useBluetooth.ts
│       └── test/
│           └── protocol.test.ts
├── protocol.md
├── electronics/
├── hardware/
├── software/
├── LICENSE
└── README.md
```

## ESP32 board and firmware stack

- Board target: `esp32dev`.
- Build system: PlatformIO only.
- Framework: Arduino.
- BLE stack: NimBLE-Arduino.

The selected board was inferred from the existing project configuration.

## BLE architecture

Communication path:

```text
Phone Browser <-> Web Bluetooth <-> BLE GATT <-> ESP32
```

The ESP32 does not connect to access-point Wi-Fi, does not create SoftAP, and does not host HTTP.

BLE UUIDs are documented in [protocol.md](protocol.md).

## Protocol summary

- Application messages are JSON UTF-8.
- Every command includes a unique numeric `id`.
- Firmware returns the same `id` in the response.
- Transport uses binary BLE framing with fragmentation/reassembly for larger messages.
- Maximum application payload: 512 bytes.

Implemented commands:

- `GET_STATUS`
- `GET_DEVICE_INFO`
- `START`
- `STOP`
- `SET_PARAMETER` (`frequency`, range 1..5000)

## Development workflow

### Firmware

```bash
cd firmware
pio run
pio run --target upload
pio device monitor
```

Optional utilities:

```bash
pio device list
pio run --target clean
```

### Web frontend

```bash
cd web
npm install
npm run dev
```

Build and tests:

```bash
npm run build
npm test
```

## Phone access during development

The Vite dev server can be accessed from a phone on the local network for UI delivery.
This is only for serving the web app; BLE communication remains direct browser-to-ESP32.

## Production architecture

```text
Internet -> HTTPS host serving React app -> Phone browser -> Web Bluetooth -> ESP32 BLE GATT
```

The ESP32 does not require Internet connectivity.

## Browser compatibility

- Android + Chrome: supported in secure contexts.
- Desktop Chrome/Edge: supported in secure contexts.
- Firefox: Web Bluetooth not generally available.
- iOS + Safari: Web Bluetooth support is limited/absent depending on Safari and iOS versions; verify on target devices.

Web Bluetooth generally requires HTTPS. `localhost` is allowed for development on supported browsers.

## Security notes

Current implementation validates:

- message length and framing
- JSON format
- command names
- request IDs
- parameter names
- parameter ranges and types

This is a prototype-level validation layer. BLE pairing/bonding and application authentication are separate concerns.

## Logging and diagnostics

- Firmware logs over serial monitor at 115200 baud.
- Frontend includes an in-app log panel for selection, connection, TX, and RX events.

## Verification status

- Verified by build/tests: PlatformIO firmware compilation, frontend TypeScript build, frontend protocol unit tests.
- Requires hardware validation: end-to-end BLE behavior with a physical ESP32 and a supported mobile browser.
