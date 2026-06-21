import {
  Router, GitBranch, Wifi, Monitor, Laptop, Server, HardDrive,
  Smartphone, Tablet, Tv, Cast, Gamepad2, Volume2,
  Camera, Lightbulb, Thermometer, Radio, Home, Printer,
  Plus, ChevronDown, ChevronRight, Globe,
  Watch, Plug, Lock, Bell, Box, Music2, Film,
  Phone, Glasses, Cpu, Zap, Gamepad2 as GameController,
} from 'lucide-react';
import { useState } from 'react';
import type { Device, DeviceType, DeviceCategory, ViewMode, SortMode } from '../types';
import { DEVICE_CATEGORIES, ROOMS, STATUS_COLORS } from '../types';

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

interface SidebarProps {
  devices: Device[];
  allDevices: Device[];
  viewMode: ViewMode;
  sortMode: SortMode;
  filterRooms: string[];
  filterCategories: DeviceCategory[];
  animationsEnabled: boolean;
  rooms: string[];
  onViewMode: (v: ViewMode) => void;
  onSortMode: (s: SortMode) => void;
  onFilterRooms: (rooms: string[]) => void;
  onFilterCategories: (cats: DeviceCategory[]) => void;
  onToggleAnimations: () => void;
  onAddDevice: () => void;
  onSelectDevice: (id: string) => void;
  onShowDevice: (id: string) => void;
  onAddRoom: (name: string) => void;
  onDeleteRoom: (name: string) => void;
  onDownload: () => void;
  selectedDeviceId?: string;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-section">
      <button className="section-toggle" onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
      </button>
      {open && <div className="section-content">{children}</div>}
    </div>
  );
}

