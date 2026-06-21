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
  | 'printer'
  | 'smart-watch'
  | 'smart-plug'
  | 'smart-lock'
  | 'doorbell'
  | 'cable-box'
  | 'home-theater'
  | 'projector'
  | 'workstation'
  | 'mesh-pod'
  | 'smart-hub'
  | 'voip-phone'
  | 'vr-headset'
  | 'ev-charger'
  | 'game-controller';

export type DeviceCategory =
  | 'network'
  | 'computer'
  | 'mobile'
  | 'entertainment'
  | 'smart-home'
  | 'peripheral';

export type DeviceStatus = 'online' | 'offline' | 'idle' | 'active';

export type ViewMode = 'topology' | 'by-room' | 'by-type';
export type SortMode = 'name' | 'status' | 'bandwidth' | 'room' | 'type' | 'ip' | 'mac';

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
  hidden?: boolean;
  connectionType?: 'wifi' | 'ethernet';
}

export const DEVICE_CATEGORIES: Record<DeviceCategory, { label: string; color: string; bg: string }> = {
  network:       { label: 'Network',       color: '#00d4ff', bg: 'rgba(0,36,64,0.9)'  },
  computer:      { label: 'Computers',     color: '#4d9fff', bg: 'rgba(0,20,58,0.9)'  },
  mobile:        { label: 'Mobile',        color: '#c04dff', bg: 'rgba(28,0,60,0.9)'  },
  entertainment: { label: 'Entertainment', color: '#ff6b35', bg: 'rgba(44,10,0,0.9)'  },
  'smart-home':  { label: 'Smart Home',    color: '#00ff88', bg: 'rgba(0,36,18,0.9)'  },
  peripheral:    { label: 'Peripherals',   color: '#ffd700', bg: 'rgba(40,28,0,0.9)'  },
};

export const ROOMS = [
  'Network Closet',
  'Living Room',
  'Kitchen',
  'Master Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Office',
  'Game Room',
  'Home Theater',
  'Garage',
  'Backyard',
  'Front Yard',
  'Basement',
  'Dining Room',
  'Laundry Room',
  'WiFi Zone',
  'Unassigned',
];

export const STATUS_COLORS: Record<DeviceStatus, string> = {
  active:  '#00ff88',
  online:  '#00d4ff',
  idle:    '#ff9f1c',
  offline: '#2a3d56',
};
