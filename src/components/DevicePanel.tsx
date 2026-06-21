import {
  Router, GitBranch, Wifi, Monitor, Laptop, Server, HardDrive,
  Smartphone, Tablet, Tv, Cast, Gamepad2, Volume2,
  Camera, Lightbulb, Thermometer, Radio, Home, Printer,
  X, Signal, Zap, Globe, Network,
  Watch, Plug, Lock, Bell, Box, Music2, Film,
  Phone, Glasses, Cpu, Gamepad2 as GameController,
} from 'lucide-react';
import type { Device, DeviceType } from '../types';
import { useCategoryColors, useStatusColors } from '../contexts/ThemeContext';

const TYPE_ICONS: Record<DeviceType, React.FC<{ size: number; color?: string }>> = {
  'router': Router, 'switch': GitBranch, 'access-point': Wifi, 'mesh-node': Wifi,
  'desktop': Monitor, 'laptop': Laptop, 'server': Server, 'nas': HardDrive,
  'phone': Smartphone, 'tablet': Tablet, 'tv': Tv, 'streaming-stick': Cast,
  'gaming-console': Gamepad2, 'smart-speaker': Volume2, 'smart-display': Tablet,
  'iot-camera': Camera, 'iot-light': Lightbulb, 'iot-thermostat': Thermometer,
  'iot-sensor': Radio, 'iot-appliance': Home, 'printer': Printer,
  'smart-watch': Watch, 'smart-plug': Plug, 'smart-lock': Lock, 'doorbell': Bell,
  'cable-box': Box, 'home-theater': Music2, 'projector': Film, 'workstation': Monitor,
  'mesh-pod': Wifi, 'smart-hub': Cpu, 'voip-phone': Phone, 'vr-headset': Glasses,
  'ev-charger': Zap, 'game-controller': GameController,
};

interface DevicePanelProps {
  device: Device;
  allDevices: Device[];
  onClose: () => void;
  onEdit: (device: Device) => void;
  onHide: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DevicePanel({ device, allDevices, onClose, onEdit, onHide, onDelete }: DevicePanelProps) {
  const categoryColors = useCategoryColors();
  const statusColors = useStatusColors();
  const cat = categoryColors[device.category];
  const Icon = TYPE_ICONS[device.type] ?? Monitor;
  const statusColor = statusColors[device.status];
  const parents = allDevices.filter(d => device.connectedTo.includes(d.id));
  const children = allDevices.filter(d => d.connectedTo.includes(device.id));

  const handleDelete = () => {
    if (window.confirm(`Delete "${device.name}"? This cannot be undone.`)) {
      onDelete(device.id);
    }
  };

  return (
    <div className="device-panel">
      <div className="panel-header">
        <div className="panel-icon" style={{ background: cat.bg, borderColor: cat.color }}>
          <Icon size={24} color={cat.color} />
        </div>
        <div>
          <h2 className="panel-title">{device.name}</h2>
          <span className="panel-type">{device.type.replace(/-/g, ' ')}</span>
        </div>
        <button className="panel-close" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="panel-status-bar" style={{ background: `${statusColor}22`, borderColor: `${statusColor}44` }}>
        <div className="status-dot" style={{ background: statusColor }} />
        <span style={{ color: statusColor, textTransform: 'capitalize', fontWeight: 600 }}>
          {device.status}
        </span>
        {device.bandwidth !== undefined && device.bandwidth > 0 && (
          <span className="panel-bw" style={{ color: statusColor }}>
            <Zap size={12} /> {device.bandwidth} Mbps
          </span>
        )}
      </div>

      <div className="panel-grid">
        <div className="panel-row"><span>Category</span><span style={{ color: cat.color }}>{cat.label}</span></div>
        <div className="panel-row"><span>Room</span><span>{device.room}</span></div>
        {device.brand && <div className="panel-row"><span>Brand</span><span>{device.brand}</span></div>}
        {device.model && <div className="panel-row"><span>Model</span><span>{device.model}</span></div>}
        {device.ip && (
          <div className="panel-row">
            <span><Globe size={12} style={{ display: 'inline' }} /> IP</span>
            <code>{device.ip}</code>
          </div>
        )}
        {device.mac && (
          <div className="panel-row"><span>MAC</span><code style={{ fontSize: 11 }}>{device.mac}</code></div>
        )}
        {device.connectionType && (
          <div className="panel-row">
            <span>Connection</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {device.connectionType === 'wifi'
                ? <><Wifi size={11} color="#38bdf8" /> <span style={{ color: '#38bdf8' }}>WiFi</span></>
                : <><Network size={11} color="#fbbf24" /> <span style={{ color: '#fbbf24' }}>Ethernet</span></>}
            </span>
          </div>
        )}
        {device.signalStrength !== undefined && (
          <div className="panel-row">
            <span><Signal size={12} style={{ display: 'inline' }} /> Signal</span>
            <div className="signal-bar">
              <div className="signal-fill" style={{ width: `${device.signalStrength}%`, background: cat.color }} />
              <span>{device.signalStrength}%</span>
            </div>
          </div>
        )}
      </div>

      {parents.length > 0 && (
        <div className="panel-section">
          <h3>Connected To</h3>
          {parents.map(p => {
            const pc = categoryColors[p.category];
            const PI = TYPE_ICONS[p.type] ?? Monitor;
            return (
              <div key={p.id} className="conn-item">
                <PI size={14} color={pc.color} />
                <span>{p.name}</span>
                <span className="conn-room">{p.room}</span>
              </div>
            );
          })}
        </div>
      )}

      {children.length > 0 && (
        <div className="panel-section">
          <h3>Devices Connected Here ({children.length})</h3>
          {children.map(c => {
            const cc = categoryColors[c.category];
            const CI = TYPE_ICONS[c.type] ?? Monitor;
            return (
              <div key={c.id} className="conn-item">
                <CI size={14} color={cc.color} />
                <span>{c.name}</span>
                <div className="status-dot-sm" style={{ background: statusColors[c.status] }} />
              </div>
            );
          })}
        </div>
      )}

      <button className="edit-btn" onClick={() => onEdit(device)}>Edit Device</button>
      <button className="edit-btn hide-btn" onClick={() => onHide(device.id)}>Hide from Map</button>
      <button className="edit-btn delete-btn" onClick={handleDelete}>Delete Device</button>
    </div>
  );
}
