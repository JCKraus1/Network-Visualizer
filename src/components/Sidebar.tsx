import {
  Router, GitBranch, Wifi, Monitor, Laptop, Server, HardDrive,
  Smartphone, Tablet, Tv, Cast, Gamepad2, Volume2,
  Camera, Lightbulb, Thermometer, Radio, Home, Printer,
  Plus, ChevronDown, ChevronRight, Globe,
} from 'lucide-react';
import { useState } from 'react';
import type { Device, DeviceType, DeviceCategory, ViewMode, SortMode } from '../types';
import { DEVICE_CATEGORIES, STATUS_COLORS } from '../types';

const TYPE_ICONS: Record<DeviceType, React.FC<{ size: number; color?: string }>> = {
  'router': Router, 'switch': GitBranch, 'access-point': Wifi, 'mesh-node': Wifi,
  'desktop': Monitor, 'laptop': Laptop, 'server': Server, 'nas': HardDrive,
  'phone': Smartphone, 'tablet': Tablet, 'tv': Tv, 'streaming-stick': Cast,
  'gaming-console': Gamepad2, 'smart-speaker': Volume2, 'smart-display': Tablet,
  'iot-camera': Camera, 'iot-light': Lightbulb, 'iot-thermostat': Thermometer,
  'iot-sensor': Radio, 'iot-appliance': Home, 'printer': Printer,
};

interface SidebarProps {
  devices: Device[];
  viewMode: ViewMode;
  sortMode: SortMode;
  filterRooms: string[];
  filterCategories: DeviceCategory[];
  animationsEnabled: boolean;
  onViewMode: (v: ViewMode) => void;
  onSortMode: (s: SortMode) => void;
  onFilterRooms: (rooms: string[]) => void;
  onFilterCategories: (cats: DeviceCategory[]) => void;
  onToggleAnimations: () => void;
  onAddDevice: () => void;
  onSelectDevice: (id: string) => void;
  selectedDeviceId?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
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
  devices, viewMode, sortMode, filterRooms, filterCategories, animationsEnabled,
  onViewMode, onSortMode, onFilterRooms, onFilterCategories, onToggleAnimations,
  onAddDevice, onSelectDevice, selectedDeviceId,
}: SidebarProps) {
  const onlineCount = devices.filter(d => d.status !== 'offline').length;
  const activeCount = devices.filter(d => d.status === 'active').length;

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
    return 0;
  });

  const usedRooms = [...new Set(devices.map(d => d.room))];

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

      <div className="sidebar-footer">
        <button className="add-device-btn" onClick={onAddDevice}>
          <Plus size={16} />
          Add Device
        </button>
      </div>
    </aside>
  );
}
