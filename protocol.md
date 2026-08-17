# AeroChamber BLE Protocol

## UUIDs

- Service: `12345678-1234-5678-1234-56789abcdef0`
- Command characteristic (WRITE, WRITE WITHOUT RESPONSE): `12345678-1234-5678-1234-56789abcdef1`
- Response characteristic (READ, NOTIFY): `12345678-1234-5678-1234-56789abcdef2`
- Status characteristic (READ, NOTIFY): `12345678-1234-5678-1234-56789abcdef3`

These UUIDs are used by both firmware and frontend.

## Application JSON

All commands require a unique `id`.

Example command:

```json
{
  "id": 42,
  "command": "GET_STATUS"
}
```

Example response:

```json
{
  "id": 42,
  "success": true,
  "data": {
    "state": "idle",
    "temperature": 24.5,
    "battery": 87,
    "frequency": 1000
  }
}
```

### Commands

- `GET_STATUS`
- `GET_DEVICE_INFO`
- `START`
- `STOP`
- `SET_PARAMETER` with `parameter = "frequency"` and integer `value` in range `[1, 5000]`

## BLE Framing and Fragmentation

JSON is transported with a binary frame header to support BLE packet limits.

Frame format (`8-byte header + payload`):

- Byte 0: `version` (`1`)
- Byte 1: `flags` bitmask
  - bit 0: start of message
  - bit 1: end of message
- Byte 2-3: `message_id` (big-endian u16)
- Byte 4-5: `total_length` of full JSON message (big-endian u16)
- Byte 6-7: `offset` of this payload in the full message (big-endian u16)
- Byte 8..N: payload bytes

### MTU assumptions

- ATT MTU default is 23 bytes.
- ATT payload default is `20` bytes (`MTU - 3`).
- Effective fragment payload is `ATT payload - 8 header bytes`.
- Implementation works with default MTU and scales if MTU increases.

### Limits and ordering

- Maximum application message size: 512 bytes.
- Frames must arrive in order with exact offset progression.
- Reassembly timeout: 3000 ms.
- Malformed/out-of-order/oversized data is rejected.

## Error handling

The firmware validates:

- message length
- frame structure and offsets
- JSON validity
- command name
- request ID
- parameter name
- parameter type and range

Invalid input returns error responses whenever request correlation is possible.

## Security note

BLE transport security (pairing/bonding) and application authorization are separate concerns.
This prototype validates command structure and ranges but is not a complete security model.
