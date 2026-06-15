export type DeviceType =
  | 'router'
  | 'switch'
  | 'access-point'
  | 'mesh-node'
  | 'desktop'
  | 'laptop'
  | 'server'
  | 'nas'
  | 'phone'
  | 'tablet'
  | 'tv'
  | 'streaming-stick'
  | 'gaming-console'
  | 'smart-speaker'
  | 'smart-display'
  | 'iot-camera'
  | 'iot-light'
  | 'iot-thermostat'
  | 'iot-sensor'
  | 'iot-appliance'
  | 'printer';

export type DeviceCategory =
  | 'network'
  | 'computer'
  | 'mobile'
  | 'entertainment'
  | 'smart-home'
  | 'peripheral';

export type DeviceStatus = 'online' | 'offline' | 'idle' | 'active';

export type ViewMode = 'topology' | 'by-room' | 'by-type';
export type SortMode = 'name' | 'status' | 'bandwidth' | 'room' | 'type';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  category: DeviceCategory;
  room: string;
  ip?: string;
  mac?: string;
  status: DeviceStatus;
  connectedTo: string[];
  brand?: string;
  model?: string;
  bandwidth?: number;
  signalStrength?: number;
}

export const DEVICE_CATEGORIES: Record<DeviceCategory, { label: string; color: string; bg: string }> = {
  network: { label: 'Network', color: '#06b6d4', bg: '#164e63' },
  computer: { label: 'Computers', color: '#3b82f6', bg: '#1e3a5f' },
  mobile: { label: 'Mobile', color: '#a855f7', bg: '#3b0764' },
  entertainment: { label: 'Entertainment', color: '#f97316', bg: '#431407' },
  'smart-home': { label: 'Smart Home', color: '#22c55e', bg: '#14532d' },
  peripheral: { label: 'Peripherals', color: '#eab308', bg: '#422006' },
};

export const ROOMS = [
  'Network Closet',
  'Living Room',
  'Kitchen',
  'Master Bedroom',
  'Office',
  'Backyard',
  'Garage',
  'Guest Room',
];

export const STATUS_COLORS: Record<DeviceStatus, string> = {
  active: '#22c55e',
  online: '#3b82f6',
  idle: '#f59e0b',
  offline: '#6b7280',
};
