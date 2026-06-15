import { useEffect, useRef } from 'react';
import type { Device, DeviceStatus } from '../types';

const ACTIVE_DEVICE_IDS = [
  'router-1', 'switch-1', 'mesh-1', 'mesh-2',
  'tv-1', 'gaming-1', 'phone-1', 'desktop-1', 'laptop-1',
  'nas-1', 'camera-1', 'camera-2',
];

export function useNetworkSimulation(
  _devices: Device[],
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>,
  enabled: boolean
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setDevices(prev =>
        prev.map(device => {
          if (device.status === 'offline') return device;

          const isNetworkDevice = device.category === 'network';
          const canBeActive = ACTIVE_DEVICE_IDS.includes(device.id) || Math.random() < 0.3;

          if (!canBeActive && !isNetworkDevice) return device;

          const roll = Math.random();
          let newStatus: DeviceStatus = device.status;
          let newBandwidth = device.bandwidth ?? 0;

          if (device.status === 'active') {
            if (roll < 0.15) {
              newStatus = 'idle';
              newBandwidth = Math.max(0, newBandwidth * 0.3);
            } else {
              newBandwidth = Math.max(
                1,
                Math.min(500, newBandwidth + (Math.random() - 0.4) * 30)
              );
            }
          } else if (device.status === 'idle' || device.status === 'online') {
            if (roll < 0.25) {
              newStatus = 'active';
              newBandwidth = Math.random() * 50 + 5;
            } else {
              newBandwidth = Math.max(0, newBandwidth * 0.8);
            }
          }

          return { ...device, status: newStatus, bandwidth: Math.round(newBandwidth) };
        })
      );
    }, 2000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, setDevices]);
}
