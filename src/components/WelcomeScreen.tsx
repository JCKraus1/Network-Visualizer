import { useState, useRef } from 'react';
import { Network, Upload, Terminal, Database } from 'lucide-react';
import type { Device } from '../types';
import { initialDevices } from '../data/devices';

interface WelcomeScreenProps {
  onImport: (devices: Device[]) => void;
}

export default function WelcomeScreen({ onImport }: WelcomeScreenProps) {
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const parseAndLoad = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) throw new Error('Expected a JSON array of devices.');
      if (data.length === 0) throw new Error('Array is empty.');
      setError('');
      onImport(data as Device[]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseAndLoad(ev.target?.result as string);
    reader.readAsText(file);
  };

  return (
    <div className="welcome-overlay">
      <div className="welcome-box">
        <div className="welcome-logo">
          <Network size={36} color="#06b6d4" />
          <h1>Home Network Visualizer</h1>
          <p>Map and monitor every device on your network in real time.</p>
        </div>

        <div className="welcome-steps">
          <div className="welcome-step">
            <div className="step-num">1</div>
            <div>
              <strong>Run the scanner on your home computer</strong>
              <div className="step-code">
                <Terminal size={13} />
                <code>node scanner.js &gt; my-network.json</code>
              </div>
              <span className="step-note">
                Download <code>scanner.js</code> from the repo root. Requires Node.js — no npm install needed.
                Run it while connected to your home Wi-Fi or Ethernet.
              </span>
            </div>
          </div>

          <div className="welcome-step">
            <div className="step-num">2</div>
            <div>
              <strong>Import the generated file</strong>
              <div className="import-actions">
                <button className="import-btn" onClick={() => fileRef.current?.click()}>
                  <Upload size={15} />
                  Upload JSON file
                </button>
                <span className="import-or">or paste below</span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
              <textarea
                className="paste-area"
                placeholder='Paste JSON here, then click "Import" ...'
                value={paste}
                onChange={e => { setPaste(e.target.value); setError(''); }}
                rows={6}
              />
              {error && <div className="import-error">{error}</div>}
              {paste.trim() && (
                <button className="import-btn primary" onClick={() => parseAndLoad(paste)}>
                  Import JSON
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="welcome-divider">or</div>

        <button className="demo-btn" onClick={() => onImport(initialDevices)}>
          <Database size={16} />
          Load sample data for a quick demo
        </button>
      </div>
    </div>
  );
}
