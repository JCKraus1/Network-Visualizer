import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Device, DeviceType, DeviceCategory, DeviceStatus } from '../types';
import { DEVICE_CATEGORIES } from '../types';

const DEVICE_TYPES: { type: DeviceType; label: string; category: DeviceCategory }[] = [
  { type: 'router', label: 'Router / Modem', category: 'network' },
  { type: 'switch', label: 'Network Switch', category: 'network' },
  { type: 'access-point', label: 'Access Point', category: 'network' },
  { type: 'mesh-node', label: 'Mesh Node', category: 'network' },
  { type: 'mesh-pod', label: 'Mesh Pod', category: 'network' },
  { type: 'desktop', label: 'Desktop PC', category: 'computer' },
  { type: 'laptop', label: 'Laptop', category: 'computer' },
  { type: 'server', label: 'Server', category: 'computer' },
  { type: 'nas', label: 'NAS Storage', category: 'computer' },
  { type: 'workstation', label: 'Workstation', category: 'computer' },
  { type: 'phone', label: 'Smartphone', category: 'mobile' },
  { type: 'tablet', label: 'Tablet', category: 'mobile' },
  { type: 'smart-watch', label: 'Smart Watch', category: 'mobile' },
  { type: 'tv', label: 'Smart TV', category: 'entertainment' },
  { type: 'streaming-stick', label: 'Streaming Stick', category: 'entertainment' },
  { type: 'gaming-console', label: 'Gaming Console', category: 'entertainment' },
  { type: 'cable-box', label: 'Cable/Satellite Box', category: 'entertainment' },
  { type: 'home-theater', label: 'Home Theater System', category: 'entertainment' },
  { type: 'projector', label: 'Projector', category: 'entertainment' },
  { type: 'vr-headset', label: 'VR Headset', category: 'entertainment' },
  { type: 'game-controller', label: 'Game Controller', category: 'entertainment' },
  { type: 'smart-speaker', label: 'Smart Speaker', category: 'smart-home' },
  { type: 'smart-display', label: 'Smart Display', category: 'smart-home' },
  { type: 'iot-camera', label: 'Security Camera', category: 'smart-home' },
  { type: 'iot-light', label: 'Smart Light Hub', category: 'smart-home' },
  { type: 'iot-thermostat', label: 'Thermostat', category: 'smart-home' },
  { type: 'iot-sensor', label: 'IoT Sensor', category: 'smart-home' },
  { type: 'iot-appliance', label: 'Smart Appliance', category: 'smart-home' },
  { type: 'smart-plug', label: 'Smart Plug', category: 'smart-home' },
  { type: 'smart-lock', label: 'Smart Lock', category: 'smart-home' },
  { type: 'doorbell', label: 'Video Doorbell', category: 'smart-home' },
  { type: 'smart-hub', label: 'Smart Hub', category: 'smart-home' },
  { type: 'ev-charger', label: 'EV Charger', category: 'smart-home' },
  { type: 'printer', label: 'Printer', category: 'peripheral' },
  { type: 'voip-phone', label: 'VoIP Phone', category: 'peripheral' },
];

interface DeviceModalProps {
  device?: Device | null;
  allDevices: Device[];
  rooms: string[];
  onSave: (device: Device) => void;
  onClose: () => void;
}

function generateId() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function DeviceModal({ device, allDevices, rooms, onSave, onClose }: DeviceModalProps) {
  const [form, setForm] = useState<Partial<Device>>({
    name: '',
    type: 'phone',
    category: 'mobile',
    room: 'Living Room',
    ip: '',
    mac: '',
    status: 'online',
    connectedTo: [],
    brand: '',
    model: '',
    bandwidth: 0,
  });

  useEffect(() => {
    if (device) setForm({ ...device });
  }, [device]);

  const set = (key: keyof Device, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const handleTypeChange = (typeStr: string) => {
    const found = DEVICE_TYPES.find(t => t.type === typeStr);
    if (found) {
      setForm(f => ({ ...f, type: found.type, category: found.category }));
    }
  };

  const handleConnectedTo = (id: string, checked: boolean) => {
    setForm(f => ({
      ...f,
      connectedTo: checked
        ? [...(f.connectedTo ?? []), id]
        : (f.connectedTo ?? []).filter(x => x !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: device?.id ?? generateId(),
      name: form.name ?? 'New Device',
      type: form.type ?? 'phone',
      category: form.category ?? 'mobile',
      room: form.room ?? 'Living Room',
      ip: form.ip,
      mac: form.mac,
      status: (form.status as DeviceStatus) ?? 'online',
      connectedTo: form.connectedTo ?? [],
      brand: form.brand,
      model: form.model,
      bandwidth: form.bandwidth ?? 0,
    });
  };

  const potentialParents = allDevices.filter(d => d.id !== device?.id);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{device ? 'Edit Device' : 'Add Device'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Device Name *</label>
            <input
              type="text"
              required
              value={form.name ?? ''}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Living Room TV"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Device Type *</label>
              <select value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                {Object.entries(DEVICE_CATEGORIES).map(([cat, catInfo]) => (
                  <optgroup key={cat} label={catInfo.label}>
                    {DEVICE_TYPES.filter(t => t.category === cat).map(t => (
                      <option key={t.type} value={t.type}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Room *</label>
              <select value={form.room} onChange={e => set('room', e.target.value)}>
                {rooms.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="online">Online</option>
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div className="form-group">
              <label>IP Address</label>
              <input
                type="text"
                value={form.ip ?? ''}
                onChange={e => set('ip', e.target.value)}
                placeholder="192.168.1.x"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                value={form.brand ?? ''}
                onChange={e => set('brand', e.target.value)}
                placeholder="e.g. Apple"
              />
            </div>
            <div className="form-group">
              <label>Model</label>
              <input
                type="text"
                value={form.model ?? ''}
                onChange={e => set('model', e.target.value)}
                placeholder="e.g. iPhone 15"
              />
            </div>
          </div>

          <div className="form-group">
            <label>MAC Address</label>
            <input
              type="text"
              value={form.mac ?? ''}
              onChange={e => set('mac', e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
            />
          </div>

          {potentialParents.length > 0 && (
            <div className="form-group">
              <label>Connected To (select parent devices)</label>
              <div className="checkbox-list">
                {potentialParents.map(d => (
                  <label key={d.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={(form.connectedTo ?? []).includes(d.id)}
                      onChange={e => handleConnectedTo(d.id, e.target.checked)}
                    />
                    <span>{d.name}</span>
                    <span className="checkbox-sub">{d.room}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save">{device ? 'Save Changes' : 'Add Device'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
