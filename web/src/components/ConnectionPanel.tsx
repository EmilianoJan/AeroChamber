import type { ConnectionStatus } from "../bluetooth/bleTypes";

type Props = {
  status: ConnectionStatus;
  deviceName: string;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function ConnectionPanel({ status, deviceName, onConnect, onDisconnect }: Props) {
  return (
    <section className="panel">
      <h2>Connection</h2>
      <p>
        <strong>Status:</strong> {status}
      </p>
      <p>
        <strong>Device:</strong> {deviceName}
      </p>
      <div className="row">
        <button onClick={onConnect} disabled={status === "connecting" || status === "unsupported"}>
          Connect
        </button>
        <button onClick={onDisconnect} disabled={status !== "connected"}>
          Disconnect
        </button>
      </div>
      {status === "unsupported" ? <p className="warning">Bluetooth unsupported in this browser.</p> : null}
    </section>
  );
}
