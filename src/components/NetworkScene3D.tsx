import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Device, DeviceCategory, DeviceStatus } from '../types';
import { useTheme, useCategoryColors, useStatusColors } from '../contexts/ThemeContext';
import type { ThemeCategory } from '../themes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NetworkScene3DProps {
  devices: Device[];
  selectedDeviceId?: string;
  onSelectDevice: (id: string) => void;
  animationsEnabled: boolean;
}

type Position3D = [number, number, number];
type CatColors = Record<DeviceCategory, ThemeCategory>;
type StatusColors = Record<DeviceStatus, string>;

// ─── Emoji map ────────────────────────────────────────────────────────────────

const DEVICE_EMOJI: Record<string, string> = {
  router: '🌐',
  switch: '🔀',
  'access-point': '📡',
  'mesh-node': '🕸️',
  desktop: '🖥️',
  laptop: '💻',
  server: '🖧',
  nas: '💾',
  phone: '📱',
  tablet: '📋',
  tv: '📺',
  'streaming-stick': '🎬',
  'gaming-console': '🎮',
  'smart-speaker': '🔊',
  'smart-display': '🖼️',
  'iot-camera': '📷',
  'iot-light': '💡',
  'iot-thermostat': '🌡️',
  'iot-sensor': '📻',
  'iot-appliance': '🏠',
  printer: '🖨️',
  'smart-watch': '⌚',
  'smart-plug': '🔌',
  'smart-lock': '🔒',
  doorbell: '🔔',
  'cable-box': '📦',
  'home-theater': '🎭',
  projector: '📽️',
  workstation: '🖥️',
  'mesh-pod': '🕸️',
  'smart-hub': '🏠',
  'voip-phone': '☎️',
  'vr-headset': '🥽',
  'ev-charger': '⚡',
  'game-controller': '🕹️',
};

// ─── 3D Layout ────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function compute3DLayout(devices: Device[]): Map<string, Position3D> {
  const positions = new Map<string, Position3D>();
  if (devices.length === 0) return positions;

  // Find router or use first device as root
  const root = devices.find(d => d.type === 'router') ?? devices[0];

  // BFS to compute hop depth
  const depthMap = new Map<string, number>();
  const queue: Array<{ id: string; depth: number }> = [{ id: root.id, depth: 0 }];
  depthMap.set(root.id, 0);

  const adjList = new Map<string, string[]>();
  devices.forEach(d => {
    if (!adjList.has(d.id)) adjList.set(d.id, []);
    d.connectedTo.forEach(targetId => {
      adjList.get(d.id)!.push(targetId);
      if (!adjList.has(targetId)) adjList.set(targetId, []);
      adjList.get(targetId)!.push(d.id);
    });
  });

  while (queue.length > 0) {
    const item = queue.shift()!;
    const neighbors = adjList.get(item.id) ?? [];
    for (const neighborId of neighbors) {
      if (!depthMap.has(neighborId)) {
        depthMap.set(neighborId, item.depth + 1);
        queue.push({ id: neighborId, depth: item.depth + 1 });
      }
    }
  }

  // Assign depth to disconnected devices
  devices.forEach(d => {
    if (!depthMap.has(d.id)) depthMap.set(d.id, 4);
  });

  // Group devices by depth
  const byDepth = new Map<number, string[]>();
  depthMap.forEach((depth, id) => {
    if (!byDepth.has(depth)) byDepth.set(depth, []);
    byDepth.get(depth)!.push(id);
  });

  // Compute positions
  byDepth.forEach((ids, depth) => {
    if (depth === 0) {
      positions.set(ids[0], [0, 0, 0]);
      return;
    }

    const radius =
      depth === 1 ? 280 :
      depth === 2 ? 520 :
      depth === 3 ? 720 :
      900 + (depth - 4) * 150;

    const y =
      depth === 1 ? 0 :
      depth === 2 ? -40 :
      depth === 3 ? -80 :
      -120;

    const count = ids.length;
    ids.forEach((id, i) => {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Deterministic Z jitter based on device id hash
      const jitter = (Math.abs(hashStr(id)) % 80) - 40;
      positions.set(id, [x, y, z + jitter]);
    });
  });

  return positions;
}

// ─── Connection Beam ──────────────────────────────────────────────────────────

interface ConnectionBeamProps {
  from: Position3D;
  to: Position3D;
  color: string;
  status: DeviceStatus;
  animationsEnabled: boolean;
}

