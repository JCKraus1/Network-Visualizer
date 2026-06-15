import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import {
  Router, Network, Wifi, Monitor, Laptop, Server, HardDrive,
  Smartphone, Tablet, Tv, Cast, Gamepad2, Speaker,
  Camera, Lightbulb, Thermometer, Radio, Home, Printer,
} from 'lucide-react';
import type { Device, DeviceType } from '../types';
import { DEVICE_CATEGORIES, STATUS_COLORS } from '../types';

const TYPE_ICONS: Record<DeviceType, React.FC<{ size: number; color?: string }>> = {
  'router': Router,
  'switch': Network,
  'access-point': Wifi,
  'mesh-node': Wifi,
  'desktop': Monitor,
  'laptop': Laptop,
  'server': Server,
  'nas': HardDrive,
  'phone': Smartphone,
  'tablet': Tablet,
  'tv': Tv,
  'streaming-stick': Cast,
  'gaming-console': Gamepad2,
  'smart-speaker': Speaker,
  'smart-display': Tablet,
  'iot-camera': Camera,
  'iot-light': Lightbulb,
  'iot-thermostat': Thermometer,
  'iot-sensor': Radio,
  'iot-appliance': Home,
  'printer': Printer,
};

export type DeviceNodeData = {
  device: Device;
  selected?: boolean;
};

function DeviceNode({ data, selected }: NodeProps) {
  const d = data as unknown as DeviceNodeData;
  const device = d.device;
  const cat = DEVICE_CATEGORIES[device.category];
  const Icon = TYPE_ICONS[device.type] ?? Monitor;
  const statusColor = STATUS_COLORS[device.status];
  const isActive = device.status === 'active';
  const isOffline = device.status === 'offline';

  return (
    <div
      className="device-node"
      style={{
        background: isOffline ? '#1a1a2e' : cat.bg,
        borderColor: selected ? '#f8fafc' : isActive ? cat.color : '#334155',
        borderWidth: selected ? 2 : 1,
        opacity: isOffline ? 0.5 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: cat.color, width: 8, height: 8 }} />

      {/* Pulse ring when active */}
      {isActive && (
        <div className="pulse-ring" style={{ borderColor: cat.color }} />
      )}

      <div className="node-icon" style={{ background: isOffline ? '#374151' : `${cat.color}22`, borderColor: `${cat.color}44` }}>
        <Icon size={20} color={isOffline ? '#6b7280' : cat.color} />
      </div>

      <div className="node-label">
        <span className="node-name">{device.name}</span>
        <span className="node-type">{device.type.replace(/-/g, ' ')}</span>
      </div>

      <div className="node-status" style={{ background: statusColor }} title={device.status} />

      {isActive && device.bandwidth && device.bandwidth > 0 && (
        <div className="node-bandwidth" style={{ color: cat.color }}>
          {device.bandwidth} Mbps
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: cat.color, width: 8, height: 8 }} />
    </div>
  );
}

export default memo(DeviceNode);
