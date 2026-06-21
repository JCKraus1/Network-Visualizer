import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import {
  Router, Wifi, Monitor, Laptop, Server, HardDrive,
  Smartphone, Tablet, Tv, Cast, Gamepad2, Volume2,
  Camera, Lightbulb, Thermometer, Radio, Home, Printer,
  GitBranch, Cpu, Zap,
  Watch, Plug, Lock, Bell, Box, Music2, Film,
  Phone, Glasses, Gamepad2 as GameController,
} from 'lucide-react';
import type { Device, DeviceType } from '../types';
import { DEVICE_CATEGORIES, STATUS_COLORS } from '../types';

// Map device types to lucide icons
const TYPE_ICONS: Record<DeviceType, React.FC<{ size: number; color?: string; strokeWidth?: number }>> = {
  'router':           Router,
  'switch':           GitBranch,
  'access-point':     Wifi,
  'mesh-node':        Wifi,
  'desktop':          Monitor,
  'laptop':           Laptop,
  'server':           Server,
  'nas':              HardDrive,
  'phone':            Smartphone,
  'tablet':           Tablet,
  'tv':               Tv,
  'streaming-stick':  Cast,
  'gaming-console':   Gamepad2,
  'smart-speaker':    Volume2,
  'smart-display':    Tablet,
  'iot-camera':       Camera,
  'iot-light':        Lightbulb,
  'iot-thermostat':   Thermometer,
  'iot-sensor':       Radio,
  'iot-appliance':    Home,
  'printer':          Printer,
  'smart-watch':      Watch,
  'smart-plug':       Plug,
  'smart-lock':       Lock,
  'doorbell':         Bell,
  'cable-box':        Box,
  'home-theater':     Music2,
  'projector':        Film,
  'workstation':      Monitor,
  'mesh-pod':         Wifi,
  'smart-hub':        Cpu,
  'voip-phone':       Phone,
  'vr-headset':       Glasses,
  'ev-charger':       Zap,
  'game-controller':  GameController,
};

// Emoji fallback badge per type — gives instant visual recognition
const TYPE_EMOJI: Partial<Record<DeviceType, string>> = {
  'router':           '📡',
  'switch':           '🔀',
  'access-point':     '📶',
  'mesh-node':        '🌐',
  'desktop':          '🖥️',
  'laptop':           '💻',
  'server':           '🖧',
  'nas':              '💾',
  'phone':            '📱',
  'tablet':           '📟',
  'tv':               '📺',
  'streaming-stick':  '🎬',
  'gaming-console':   '🎮',
  'smart-speaker':    '🔊',
  'iot-camera':       '📷',
  'iot-light':        '💡',
  'iot-thermostat':   '🌡️',
  'iot-sensor':       '📻',
  'iot-appliance':    '🏠',
  'printer':          '🖨️',
  'smart-watch':      '⌚',
  'smart-plug':       '🔌',
  'smart-lock':       '🔒',
  'doorbell':         '🔔',
  'cable-box':        '📦',
  'home-theater':     '🎵',
  'projector':        '🎞️',
  'workstation':      '🖥️',
  'mesh-pod':         '📡',
  'smart-hub':        '🔧',
  'voip-phone':       '☎️',
  'vr-headset':       '🥽',
  'ev-charger':       '⚡',
  'game-controller':  '🕹️',
};

export type DeviceNodeData = {
  device: Device;
};

function DeviceNode({ data, selected }: NodeProps) {
  const d = data as unknown as DeviceNodeData;
  const device = d.device;
  const cat = DEVICE_CATEGORIES[device.category];
  const Icon = TYPE_ICONS[device.type] ?? Cpu;
  const emoji = TYPE_EMOJI[device.type] ?? '📦';
  const statusColor = STATUS_COLORS[device.status];
  const isActive = device.status === 'active';
  const isOffline = device.status === 'offline';
  const isNetwork = device.category === 'network';

  const nodeStyle: React.CSSProperties = {
    borderColor: selected ? '#f8fafc' : isActive ? cat.color : '#334155',
    borderWidth: selected ? 2 : 1,
    opacity: isOffline ? 0.45 : 1,
  };

  return (
    <div className={`dn-card ${isActive ? 'dn-active' : ''} ${isNetwork ? 'dn-network' : ''}`} style={nodeStyle}>
      <Handle type="target" position={Position.Top} className="dn-handle" style={{ background: cat.color }} />

      {/* Pulse ring on active */}
      {isActive && (
        <div className="dn-pulse" style={{ borderColor: cat.color }} />
      )}

      {/* Colored top bar */}
      <div className="dn-topbar" style={{ background: cat.color }} />

      {/* Icon area */}
      <div
        className="dn-icon-wrap"
        style={{
          background: isOffline
            ? 'rgba(55,65,81,0.4)'
            : `linear-gradient(135deg, ${cat.bg} 0%, ${cat.color}22 100%)`,
          borderColor: isOffline ? '#374151' : `${cat.color}55`,
          boxShadow: isActive ? `0 0 14px ${cat.color}44` : 'none',
        }}
      >
        <span className="dn-emoji" title={device.type.replace(/-/g, ' ')}>
          {emoji}
        </span>
        <Icon
          size={18}
          color={isOffline ? '#4b5563' : cat.color}
          strokeWidth={1.8}
        />
      </div>

      {/* Text */}
      <div className="dn-text">
        <div className="dn-name" title={device.name}>{device.name}</div>
        <div className="dn-type">{device.type.replace(/-/g, ' ')}</div>
        {device.brand && <div className="dn-brand">{device.brand}</div>}
      </div>

      {/* Status pill */}
      <div className="dn-status-row">
        <span className="dn-dot" style={{ background: statusColor }} />
        <span className="dn-status-label" style={{ color: statusColor }}>
          {device.status}
        </span>
        {isActive && device.bandwidth && device.bandwidth > 0 && (
          <span className="dn-bw" style={{ color: cat.color }}>
            <Zap size={9} /> {device.bandwidth}Mbps
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="dn-handle" style={{ background: cat.color }} />
    </div>
  );
}

export default memo(DeviceNode);
