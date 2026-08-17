import { useState } from "react";

type Props = {
  onGetStatus: () => void;
  onStart: () => void;
  onStop: () => void;
  onSetFrequency: (value: number) => void;
};

export function DeviceControls({ onGetStatus, onStart, onStop, onSetFrequency }: Props) {
  const [frequency, setFrequency] = useState(1000);

  return (
    <section className="panel">
      <h2>Controls</h2>
      <div className="row">
        <button onClick={onGetStatus}>Get Status</button>
        <button onClick={onStart}>Start</button>
        <button onClick={onStop}>Stop</button>
      </div>

      <div className="row">
        <label htmlFor="frequency">Frequency</label>
        <input
          id="frequency"
          type="number"
          min={1}
          max={5000}
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
        />
        <button onClick={() => onSetFrequency(frequency)}>Set</button>
      </div>
    </section>
  );
}
