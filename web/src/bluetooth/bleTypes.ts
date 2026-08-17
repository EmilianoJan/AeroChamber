export type ConnectionStatus =
  | "unsupported"
  | "disconnected"
  | "connecting"
  | "connected";

export interface DeviceStatusPayload {
  state: string;
  temperature: number;
  battery: number;
  frequency: number;
  bleConnected?: boolean;
}

export interface DeviceInfoPayload {
  device: string;
  firmware: string;
  protocol: string;
}

export interface CommandRequest {
  id: number;
  command: "GET_STATUS" | "GET_DEVICE_INFO" | "START" | "STOP" | "SET_PARAMETER";
  parameter?: "frequency";
  value?: number;
}

export interface CommandResponse {
  id: number;
  success: boolean;
  error?: string;
  data?: Partial<DeviceStatusPayload & DeviceInfoPayload>;
}

export interface LogEntry {
  timestamp: string;
  message: string;
}