function ConnectionBeam({ from, to, color, status, animationsEnabled }: ConnectionBeamProps) {
  const t1Ref = useRef<number>(Math.random());
  const t2Ref = useRef<number>(Math.max(0, Math.random() - 0.15));

  const sphere1Ref = useRef<THREE.Mesh>(null);
  const sphere2Ref = useRef<THREE.Mesh>(null);

  const isOffline = status === 'offline';
  const isActive = status === 'active';

  // Build bezier curve points
  const curvePoints = useMemo((): Position3D[] => {
    const mid: Position3D = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 60,
      (from[2] + to[2]) / 2,
    ];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...to),
    );
    return curve.getPoints(20).map(p => [p.x, p.y, p.z] as Position3D);
  }, [from, to]);

  const lineOpacity = isOffline ? 0.08 : isActive ? 0.5 : 0.2;

  useFrame((_, delta) => {
    if (!animationsEnabled || !isActive) return;
    const speed = 0.4;
    t1Ref.current = (t1Ref.current + delta * speed) % 1;
    t2Ref.current = (t2Ref.current + delta * speed) % 1;

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2 + 60,
        (from[2] + to[2]) / 2,
      ),
      new THREE.Vector3(...to),
    );

    if (sphere1Ref.current) {
      const pos = curve.getPoint(t1Ref.current);
      sphere1Ref.current.position.copy(pos);
    }
    if (sphere2Ref.current) {
      const t2 = Math.max(0, t1Ref.current - 0.06);
      const pos = curve.getPoint(t2);
      sphere2Ref.current.position.copy(pos);
    }
  });

  return (
    <group>
      <Line
        points={curvePoints}
        color={color}
        lineWidth={1}
        transparent
        opacity={lineOpacity}
      />
      {animationsEnabled && isActive && (
        <>
          <mesh ref={sphere1Ref} position={from}>
            <sphereGeometry args={[5, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
          <mesh ref={sphere2Ref} position={from}>
            <sphereGeometry args={[2.5, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        </>
      )}
    </group>
  );
}

// ─── Device Node 3D ───────────────────────────────────────────────────────────

interface DeviceNode3DProps {
  device: Device;
  position: Position3D;
  selected: boolean;
  onSelect: (id: string) => void;
  catColors: CatColors;
  statusColors: StatusColors;
}

function DeviceNode3D({ device, position, selected, onSelect, catColors, statusColors }: DeviceNode3DProps) {
  const [x, y, z] = position;
  const catColor = catColors[device.category]?.color ?? '#00d4ff';
  const statusColor = statusColors[device.status] ?? '#00d4ff';
  const emoji = DEVICE_EMOJI[device.type] ?? '📦';

  const borderColor = selected
    ? 'rgba(255,255,255,0.6)'
    : `${catColor}66`;

  const boxShadow = selected
    ? `0 0 20px ${catColor}80, 0 0 40px ${catColor}30`
    : `0 0 12px ${catColor}33`;

  return (
    <group position={[x, y, z]}>
      {/* Glow orb sphere behind the card */}
      <mesh position={[0, 0, -2]}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshBasicMaterial color={catColor} transparent opacity={0.15} />
      </mesh>

      <Html center distanceFactor={280}>
        <div
          onClick={() => onSelect(device.id)}
          style={{
            width: 130,
            background: 'var(--bg-card, rgba(3,11,24,0.96))',
            border: `1px solid ${borderColor}`,
            borderRadius: 10,
            boxShadow,
            padding: '8px 10px',
            cursor: 'pointer',
            userSelect: 'none',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Emoji + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 11,
                  color: 'var(--text-bright, #daeeff)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {device.name}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--text-dim, #304a64)',
                  textTransform: 'capitalize',
                  marginTop: 1,
                }}
              >
                {device.type.replace(/-/g, ' ')}
              </div>
            </div>
          </div>

          {/* Status dot row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 5px ${statusColor}`,
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 9, color: 'var(--text-dim, #304a64)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {device.status}
            </span>
            {device.bandwidth != null && device.bandwidth > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 9, color: catColor, fontWeight: 700 }}>
                {Math.round(device.bandwidth)}M
              </span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  devices: Device[];
  selectedId?: string;
  onSelectDevice: (id: string) => void;
  animationsEnabled: boolean;
}

function Scene({ devices, selectedId, onSelectDevice, animationsEnabled }: SceneProps) {
  const positions = useMemo(() => compute3DLayout(devices), [devices]);
  const catColors = useCategoryColors();
  const statusColors = useStatusColors();
  const { theme } = useTheme();

  const bgColor = theme.cssVars['--bg-void'] ?? '#010810';

  // De-duplicate edges using sorted key
  const edges = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{
      key: string;
      device: Device;
      targetId: string;
      from: Position3D;
      to: Position3D;
    }> = [];

    devices.forEach(device => {
      device.connectedTo.forEach(targetId => {
        const edgeKey = [device.id, targetId].sort().join('--');
        if (seen.has(edgeKey)) return;
        seen.add(edgeKey);

        const from = positions.get(device.id);
        const to = positions.get(targetId);
        if (!from || !to) return;

        result.push({ key: edgeKey, device, targetId, from, to });
      });
    });

    return result;
  }, [devices, positions]);

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 200, 100]} color="#00d4ff" intensity={2} />
      <pointLight position={[-400, -100, -200]} color="#c04dff" intensity={1} />

      <Stars radius={1200} depth={80} count={4000} factor={5} saturation={0} fade speed={0.3} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={200}
        maxDistance={2500}
      />

      {/* Grid floor */}
      <gridHelper args={[3000, 60, '#0a2040', '#061828']} position={[0, -200, 0]} />

      {/* Device nodes */}
      {devices.map(device => {
        const pos = positions.get(device.id);
        if (!pos) return null;
        return (
          <DeviceNode3D
            key={device.id}
            device={device}
            position={pos}
            selected={selectedId === device.id}
            onSelect={onSelectDevice}
            catColors={catColors}
            statusColors={statusColors}
          />
        );
      })}

      {/* Connection beams */}
      {edges.map(({ key, device, from, to }) => (
        <ConnectionBeam
          key={key}
          from={from}
          to={to}
          color={catColors[device.category]?.color ?? '#00d4ff'}
          status={device.status}
          animationsEnabled={animationsEnabled}
        />
      ))}
    </>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function NetworkScene3D({
  devices,
  selectedDeviceId,
  onSelectDevice,
  animationsEnabled,
}: NetworkScene3DProps) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: [0, 300, 900], fov: 55 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <Scene
          devices={devices}
          selectedId={selectedDeviceId}
          onSelectDevice={onSelectDevice}
          animationsEnabled={animationsEnabled}
        />
        <EffectComposer>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={1.8} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
