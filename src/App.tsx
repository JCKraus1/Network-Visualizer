import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge, NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Device, DeviceCategory, ViewMode, SortMode } from './types';
import { DEVICE_CATEGORIES, STATUS_COLORS } from './types';
import { useNetworkSimulation } from './hooks/useNetworkSimulation';
import DeviceNode from './components/DeviceNode';
import AnimatedEdge from './components/AnimatedEdge';
import Sidebar from './components/Sidebar';
import DevicePanel from './components/DevicePanel';
import DeviceModal from './components/DeviceModal';
import WelcomeScreen from './components/WelcomeScreen';

const LS_KEY = 'hv-devices';

const nodeTypes = { deviceNode: DeviceNode };
const edgeTypes = { animatedEdge: AnimatedEdge };

// ─── Layout helpers ──────────────────────────────────────────────────────────

function layoutTopology(devices: Device[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();
  const levels: string[][] = [];

  const roots = devices.filter(d => d.connectedTo.length === 0).map(d => d.id);
  let frontier = roots;

  while (frontier.length > 0) {
    levels.push(frontier);
    frontier.forEach(id => visited.add(id));
    const next = devices
      .filter(d => !visited.has(d.id) && d.connectedTo.some(pid => visited.has(pid)))
      .map(d => d.id);
    frontier = next;
  }

  const remaining = devices.filter(d => !visited.has(d.id)).map(d => d.id);
  if (remaining.length > 0) levels.push(remaining);

  const NODE_W = 170;
  const NODE_H = 140;

  levels.forEach((level, li) => {
    const total = level.length;
    level.forEach((id, i) => {
      positions.set(id, {
        x: (i - (total - 1) / 2) * NODE_W,
        y: li * NODE_H,
      });
    });
  });

  return positions;
}

function layoutByGroup(
  devices: Device[],
  groupKey: keyof Device
): {
  nodePositions: Map<string, { x: number; y: number }>;
  groups: Map<string, { x: number; y: number; w: number; h: number }>;
} {
  const nodePositions = new Map<string, { x: number; y: number }>();
  const groups = new Map<string, { x: number; y: number; w: number; h: number }>();

  const buckets = new Map<string, Device[]>();
  devices.forEach(d => {
    const key = String(d[groupKey]);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(d);
  });

  const COLS = 3;
  const NODE_W = 155;
  const NODE_H = 115;
  const PAD = 24;
  const GROUP_GAP_X = 60;
  const GROUP_GAP_Y = 60;
  const HEADER_H = 36;

  const keys = [...buckets.keys()].sort();

  let gx = 0;
  let gy = 0;
  let maxH = 0;
  const perRow = 3;

  keys.forEach((key, gi) => {
    const devicesInGroup = buckets.get(key)!;
    const cols = Math.min(COLS, devicesInGroup.length);
    const rows = Math.ceil(devicesInGroup.length / cols);
    const w = cols * NODE_W + PAD * 2;
    const h = rows * NODE_H + PAD * 2 + HEADER_H;

    if (gi > 0 && gi % perRow === 0) {
      gy += maxH + GROUP_GAP_Y;
      gx = 0;
      maxH = 0;
    }

    groups.set(key, { x: gx, y: gy, w, h });
    maxH = Math.max(maxH, h);

    devicesInGroup.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      nodePositions.set(d.id, {
        x: gx + PAD + col * NODE_W,
        y: gy + PAD + HEADER_H + row * NODE_H,
      });
    });

    gx += w + GROUP_GAP_X;
  });

  return { nodePositions, groups };
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [devices, setDevices] = useState<Device[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return JSON.parse(stored) as Device[];
    } catch { /* ignore parse errors */ }
    return [];
  });
  const [viewMode, setViewMode] = useState<ViewMode>('topology');
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [filterRooms, setFilterRooms] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<DeviceCategory[]>([]);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [editingDevice, setEditingDevice] = useState<Device | null | undefined>(undefined);
  const [showImport, setShowImport] = useState(false);

  // Persist to localStorage whenever devices change
  useEffect(() => {
    if (devices.length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(devices));
    }
  }, [devices]);

  const handleImport = (imported: Device[]) => {
    setDevices(imported);
    setShowImport(false);
    setSelectedDeviceId(undefined);
  };

  useNetworkSimulation(devices, setDevices, animationsEnabled);

  const visibleDevices = useMemo(() => {
    return devices.filter(d => {
      const roomOk = filterRooms.length === 0 || filterRooms.includes(d.room);
      const catOk = filterCategories.length === 0 || filterCategories.includes(d.category);
      return roomOk && catOk;
    });
  }, [devices, filterRooms, filterCategories]);

  const { rfNodes, rfEdges } = useMemo(() => {
    let positions: Map<string, { x: number; y: number }>;
    let groupNodes: Node[] = [];

    if (viewMode === 'topology') {
      positions = layoutTopology(visibleDevices);
    } else if (viewMode === 'by-room') {
      const { nodePositions, groups } = layoutByGroup(visibleDevices, 'room');
      positions = nodePositions;
      groupNodes = [...groups.entries()].map(([room, rect]) => ({
        id: `group-room-${room}`,
        type: 'default',
        position: { x: rect.x - 12, y: rect.y - 12 },
        data: { label: room },
        style: {
          width: rect.w + 24,
          height: rect.h + 24,
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid #1e293b',
          borderRadius: 14,
          zIndex: -1,
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        },
        draggable: false,
        selectable: false,
      }));
    } else {
      const { nodePositions, groups } = layoutByGroup(visibleDevices, 'category');
      positions = nodePositions;
      groupNodes = [...groups.entries()].map(([cat, rect]) => {
        const catInfo = DEVICE_CATEGORIES[cat as DeviceCategory];
        return {
          id: `group-cat-${cat}`,
          type: 'default',
          position: { x: rect.x - 12, y: rect.y - 12 },
          data: { label: catInfo?.label ?? cat },
          style: {
            width: rect.w + 24,
            height: rect.h + 24,
            background: catInfo ? `${catInfo.bg}cc` : 'rgba(15,23,42,0.8)',
            border: `1px solid ${catInfo?.color ?? '#334155'}44`,
            borderRadius: 14,
            zIndex: -1,
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 700,
            color: catInfo?.color ?? '#94a3b8',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          },
          draggable: false,
          selectable: false,
        };
      });
    }

    const visibleIds = new Set(visibleDevices.map(d => d.id));

    const rfNodes: Node[] = [
      ...groupNodes,
      ...visibleDevices.map(d => ({
        id: d.id,
        type: 'deviceNode',
        position: positions.get(d.id) ?? { x: 0, y: 0 },
        data: { device: d, selected: d.id === selectedDeviceId } as unknown as Record<string, unknown>,
        selected: d.id === selectedDeviceId,
      })),
    ];

    const rfEdges: Edge[] = [];
    visibleDevices.forEach(d => {
      d.connectedTo.forEach(pid => {
        if (!visibleIds.has(pid)) return;
        const parent = devices.find(x => x.id === pid);
        const cat = DEVICE_CATEGORIES[d.category];
        const edgeStatus =
          d.status === 'offline'
            ? 'offline'
            : parent?.status === 'active' || d.status === 'active'
            ? 'active'
            : d.status;
        rfEdges.push({
          id: `${pid}-${d.id}`,
          source: pid,
          target: d.id,
          type: 'animatedEdge',
          data: {
            status: edgeStatus,
            bandwidth: d.bandwidth,
            color: cat.color,
          } as unknown as Record<string, unknown>,
        });
      });
    });

    return { rfNodes, rfEdges };
  }, [visibleDevices, viewMode, selectedDeviceId, devices]);

  const [, , onNodesChange] = useNodesState(rfNodes);
  const [, , onEdgesChange] = useEdgesState(rfEdges);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    if (node.type === 'deviceNode') {
      setSelectedDeviceId(prev => (prev === node.id ? undefined : node.id));
    }
  }, []);

  const onPaneClick = useCallback(() => setSelectedDeviceId(undefined), []);

  const selectedDevice = selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) : undefined;

  const handleSaveDevice = (device: Device) => {
    setDevices(prev => {
      const idx = prev.findIndex(d => d.id === device.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = device;
        return next;
      }
      return [...prev, device];
    });
    setEditingDevice(undefined);
  };

  const totalBandwidth = devices
    .filter(d => d.status === 'active')
    .reduce((s, d) => s + (d.bandwidth ?? 0), 0);

  if (devices.length === 0 || showImport) {
    return <WelcomeScreen onImport={handleImport} />;
  }

  return (
    <div className="app">
      <Sidebar
        devices={visibleDevices}
        viewMode={viewMode}
        sortMode={sortMode}
        filterRooms={filterRooms}
        filterCategories={filterCategories}
        animationsEnabled={animationsEnabled}
        onViewMode={setViewMode}
        onSortMode={setSortMode}
        onFilterRooms={setFilterRooms}
        onFilterCategories={setFilterCategories}
        onToggleAnimations={() => setAnimationsEnabled(e => !e)}
        onAddDevice={() => setEditingDevice(null)}
        onSelectDevice={id => setSelectedDeviceId(prev => (prev === id ? undefined : id))}
        selectedDeviceId={selectedDeviceId}
      />

      <main className="main">
        <div className="topbar">
          <div className="topbar-title">
            <span>Home Network Visualizer</span>
            <span className="topbar-sub">
              {viewMode === 'topology'
                ? 'Network Topology'
                : viewMode === 'by-room'
                ? 'By Room'
                : 'By Device Type'}
            </span>
          </div>
          <div className="topbar-stats">
            <span className="tbstat">
              <span className="tbval">{Math.round(totalBandwidth)}</span> Mbps total
            </span>
            <span className="tbstat">
              <span className="tbval" style={{ color: '#22c55e' }}>
                {devices.filter(d => d.status === 'active').length}
              </span>{' '}
              active
            </span>
            <span className="tbstat">
              <span className="tbval" style={{ color: '#6b7280' }}>
                {devices.filter(d => d.status === 'offline').length}
              </span>{' '}
              offline
            </span>
          </div>
          <div className="legend">
            {(Object.entries(DEVICE_CATEGORIES) as [string, typeof DEVICE_CATEGORIES[DeviceCategory]][]).map(
              ([cat, info]) => (
                <span key={cat} className="legend-item">
                  <span className="legend-dot" style={{ background: info.color }} />
                  {info.label}
                </span>
              )
            )}
          </div>
          <button className="rescan-btn" onClick={() => setShowImport(true)} title="Import a new network scan">
            ↺ Re-import Scan
          </button>
        </div>

        <div className="graph-container">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={24} size={1} />
            <Controls style={{ background: '#1e293b', border: '1px solid #334155' }} />
            <MiniMap
              nodeColor={n => {
                const d = devices.find(x => x.id === n.id);
                if (!d) return '#1e293b';
                return STATUS_COLORS[d.status];
              }}
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
              maskColor="rgba(0,0,0,0.5)"
            />
          </ReactFlow>
        </div>

        {selectedDevice && (
          <DevicePanel
            device={selectedDevice}
            allDevices={devices}
            onClose={() => setSelectedDeviceId(undefined)}
            onEdit={d => setEditingDevice(d)}
          />
        )}
      </main>

      {editingDevice !== undefined && (
        <DeviceModal
          device={editingDevice}
          allDevices={devices}
          onSave={handleSaveDevice}
          onClose={() => setEditingDevice(undefined)}
        />
      )}
    </div>
  );
}
