import { useCallback, useMemo, useState } from "react";

import { BleClient } from "../bluetooth/BleClient";
import type {
  CommandResponse,
  ConnectionStatus,
  DeviceInfoPayload,
  DeviceStatusPayload,
  LogEntry,
} from "../bluetooth/bleTypes";

const defaultStatus: DeviceStatusPayload = {
  state: "idle",
  temperature: 24.5,
  battery: 87,
  frequency: 1000,
};

const defaultInfo: DeviceInfoPayload = {
  device: "ESP32-BLE-DEVICE",
  firmware: "0.1.0",
  protocol: "1.0",
};

function nowStamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

export function useBluetooth() {
  const [status, setStatus] = useState<ConnectionStatus>(
    navigator.bluetooth ? "disconnected" : "unsupported",
  );
  const [deviceName, setDeviceName] = useState<string>("-");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusPayload>(defaultStatus);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoPayload>(defaultInfo);
  const [error, setError] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const ble = useMemo(() => new BleClient(), []);

  const appendLog = useCallback((message: string) => {
    setLogs((prev) => [{ timestamp: nowStamp(), message }, ...prev].slice(0, 250));
  }, []);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Bluetooth unsupported in this browser.");
      return;
    }

    setStatus("connecting");
    setError("");

    try {
      appendLog("Bluetooth device selection opened");
      await ble.connect();
      setStatus("connected");
      setDeviceName(ble.getDeviceName());
      appendLog("Connected");
      appendLog("GATT services discovered");

      ble.onStatus((incoming) => {
        setDeviceStatus(incoming);
        appendLog("RX STATUS notification");
      });

      ble.onDisconnected(async () => {
        setStatus("disconnected");
        appendLog("Disconnected");

        const recovered = await ble.reconnect();
        if (recovered) {
          setStatus("connected");
          appendLog("Reconnected using existing granted device");
        } else {
          appendLog("Auto-reconnect unavailable; user action required");
        }
      });
    } catch (e) {
      setStatus("disconnected");
      const msg = e instanceof Error ? e.message : "Connection failed";
      setError(msg);
      appendLog(`Connection error: ${msg}`);
    }
  }, [appendLog, ble]);

  const disconnect = useCallback(async () => {
    await ble.disconnect();
    setStatus("disconnected");
    appendLog("Disconnected by user");
  }, [appendLog, ble]);

  const send = useCallback(
    async (
      command: "GET_STATUS" | "GET_DEVICE_INFO" | "START" | "STOP" | "SET_PARAMETER",
      payload?: { parameter?: "frequency"; value?: number },
    ) => {
      setError("");
      appendLog(`TX ${command}`);

      try {
        const response = await ble.sendCommand({
          command,
          parameter: payload?.parameter,
          value: payload?.value,
        });

        appendLog(`RX ${command}`);
        if (!response.success) {
          const msg = response.error ?? "Command failed";
          setError(msg);
          return response;
        }

        applyResponse(response);
        return response;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Command failed";
        setError(msg);
        appendLog(`Command error: ${msg}`);
        return null;
      }
    },
    [appendLog, ble],
  );

  const applyResponse = (response: CommandResponse) => {
    if (!response.data) {
      return;
    }

    setDeviceStatus((prev) => ({
      state: response.data?.state ?? prev.state,
      temperature: response.data?.temperature ?? prev.temperature,
      battery: response.data?.battery ?? prev.battery,
      frequency: response.data?.frequency ?? prev.frequency,
      bleConnected: response.data?.bleConnected ?? prev.bleConnected,
    }));

    setDeviceInfo((prev) => ({
      device: response.data?.device ?? prev.device,
      firmware: response.data?.firmware ?? prev.firmware,
      protocol: response.data?.protocol ?? prev.protocol,
    }));
  };

  return {
    status,
    deviceName,
    deviceStatus,
    deviceInfo,
    logs,
    error,
    connect,
    disconnect,
    send,
  };
}
