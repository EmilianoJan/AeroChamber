import { ConnectionPanel } from "./components/ConnectionPanel";
import { DeviceControls } from "./components/DeviceControls";
import { DeviceStatus } from "./components/DeviceStatus";
import { LogPanel } from "./components/LogPanel";
import { useBluetooth } from "./hooks/useBluetooth";

function App() {
  const { status, deviceName, deviceStatus, deviceInfo, logs, error, connect, disconnect, send } = useBluetooth();

  return (
    <main className="app-shell">
      <header>
        <h1>AeroChamber BLE Control</h1>
        <p>Browser-to-ESP32 communication over Web Bluetooth GATT.</p>
      </header>

      <section className="grid">
        <ConnectionPanel status={status} deviceName={deviceName} onConnect={connect} onDisconnect={disconnect} />
        <DeviceStatus
          connectionStatus={status}
          deviceName={deviceName}
          status={deviceStatus}
          info={deviceInfo}
        />
        <DeviceControls
          onGetStatus={() => void send("GET_STATUS")}
          onStart={() => void send("START")}
          onStop={() => void send("STOP")}
          onSetFrequency={(value) => void send("SET_PARAMETER", { parameter: "frequency", value })}
        />
        <LogPanel entries={logs} />
      </section>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}

export default App;
