import type { CommandRequest, CommandResponse, DeviceStatusPayload } from "./bleTypes";
import {
  BLE_UUIDS,
  Reassembler,
  RequestIdGenerator,
  encodeCommand,
  fragmentMessage,
  parseCommandResponse,
  parseStatusPayload,
} from "./protocol";

type PendingRequest = {
  resolve: (res: CommandResponse) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export class BleClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private commandChar: BluetoothRemoteGATTCharacteristic | null = null;
  private responseChar: BluetoothRemoteGATTCharacteristic | null = null;
  private statusChar: BluetoothRemoteGATTCharacteristic | null = null;
  private pending = new Map<number, PendingRequest>();
  private responseReassembler = new Reassembler();
  private statusReassembler = new Reassembler();
  private requestIds = new RequestIdGenerator();
  private onStatusListeners: Array<(status: DeviceStatusPayload) => void> = [];
  private onDisconnectedListeners: Array<() => void> = [];

  async requestDevice(): Promise<BluetoothDevice> {
    if (!navigator.bluetooth) {
      throw new Error("Bluetooth unavailable in this browser");
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_UUIDS.service] }],
        optionalServices: [BLE_UUIDS.service],
      });
      this.device.addEventListener("gattserverdisconnected", this.handleDisconnected);
      return this.device;
    } catch {
      throw new Error("Device selection cancelled or failed");
    }
  }

  async connect(): Promise<void> {
    if (!this.device) {
      await this.requestDevice();
    }

    if (!this.device?.gatt) {
      throw new Error("Selected device does not expose GATT");
    }

    this.server = await this.device.gatt.connect();
    await this.discoverServices();
    await this.subscribeToResponses();
    await this.subscribeToStatus();
  }

  async disconnect(): Promise<void> {
    this.pending.forEach((entry) => {
      clearTimeout(entry.timeout);
      entry.reject(new Error("Disconnected"));
    });
    this.pending.clear();

    if (this.device) {
      this.device.removeEventListener("gattserverdisconnected", this.handleDisconnected);
    }

    if (this.server?.connected) {
      this.server.disconnect();
    }

    this.server = null;
    this.service = null;
    this.commandChar = null;
    this.responseChar = null;
    this.statusChar = null;
  }

  async discoverServices(): Promise<void> {
    if (!this.server) {
      throw new Error("Not connected");
    }

    this.service = await this.server.getPrimaryService(BLE_UUIDS.service);
    this.commandChar = await this.service.getCharacteristic(BLE_UUIDS.command);
    this.responseChar = await this.service.getCharacteristic(BLE_UUIDS.response);
    this.statusChar = await this.service.getCharacteristic(BLE_UUIDS.status);
  }

  async subscribeToResponses(): Promise<void> {
    if (!this.responseChar) {
      throw new Error("Response characteristic unavailable");
    }

    await this.responseChar.startNotifications();
    this.responseChar.addEventListener("characteristicvaluechanged", this.handleResponseNotification);
  }

  async subscribeToStatus(): Promise<void> {
    if (!this.statusChar) {
      throw new Error("Status characteristic unavailable");
    }

    await this.statusChar.startNotifications();
    this.statusChar.addEventListener("characteristicvaluechanged", this.handleStatusNotification);
  }

  async writeCommand(request: CommandRequest): Promise<void> {
    if (!this.commandChar) {
      throw new Error("Command characteristic unavailable");
    }

    const frames = fragmentMessage(encodeCommand(request), request.id, 23);

    for (const frame of frames) {
      const payload = new ArrayBuffer(frame.bytes.byteLength);
      new Uint8Array(payload).set(frame.bytes);
      await this.commandChar.writeValueWithoutResponse(payload);
    }
  }

  async sendCommand(
    request: Omit<CommandRequest, "id">,
    timeoutMs = 5000,
  ): Promise<CommandResponse> {
    const id = this.requestIds.nextId();

    const fullRequest: CommandRequest = { ...request, id };

    return new Promise<CommandResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Request timeout"));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });

      this.writeCommand(fullRequest).catch((err: Error) => {
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(new Error(err.message || "Write failure"));
      });
    });
  }

  onStatus(listener: (status: DeviceStatusPayload) => void): () => void {
    this.onStatusListeners.push(listener);
    return () => {
      this.onStatusListeners = this.onStatusListeners.filter((x) => x !== listener);
    };
  }

  onDisconnected(listener: () => void): () => void {
    this.onDisconnectedListeners.push(listener);
    return () => {
      this.onDisconnectedListeners = this.onDisconnectedListeners.filter((x) => x !== listener);
    };
  }

  getDeviceName(): string {
    return this.device?.name ?? "Unknown";
  }

  isConnected(): boolean {
    return !!this.server?.connected;
  }

  async reconnect(): Promise<boolean> {
    if (!this.device?.gatt) {
      return false;
    }

    try {
      this.server = await this.device.gatt.connect();
      await this.discoverServices();
      await this.subscribeToResponses();
      await this.subscribeToStatus();
      return true;
    } catch {
      return false;
    }
  }

  private handleDisconnected = () => {
    this.onDisconnectedListeners.forEach((fn) => fn());
  };

  private handleResponseNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) {
      return;
    }

    const bytes = new Uint8Array(target.value.buffer.slice(0));

    try {
      const assembled = this.responseReassembler.ingest(bytes, Date.now());
      if (!assembled.complete || !assembled.message) {
        return;
      }

      const response = parseCommandResponse(assembled.message);
      const pending = this.pending.get(response.id);
      if (!pending) {
        return;
      }

      clearTimeout(pending.timeout);
      this.pending.delete(response.id);
      pending.resolve(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Malformed response packet";
      this.pending.forEach((entry) => {
        clearTimeout(entry.timeout);
        entry.reject(new Error(message));
      });
      this.pending.clear();
    }
  };

  private handleStatusNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) {
      return;
    }

    const bytes = new Uint8Array(target.value.buffer.slice(0));

    try {
      const assembled = this.statusReassembler.ingest(bytes, Date.now());
      if (!assembled.complete || !assembled.message) {
        return;
      }

      const payload = parseStatusPayload(assembled.message);
      this.onStatusListeners.forEach((fn) => fn(payload));
    } catch {
      // Invalid status packets are ignored but do not break active connection.
    }
  };
}
