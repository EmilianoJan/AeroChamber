import type { LogEntry } from "../bluetooth/bleTypes";

type Props = {
  entries: LogEntry[];
};

export function LogPanel({ entries }: Props) {
  return (
    <section className="panel log-panel">
      <h2>Logs</h2>
      <div className="log-list">
        {entries.length === 0 ? <p>No logs yet</p> : null}
        {entries.map((entry, index) => (
          <p key={`${entry.timestamp}-${index}`}>
            [{entry.timestamp}] {entry.message}
          </p>
        ))}
      </div>
    </section>
  );
}
