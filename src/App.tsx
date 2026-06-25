import { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import type { Node, Edge, NodeMouseHandler, OnNodeDrag } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Device, DeviceCategory, ViewMode, SortMode } from './types';
import { ROOMS } from './types';
import { useTheme, useCategoryColors, useStatusColors } from './contexts/ThemeContext';
import { useNetworkSimulation } from './hooks/useNetworkSimulation';
import DeviceNode from './components/DeviceNode';
import AnimatedEdge from './components/AnimatedEdge';
import Sidebar from './components/Sidebar';
import DevicePanel from './components/DevicePanel';
import DeviceModal from './components/DeviceModal';
import WelcomeScreen from './components/WelcomeScreen';

const NetworkScene3D = lazy(() => import('./components/NetworkScene3D'));

const LS_KEY = 'hv-devices';
const LS_ROOMS_KEY = 'hv-rooms';
const LS_GROUP_POS_KEY = 'hv-group-positions';

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
  const { theme } = useTheme();
  const categoryColors = useCategoryColors();
  const statusColors = useStatusColors();

  const [devices, setDevices] = useState<Device[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return JSON.parse(stored) as Device[];
    } catch { /* ignore parse errors */ }
    return [];
  });

  const [customRooms, setCustomRooms] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LS_ROOMS_KEY);
      if (stored) return JSON.parse(stored) as string[];
    } catch { /* ignore */ }
    return [];
  });

  const [groupPositions, setGroupPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const stored = localStorage.getItem(LS_GROUP_POS_KEY);
      if (stored) return JSON.parse(stored) as Record<string, { x: number; y: number }>;
    } catch { /* ignore */ }
    return {};
  });

  // Stable refs so callbacks don't go stale
  const groupPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const devicesRef = useRef<Device[]>([]);
  useEffect(() => { groupPositionsRef.current = groupPositions; }, [groupPositions]);
  useEffect(() => { devicesRef.current = devices; }, [devices]);

  const allRooms = useMemo(() => [...ROOMS, ...customRooms], [customRooms]);

  const [viewMode, setViewMode] = useState<ViewMode>('topology');
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [filterRooms, setFilterRooms] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<DeviceCategory[]>([]);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [is3D, setIs3D] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [editingDevice, setEditingDevice] = useState<Device | null | undefined>(undefined);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (devices.length > 0) localStorage.setItem(LS_KEY, JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    localStorage.setItem(LS_ROOMS_KEY, JSON.stringify(customRooms));
  }, [customRooms]);

  useEffect(() => {
    localStorage.setItem(LS_GROUP_POS_KEY, JSON.stringify(groupPositions));
  }, [groupPositions]);

  const handleAddRoom = useCallback((name: string) => {
    setCustomRooms(prev => prev.includes(name) ? prev : [...prev, name]);
  }, []);

  const handleDeleteRoom = useCallback((name: string) => {
    setCustomRooms(prev => prev.filter(r => r !== name));
  }, []);

  const handleImport = (imported: Device[]) => {
    setDevices(imported);
    setShowImport(false);
    setSelectedDeviceId(undefined);
  };

  const handleToggleAnimations = useCallback(() => {
    setAnimationsEnabled(prev => {
      if (prev) {
        setDevices(d => d.map(dev => dev.status === 'active' ? { ...dev, status: 'online' } : dev));
      }
      return !prev;
    });
  }, []);

  const handleDownloadJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(devices, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-network.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [devices]);

  const handleHideDevice = useCallback((id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, hidden: true } : d));
    setSelectedDeviceId(prev => prev === id ? undefined : prev);
  }, []);

  const handleShowDevice = useCallback((id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, hidden: false } : d));
  }, []);

  const handleDeleteDevice = useCallback((id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    setSelectedDeviceId(prev => prev === id ? undefined : prev);
  }, []);

  useNetworkSimulation(devices, setDevices, animationsEnabled);

  const visibleDevices = useMemo(() => {
    return devices.filter(d => {
      if (d.hidden === true) return false;
      const roomOk = filterRooms.length === 0 || filterRooms.includes(d.room);
      const catOk = filterCategories.length === 0 || filterCategories.includes(d.category);
      return roomOk && catOk;
    });
  }, [devices, filterRooms, filterCategories]);

  const groupRectsRef = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({});

  const { rfNodes, rfEdges } = useMemo(() => {
    let positions: Map<string, { x: number; y: number }>;
    let groupNodes: Node[] = [];
    // Maps groupId → delta applied to devices in that group
    const groupDeltas = new Map<string, { x: number; y: number }>();

    if (viewMode === 'topology') {
      positions = layoutTopology(visibleDevices);
    } else if (viewMode === 'by-room') {
      const { nodePositions, groups } = layoutByGroup(visibleDevices, 'room');
      positions = nodePositions;

      // Build groupRectsRef using actual (stored) positions so drag-to-room works after moves
      const newRects: Record<string, { x: number; y: number; w: number; h: number }> = {};

      groupNodes = [...groups.entries()].map(([room, rect]) => {
        const groupId = `group-room-${room}`;
        const defaultPos = { x: rect.x - 12, y: rect.y - 12 };
        const storedPos = groupPositions[groupId];
        const pos = storedPos ?? defaultPos;
        const delta = { x: pos.x - defaultPos.x, y: pos.y - defaultPos.y };
        groupDeltas.set(groupId, delta);

        // Store actual rect for drag-to-room detection
        newRects[room] = {
          x: pos.x + 12,
          y: pos.y + 12,
          w: rect.w,
          h: rect.h,
        };

        const isWifi = room === 'WiFi Zone';
        const neonPrimary = theme.cssVars['--neon-primary'] ?? '#00d4ff';
        return {
          id: groupId,
          type: 'default',
          position: pos,
          data: { label: isWifi ? '📶 WiFi Zone' : room },
          style: isWifi ? {
            width: rect.w + 24,
            height: rect.h + 24,
            background: `radial-gradient(ellipse at 20% 30%, ${neonPrimary}1a 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, ${neonPrimary}14 0%, transparent 45%), var(--bg-dark, rgba(0,10,24,0.75))`,
            border: `1.5px dashed ${neonPrimary}4d`,
            borderRadius: 20,
            zIndex: -1,
            padding: '10px 14px',
            fontSize: 11,
            fontWeight: 700,
            color: `${neonPrimary}99`,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
          } : {
            width: rect.w + 24,
            height: rect.h + 24,
            background: 'var(--bg-dark, rgba(2,8,20,0.7))',
            border: `1px solid ${neonPrimary}14`,
            borderRadius: 14,
            zIndex: -1,
            padding: '10px 14px',
            fontSize: 11,
            fontWeight: 700,
            color: `${neonPrimary}59`,
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
          },
          draggable: true,
          selectable: false,
        };
      });

      groupRectsRef.current = newRects;
    } else {
      const { nodePositions, groups } = layoutByGroup(visibleDevices, 'category');
      positions = nodePositions;

      groupNodes = [...groups.entries()].map(([cat, rect]) => {
        const groupId = `group-cat-${cat}`;
        const defaultPos = { x: rect.x - 12, y: rect.y - 12 };
        const storedPos = groupPositions[groupId];
        const pos = storedPos ?? defaultPos;
        const delta = { x: pos.x - defaultPos.x, y: pos.y - defaultPos.y };
        groupDeltas.set(groupId, delta);

        const catInfo = categoryColors[cat as DeviceCategory];
        return {
          id: groupId,
          type: 'default',
          position: pos,
          data: { label: catInfo?.label ?? cat },
          style: {
            width: rect.w + 24,
            height: rect.h + 24,
            background: catInfo ? `${catInfo.bg}` : 'rgba(2,8,20,0.7)',
            border: `1px solid ${catInfo?.color ?? 'rgba(0,212,255,0.08)'}33`,
            borderRadius: 14,
            zIndex: -1,
            padding: '10px 14px',
            fontSize: 11,
            fontWeight: 700,
            color: catInfo ? `${catInfo.color}88` : 'rgba(0,212,255,0.3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
          },
          draggable: true,
          selectable: false,
        };
      });
    }

    const visibleIds = new Set(visibleDevices.map(d => d.id));

    const rfNodes: Node[] = [
      ...groupNodes,
      ...visibleDevices.map(d => {
        const layoutPos = positions.get(d.id) ?? { x: 0, y: 0 };
        // Apply the group's stored position delta so devices follow their room
        const groupId = viewMode === 'by-room'
          ? `group-room-${d.room}`
          : viewMode === 'by-type'
          ? `group-cat-${d.category}`
          : null;
        const delta = groupId ? (groupDeltas.get(groupId) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
        return {
          id: d.id,
          type: 'deviceNode',
          position: { x: layoutPos.x + delta.x, y: layoutPos.y + delta.y },
          data: { device: d, selected: d.id === selectedDeviceId } as unknown as Record<string, unknown>,
          selected: d.id === selectedDeviceId,
        };
      }),
    ];

    const rfEdges: Edge[] = [];
    visibleDevices.forEach(d => {
      d.connectedTo.forEach(pid => {
        if (!visibleIds.has(pid)) return;
        const parent = devices.find(x => x.id === pid);
        const cat = categoryColors[d.category];
        const edgeStatus =
          d.status === 'offline'
            ? 'offline'
            : parent?.status === 'active' || d.status === 'active'
            ? 'active'
            : d.status;
        const isWireless = d.connectionType === 'wifi' || d.room === 'WiFi Zone';
        rfEdges.push({
          id: `${pid}-${d.id}`,
          source: pid,
          target: d.id,
          type: 'animatedEdge',
          data: {
            status: edgeStatus,
            bandwidth: d.bandwidth,
            color: cat.color,
            animationsEnabled,
            isWireless,
          } as unknown as Record<string, unknown>,
        });
      });
    });

    return { rfNodes, rfEdges };
  }, [visibleDevices, viewMode, selectedDeviceId, devices, animationsEnabled, groupPositions, categoryColors, statusColors, theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const prevViewMode = useRef<ViewMode>(viewMode);

  useEffect(() => {
    const viewChanged = prevViewMode.current !== viewMode;
    prevViewMode.current = viewMode;
    setNodes(prevN =>
      rfNodes.map(newNode => {
        const existing = prevN.find(p => p.id === newNode.id);
        return !viewChanged && existing
          ? { ...newNode, position: existing.position }
          : newNode;
      })
    );
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, viewMode, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    if (node.type === 'deviceNode') {
      setSelectedDeviceId(prev => (prev === node.id ? undefined : node.id));
    }
  }, []);

  const onPaneClick = useCallback(() => setSelectedDeviceId(undefined), []);

  const handleNodeDragStop: OnNodeDrag = useCallback((_evt, node: Node) => {
    const isGroup = node.id.startsWith('group-room-') || node.id.startsWith('group-cat-');

    if (isGroup) {
      const groupId = node.id;
      const newPos = node.position;
      const oldPos = groupPositionsRef.current[groupId];

      // Shift all device nodes that belong to this group by the movement delta
      if (oldPos) {
        const dx = newPos.x - oldPos.x;
        const dy = newPos.y - oldPos.y;
        if (dx !== 0 || dy !== 0) {
          setNodes(prevNodes => prevNodes.map(n => {
            if (n.type !== 'deviceNode') return n;
            const dev = devicesRef.current.find(d => d.id === n.id);
            if (!dev) return n;
            const devGroupId = groupId.startsWith('group-room-')
              ? `group-room-${dev.room}`
              : `group-cat-${dev.category}`;
            if (devGroupId !== groupId) return n;
            return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
          }));
        }
      }

      // Persist new group position
      setGroupPositions(prev => ({ ...prev, [groupId]: newPos }));

      // Update groupRectsRef so drag-to-room detection reflects the new position
      if (groupId.startsWith('group-room-')) {
        const room = groupId.slice('group-room-'.length);
        const oldRect = groupRectsRef.current[room];
        if (oldRect) {
          groupRectsRef.current[room] = {
            ...oldRect,
            x: newPos.x + 12,
            y: newPos.y + 12,
          };
        }
      }
      return;
    }

    // Device node drag — detect room from drop position (by-room only)
    if (node.type !== 'deviceNode' || viewMode !== 'by-room') return;
    const rects = groupRectsRef.current;
    for (const [room, rect] of Object.entries(rects)) {
      const cx = node.position.x + 74;
      const cy = node.position.y + 60;
      if (
        cx >= rect.x - 12 && cx <= rect.x + rect.w + 12 &&
        cy >= rect.y - 12 && cy <= rect.y + rect.h + 12
      ) {
        setDevices(prev => prev.map(d => d.id === node.id ? { ...d, room } : d));
        break;
      }
    }
  }, [viewMode, setNodes]);

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
        allDevices={devices}
        viewMode={viewMode}
        sortMode={sortMode}
        filterRooms={filterRooms}
        filterCategories={filterCategories}
        animationsEnabled={animationsEnabled}
        rooms={allRooms}
        onViewMode={setViewMode}
        onSortMode={setSortMode}
        onFilterRooms={setFilterRooms}
        onFilterCategories={setFilterCategories}
        onToggleAnimations={handleToggleAnimations}
        onAddDevice={() => setEditingDevice(null)}
        onSelectDevice={id => setSelectedDeviceId(prev => (prev === id ? undefined : id))}
        onShowDevice={handleShowDevice}
        onAddRoom={handleAddRoom}
        onDeleteRoom={handleDeleteRoom}
        onDownload={handleDownloadJSON}
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
          <button
            className={`view-3d-btn${is3D ? ' active' : ''}`}
            onClick={() => setIs3D(v => !v)}
            title={is3D ? 'Switch to 2D view' : 'Switch to 3D view'}
          >
            {is3D ? '2D' : '3D'}
          </button>
          <div className="legend">
            {(Object.entries(categoryColors) as [string, { label: string; color: string; bg: string }][]).map(
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
          {is3D ? (
            <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#00d4ff', fontSize: 14 }}>Loading 3D…</div>}>
              <NetworkScene3D
                devices={visibleDevices}
                selectedDeviceId={selectedDeviceId ?? undefined}
                onSelectDevice={setSelectedDeviceId}
                animationsEnabled={animationsEnabled}
              />
            </Suspense>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onNodeDragStop={handleNodeDragStop}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Lines} color={theme.gridColor} gap={40} lineWidth={0.5} />
              <Controls style={{ background: '#1e293b', border: '1px solid #334155' }} />
              <MiniMap
                nodeColor={n => {
                  const d = devices.find(x => x.id === n.id);
                  if (!d) return '#1e293b';
                  return statusColors[d.status];
                }}
                style={{ background: '#0f172a', border: '1px solid #1e293b' }}
                maskColor="rgba(0,0,0,0.5)"
              />
            </ReactFlow>
          )}
        </div>

        {selectedDevice && (
          <DevicePanel
            device={selectedDevice}
            allDevices={devices}
            onClose={() => setSelectedDeviceId(undefined)}
            onEdit={d => setEditingDevice(d)}
            onHide={handleHideDevice}
            onDelete={handleDeleteDevice}
          />
        )}
      </main>

      {editingDevice !== undefined && (
        <DeviceModal
          device={editingDevice}
          allDevices={devices}
          rooms={allRooms}
          onSave={handleSaveDevice}
          onClose={() => setEditingDevice(undefined)}
        />
      )}
    </div>
  );
}
