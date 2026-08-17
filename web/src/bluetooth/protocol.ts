import type { CommandRequest, CommandResponse, DeviceStatusPayload } from "./bleTypes";

export const BLE_UUIDS = {
  service: "12345678-1234-5678-1234-56789abcdef0",
  command: "12345678-1234-5678-1234-56789abcdef1",
  response: "12345678-1234-5678-1234-56789abcdef2",
  status: "12345678-1234-5678-1234-56789abcdef3",
} as const;

const PROTOCOL_VERSION = 1;
const HEADER_SIZE = 8;
export const MAX_MESSAGE_SIZE = 512;

export interface EncodedFrame {
  messageId: number;
  bytes: Uint8Array;
}

export interface DecodedFrame {
  version: number;
  isStart: boolean;
  isEnd: boolean;
  messageId: number;
  totalLength: number;
  offset: number;
  payload: Uint8Array;
}

export class RequestIdGenerator {
  private next = 1;

  nextId(): number {
    const id = this.next;
    this.next += 1;
    if (this.next > 0xffff) {
      this.next = 1;
    }
    return id;
  }
}

export function encodeCommand(req: CommandRequest): string {
  return JSON.stringify(req);
}

export function parseCommandResponse(json: string): CommandResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON response");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { id?: unknown }).id !== "number" ||
    typeof (parsed as { success?: unknown }).success !== "boolean"
  ) {
    throw new Error("Malformed response payload");
  }

  return parsed as CommandResponse;
}

export function parseStatusPayload(json: string): DeviceStatusPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid status JSON");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { state?: unknown }).state !== "string" ||
    typeof (parsed as { temperature?: unknown }).temperature !== "number" ||
    typeof (parsed as { battery?: unknown }).battery !== "number" ||
    typeof (parsed as { frequency?: unknown }).frequency !== "number"
  ) {
    throw new Error("Malformed status payload");
  }

  return parsed as DeviceStatusPayload;
}

export function fragmentMessage(message: string, messageId: number, attMtu = 23): EncodedFrame[] {
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  if (messageBytes.length === 0 || messageBytes.length > MAX_MESSAGE_SIZE) {
    throw new Error("Message size out of bounds");
  }

  const attPayload = Math.max(20, attMtu - 3);
  const maxChunk = Math.max(1, attPayload - HEADER_SIZE);
  const frames: EncodedFrame[] = [];

  for (let offset = 0; offset < messageBytes.length; offset += maxChunk) {
    const chunk = messageBytes.slice(offset, offset + maxChunk);
    const bytes = new Uint8Array(HEADER_SIZE + chunk.length);

    bytes[0] = PROTOCOL_VERSION;
    let flags = 0;
    if (offset === 0) {
      flags |= 0x01;
    }
    if (offset + chunk.length >= messageBytes.length) {
      flags |= 0x02;
    }
    bytes[1] = flags;

    bytes[2] = (messageId >> 8) & 0xff;
    bytes[3] = messageId & 0xff;
    bytes[4] = (messageBytes.length >> 8) & 0xff;
    bytes[5] = messageBytes.length & 0xff;
    bytes[6] = (offset >> 8) & 0xff;
    bytes[7] = offset & 0xff;

    bytes.set(chunk, HEADER_SIZE);
    frames.push({ messageId, bytes });
  }

  return frames;
}

export function decodeFrame(bytes: Uint8Array): DecodedFrame {
  if (bytes.length < HEADER_SIZE) {
    throw new Error("Frame too short");
  }

  const version = bytes[0];
  if (version !== PROTOCOL_VERSION) {
    throw new Error("Unsupported frame version");
  }

  const flags = bytes[1];
  const messageId = (bytes[2] << 8) | bytes[3];
  const totalLength = (bytes[4] << 8) | bytes[5];
  const offset = (bytes[6] << 8) | bytes[7];
  const payload = bytes.slice(HEADER_SIZE);

  return {
    version,
    isStart: (flags & 0x01) !== 0,
    isEnd: (flags & 0x02) !== 0,
    messageId,
    totalLength,
    offset,
    payload,
  };
}

export class Reassembler {
  private active = false;
  private messageId = 0;
  private totalLength = 0;
  private receivedLength = 0;
  private startedAt = 0;
  private buffer = new Uint8Array(0);

  constructor(private timeoutMs = 3000) {}

  ingest(frameBytes: Uint8Array, nowMs = Date.now()): { complete: boolean; message?: string } {
    if (this.active && nowMs - this.startedAt > this.timeoutMs) {
      this.reset();
      throw new Error("Reassembly timeout");
    }

    const frame = decodeFrame(frameBytes);

    if (frame.totalLength <= 0 || frame.totalLength > MAX_MESSAGE_SIZE) {
      throw new Error("Invalid total length");
    }

    if (frame.isStart) {
      this.active = true;
      this.messageId = frame.messageId;
      this.totalLength = frame.totalLength;
      this.receivedLength = 0;
      this.startedAt = nowMs;
      this.buffer = new Uint8Array(frame.totalLength);
    }

    if (
      !this.active ||
      frame.messageId !== this.messageId ||
      frame.totalLength !== this.totalLength ||
      frame.offset !== this.receivedLength
    ) {
      throw new Error("Out-of-order or mismatched frame");
    }

    if (frame.offset + frame.payload.length > this.totalLength) {
      this.reset();
      throw new Error("Frame exceeds declared length");
    }

    this.buffer.set(frame.payload, frame.offset);
    this.receivedLength += frame.payload.length;

    if (!frame.isEnd) {
      return { complete: false };
    }

    if (this.receivedLength !== this.totalLength) {
      this.reset();
      throw new Error("Incomplete final frame");
    }

    const out = new TextDecoder().decode(this.buffer);
    this.reset();
    return { complete: true, message: out };
  }

  private reset() {
    this.active = false;
    this.messageId = 0;
    this.totalLength = 0;
    this.receivedLength = 0;
    this.startedAt = 0;
    this.buffer = new Uint8Array(0);
  }
}