export default function Sidebar({
  devices, allDevices, viewMode, sortMode, filterRooms, filterCategories, animationsEnabled,
  rooms, onViewMode, onSortMode, onFilterRooms, onFilterCategories, onToggleAnimations,
  onAddDevice, onSelectDevice, onShowDevice, onAddRoom, onDeleteRoom, onDownload,
  selectedDeviceId,
}: SidebarProps) {
  const onlineCount = devices.filter(d => d.status !== 'offline').length;
  const activeCount = devices.filter(d => d.status === 'active').length;
  const [newRoomName, setNewRoomName] = useState('');

  const toggleRoom = (room: string) => {
    onFilterRooms(
      filterRooms.includes(room) ? filterRooms.filter(r => r !== room) : [...filterRooms, room]
    );
  };

  const toggleCat = (cat: DeviceCategory) => {
    onFilterCategories(
      filterCategories.includes(cat) ? filterCategories.filter(c => c !== cat) : [...filterCategories, cat]
    );
  };

  const sortedDevices = [...devices].sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name);
    if (sortMode === 'status') {
      const order = { active: 0, online: 1, idle: 2, offline: 3 };
      return order[a.status] - order[b.status];
    }
    if (sortMode === 'bandwidth') return (b.bandwidth ?? 0) - (a.bandwidth ?? 0);
    if (sortMode === 'room') return a.room.localeCompare(b.room);
    if (sortMode === 'type') return a.type.localeCompare(b.type);
    if (sortMode === 'ip') {
      const aOcts = (a.ip || '').split('.').map(Number);
      const bOcts = (b.ip || '').split('.').map(Number);
      for (let i = 0; i < 4; i++) { if (aOcts[i] !== bOcts[i]) return aOcts[i] - bOcts[i]; }
      return 0;
    }
    if (sortMode === 'mac') return (a.mac || '').localeCompare(b.mac || '');
    return 0;
  });

  const usedRooms = [...new Set(devices.map(d => d.room))];
  const hiddenDevices = allDevices.filter(d => d.hidden === true);

  // custom rooms = rooms not in built-in ROOMS list
  const customRooms = rooms.filter(r => !ROOMS.includes(r));

  const handleAddRoom = () => {
    const trimmed = newRoomName.trim();
    if (trimmed && !rooms.includes(trimmed)) {
      onAddRoom(trimmed);
      setNewRoomName('');
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Globe size={20} color="#06b6d4" />
          <span>Home Network</span>
        </div>
        <div className="sidebar-stats">
          <div className="stat">
            <span className="stat-val">{onlineCount}</span>
            <span className="stat-lbl">Online</span>
          </div>
          <div className="stat">
            <span className="stat-val" style={{ color: '#22c55e' }}>{activeCount}</span>
            <span className="stat-lbl">Active</span>
          </div>
          <div className="stat">
            <span className="stat-val">{devices.length}</span>
            <span className="stat-lbl">Total</span>
          </div>
        </div>
      </div>

      <div className="sidebar-content">
      <Section title="View Mode">
        <div className="view-tabs">
          {(['topology', 'by-room', 'by-type'] as ViewMode[]).map(v => (
            <button
              key={v}
              className={`view-tab ${viewMode === v ? 'active' : ''}`}
              onClick={() => onViewMode(v)}
            >
              {v === 'topology' ? 'Network' : v === 'by-room' ? 'By Room' : 'By Type'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Sort By">
        <select
          className="sort-select"
          value={sortMode}
          onChange={e => onSortMode(e.target.value as SortMode)}
        >
          <option value="name">Name</option>
          <option value="status">Status</option>
          <option value="bandwidth">Bandwidth</option>
          <option value="room">Room</option>
          <option value="type">Type</option>
          <option value="ip">IP Address</option>
          <option value="mac">MAC Address</option>
        </select>
      </Section>

      <Section title="Filter by Room">
        <div className="filter-list">
          {usedRooms.sort().map(room => (
            <label key={room} className="filter-item">
              <input
                type="checkbox"
                checked={filterRooms.length === 0 || filterRooms.includes(room)}
                onChange={() => toggleRoom(room)}
              />
              <span>{room}</span>
              <span className="filter-count">
                {devices.filter(d => d.room === room).length}
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Filter by Type">
        <div className="filter-list">
          {(Object.entries(DEVICE_CATEGORIES) as [DeviceCategory, typeof DEVICE_CATEGORIES[DeviceCategory]][]).map(([cat, info]) => {
            const count = devices.filter(d => d.category === cat).length;
            if (count === 0) return null;
            return (
              <label key={cat} className="filter-item">
                <input
                  type="checkbox"
                  checked={filterCategories.length === 0 || filterCategories.includes(cat)}
                  onChange={() => toggleCat(cat)}
                />
                <span className="filter-dot" style={{ background: info.color }} />
                <span>{info.label}</span>
                <span className="filter-count">{count}</span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Animations">
        <label className="toggle-label">
          <div className={`toggle ${animationsEnabled ? 'on' : ''}`} onClick={onToggleAnimations}>
            <div className="toggle-knob" />
          </div>
          <span>Live data flow animation</span>
        </label>
      </Section>

      <Section title={`Devices (${sortedDevices.length})`}>
        <div className="device-list">
          {sortedDevices.map(device => {
            const cat = DEVICE_CATEGORIES[device.category];
            const Icon = TYPE_ICONS[device.type] ?? Monitor;
            return (
              <button
                key={device.id}
                className={`device-list-item ${selectedDeviceId === device.id ? 'selected' : ''}`}
                onClick={() => onSelectDevice(device.id)}
              >
                <div className="dli-icon" style={{ background: cat.bg }}>
                  <Icon size={14} color={cat.color} />
                </div>
                <div className="dli-info">
                  <span className="dli-name">{device.name}</span>
                  <span className="dli-room">{device.room}</span>
                </div>
                <div className="dli-status" style={{ background: STATUS_COLORS[device.status] }} />
              </button>
            );
          })}
        </div>
      </Section>

      {hiddenDevices.length > 0 && (
        <Section title={`Hidden Devices (${hiddenDevices.length})`} defaultOpen={false}>
          <div className="device-list">
            {hiddenDevices.map(device => {
              const cat = DEVICE_CATEGORIES[device.category];
              const Icon = TYPE_ICONS[device.type] ?? Monitor;
              return (
                <div key={device.id} className="hidden-device-item">
                  <div className="dli-icon" style={{ background: cat.bg }}>
                    <Icon size={14} color={cat.color} />
                  </div>
                  <div className="dli-info">
                    <span className="dli-name">{device.name}</span>
                    <span className="dli-room">{device.room}</span>
                  </div>
                  <button className="show-btn" onClick={() => onShowDevice(device.id)}>Show</button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Manage Rooms" defaultOpen={false}>
        <div className="add-room-row">
          <input
            type="text"
            className="room-input"
            placeholder="New room name..."
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
          />
          <button className="add-room-btn" onClick={handleAddRoom}>Add</button>
        </div>
        {customRooms.length > 0 && (
          <div className="room-list">
            {customRooms.map(room => (
              <div key={room} className="room-manage-item">
                <span>{room}</span>
                <button className="room-delete-btn" onClick={() => onDeleteRoom(room)}>×</button>
              </div>
            ))}
          </div>
        )}
        {customRooms.length === 0 && (
          <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>No custom rooms yet.</div>
        )}
      </Section>

      </div>{/* end sidebar-content */}
      <div className="sidebar-footer">
        <button className="add-device-btn" onClick={onAddDevice}>
          <Plus size={16} />
          Add Device
        </button>
        <button className="download-btn" onClick={onDownload}>
          ↓ Export JSON
        </button>
      </div>
    </aside>
  );
}
