import type { DeviceInfoPayload, DeviceStatusPayload } from "../bluetooth/bleTypes";

type Props = {
  connectionStatus: string;
  deviceName: string;
  status: DeviceStatusPayload;
  info: DeviceInfoPayload;
};

export function DeviceStatus({ connectionStatus, deviceName, status, info }: Props) {
  return (
    <section className="panel">
      <h2>Device Status</h2>
      <ul className="stats">
        <li>Connection status: {connectionStatus}</li>
        <li>Device name: {deviceName}</li>
        <li>Firmware version: {info.firmware}</li>
        <li>Protocol version: {info.protocol}</li>
        <li>Device state: {status.state}</li>
        <li>Temperature: {status.temperature.toFixed(1)} C</li>
        <li>Battery: {status.battery}%</li>
        <li>Frequency: {status.frequency} Hz</li>
      </ul>
    </section>
  );
}
