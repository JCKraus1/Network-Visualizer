import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import {
  Router, Wifi, Monitor, Laptop, Server, HardDrive,
  Smartphone, Tablet, Tv, Cast, Gamepad2, Volume2,
  Camera, Lightbulb, Thermometer, Radio, Home, Printer,
  GitBranch, Cpu, Zap, Network,
  Watch, Plug, Lock, Bell, Box, Music2, Film,
  Phone, Glasses, Gamepad2 as GameController,
} from 'lucide-react';
import type { Device, DeviceType } from '../types';
import { useCategoryColors, useStatusColors } from '../contexts/ThemeContext';

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

export type DeviceNodeData = { device: Device };

function DeviceNode({ data, selected }: NodeProps) {
  const categoryColors = useCategoryColors();
  const statusColors = useStatusColors();
  const d = data as unknown as DeviceNodeData;
  const device = d.device;
  const cat = categoryColors[device.category];
  const Icon = TYPE_ICONS[device.type] ?? Cpu;
  const emoji = TYPE_EMOJI[device.type] ?? '📦';
  const statusColor = statusColors[device.status];
  const isActive = device.status === 'active';
  const isOffline = device.status === 'offline';
  const isNetwork = device.category === 'network';
  const connType = device.connectionType;

  const borderColor = selected
    ? 'rgba(255,255,255,0.6)'
    : isActive
    ? `${cat.color}66`
    : 'rgba(0,212,255,0.1)';

  const nodeStyle: React.CSSProperties = {
    borderColor,
    borderWidth: selected ? 1.5 : 1,
    opacity: isOffline ? 0.4 : 1,
  };

  return (
    <div
      className={`dn-card ${isActive ? 'dn-active' : ''} ${isNetwork ? 'dn-network' : ''}`}
      style={nodeStyle}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="dn-handle"
        style={{ background: cat.color, boxShadow: `0 0 8px ${cat.color}` }}
      />

      {/* Active pulse ring */}
      {isActive && (
        <div className="dn-pulse" style={{ borderColor: `${cat.color}55` }} />
      )}

      {/* Category gradient top bar */}
      <div
        className="dn-topbar"
        style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}66, transparent)` }}
      />

      {/* Connection type badge */}
      {connType && (
        <div
          className="dn-conn-badge"
          title={connType === 'wifi' ? 'WiFi' : 'Ethernet'}
          style={{
            background: connType === 'wifi' ? 'rgba(0,36,64,0.9)' : 'rgba(20,16,0,0.9)',
            borderColor: connType === 'wifi' ? 'rgba(0,212,255,0.5)' : 'rgba(255,215,0,0.4)',
            color: connType === 'wifi' ? '#00d4ff' : '#ffd700',
          }}
        >
          {connType === 'wifi'
            ? <Wifi size={9} strokeWidth={2.5} />
            : <Network size={9} strokeWidth={2.5} />}
        </div>
      )}

      {/* Circular icon area */}
      <div
        className="dn-icon-wrap"
        style={{
          background: isOffline
            ? 'rgba(8,16,28,0.8)'
            : `radial-gradient(circle, ${cat.bg} 0%, rgba(2,8,18,0.9) 100%)`,
          borderColor: isOffline ? '#0d1f36' : `${cat.color}55`,
          boxShadow: isOffline
            ? 'none'
            : isActive
            ? `0 0 16px ${cat.color}55, inset 0 0 12px ${cat.color}22`
            : `0 0 8px ${cat.color}22`,
        }}
      >
        <span className="dn-emoji" title={device.type.replace(/-/g, ' ')}>
          {emoji}
        </span>
        <Icon
          size={16}
          color={isOffline ? '#1a2a3a' : cat.color}
          strokeWidth={1.6}
        />
      </div>

      {/* Text */}
      <div className="dn-text">
        <div className="dn-name" title={device.name}>{device.name}</div>
        <div className="dn-type">{device.type.replace(/-/g, ' ')}</div>
        {device.brand && <div className="dn-brand">{device.brand}</div>}
      </div>

      {/* Status row */}
      <div className="dn-status-row">
        <span
          className="dn-dot"
          style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
        />
        <span className="dn-status-label" style={{ color: statusColor }}>
          {device.status}
        </span>
        {isActive && device.bandwidth && device.bandwidth > 0 && (
          <span className="dn-bw" style={{ color: cat.color }}>
            <Zap size={9} /> {device.bandwidth}Mbps
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="dn-handle"
        style={{ background: cat.color, boxShadow: `0 0 8px ${cat.color}` }}
      />
    </div>
  );
}

export default memo(DeviceNode);
