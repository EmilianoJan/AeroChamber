import { describe, expect, it } from "vitest";

import {
  Reassembler,
  RequestIdGenerator,
  decodeFrame,
  encodeCommand,
  fragmentMessage,
  parseCommandResponse,
} from "../bluetooth/protocol";

describe("protocol serialization", () => {
  it("serializes command payloads", () => {
    const out = encodeCommand({ id: 42, command: "GET_STATUS" });
    expect(out).toContain('"id":42');
    expect(out).toContain('"command":"GET_STATUS"');
  });

  it("parses valid response JSON", () => {
    const response = parseCommandResponse('{"id":42,"success":true}');
    expect(response.id).toBe(42);
    expect(response.success).toBe(true);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseCommandResponse("{invalid")).toThrow("Invalid JSON response");
  });
});

describe("request id generator", () => {
  it("increments and wraps ids", () => {
    const gen = new RequestIdGenerator();
    let last = 0;
    for (let i = 0; i < 65535; i++) {
      last = gen.nextId();
    }
    expect(last).toBe(65535);
    expect(gen.nextId()).toBe(1);
  });
});

describe("fragmentation and reassembly", () => {
  it("fragments and reassembles a long message", () => {
    const json = JSON.stringify({
      id: 7,
      command: "SET_PARAMETER",
      parameter: "frequency",
      value: 1234,
      padding: "x".repeat(120),
    });

    const frames = fragmentMessage(json, 7, 23);
    expect(frames.length).toBeGreaterThan(1);

    const reassembler = new Reassembler(3000);
    let assembled = "";

    for (const frame of frames) {
      const result = reassembler.ingest(frame.bytes, 1000);
      if (result.complete) {
        assembled = result.message ?? "";
      }
    }

    expect(assembled).toBe(json);
  });

  it("detects malformed frame ordering", () => {
    const json = JSON.stringify({ id: 9, command: "GET_STATUS", payload: "x".repeat(100) });
    const frames = fragmentMessage(json, 9, 23);

    const reassembler = new Reassembler(3000);
    expect(() => {
      reassembler.ingest(frames[1].bytes, 1000);
    }).toThrow("Out-of-order or mismatched frame");
  });

  it("handles timeout for incomplete message", () => {
    const json = JSON.stringify({ id: 11, command: "GET_STATUS", payload: "x".repeat(60) });
    const frames = fragmentMessage(json, 11, 23);

    const reassembler = new Reassembler(1000);
    reassembler.ingest(frames[0].bytes, 1000);

    expect(() => reassembler.ingest(frames[1].bytes, 2501)).toThrow("Reassembly timeout");
  });

  it("keeps frame metadata consistent", () => {
    const frame = fragmentMessage('{"id":1,"command":"GET_STATUS"}', 1, 64)[0].bytes;
    const decoded = decodeFrame(frame);
    expect(decoded.version).toBe(1);
    expect(decoded.messageId).toBe(1);
    expect(decoded.isStart).toBe(true);
    expect(decoded.isEnd).toBe(true);
  });
});
