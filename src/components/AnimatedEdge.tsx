import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { getBezierPath, BaseEdge } from '@xyflow/react';
import type { DeviceStatus } from '../types';

export type AnimatedEdgeData = {
  status: DeviceStatus;
  bandwidth?: number;
  color?: string;
  animationsEnabled?: boolean;
  isWireless?: boolean;
};

function AnimatedEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data,
}: EdgeProps) {
  const d = data as unknown as AnimatedEdgeData;
  const isActive = d?.status === 'active';
  const isOffline = d?.status === 'offline';
  const bw = d?.bandwidth ?? 0;
  const color = d?.color ?? '#00d4ff';
  const showParticles = isActive && d?.animationsEnabled !== false;
  const isWireless = d?.isWireless === true;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const strokeWidth = isOffline ? 0.8 : isActive ? Math.min(2.5, 1 + bw / 120) : 1;
  const strokeColor = isOffline ? '#111c2e' : isActive ? color : '#0d1f36';
  const animDur = isActive ? Math.max(0.8, 2.5 - bw / 100) : 2;
  const edgeFilter = isActive && !isOffline ? `drop-shadow(0 0 2px ${color}66)` : 'none';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          opacity: isOffline ? 0.2 : isWireless ? 0.55 : 0.8,
          strokeDasharray: isWireless && !isOffline ? '9 7' : undefined,
          filter: edgeFilter,
          transition: 'stroke 0.5s, stroke-width 0.5s',
        }}
      />

      {/* ── Wired: 2 orb trains (lead + tail) ──────────── */}
      {showParticles && !isWireless && (
        <>
          {[0, 0.5].map((offset) => {
            const begin = `${-(offset * animDur)}s`;
            const beginTail = `${-(offset * animDur + 0.12)}s`;
            return (
              <g key={offset}>
                <circle
                  r={4}
                  fill={color}
                  opacity={0}
                  style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                >
                  <animateMotion dur={`${animDur}s`} repeatCount="indefinite" begin={begin} path={edgePath} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.06;0.9;1" dur={`${animDur}s`} repeatCount="indefinite" begin={begin} />
                </circle>
                <circle r={1.8} fill={color} opacity={0}>
                  <animateMotion dur={`${animDur}s`} repeatCount="indefinite" begin={beginTail} path={edgePath} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0.3;0.3;0" keyTimes="0;0.06;0.9;1" dur={`${animDur}s`} repeatCount="indefinite" begin={beginTail} />
                </circle>
              </g>
            );
          })}
        </>
      )}

      {/* ── Wireless: 2 expanding ring pulses ──────────── */}
      {showParticles && isWireless && (
        <>
          {[0, 0.6].map((offset) => {
            const dur = animDur * 2;
            const begin = `${-(offset * dur)}s`;
            return (
              <g key={offset}>
                <circle r={0} fill="none" stroke={color} strokeWidth={1.2} opacity={0}>
                  <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={begin} path={edgePath} calcMode="linear" />
                  <animate attributeName="r" values="1;8;1" keyTimes="0;0.5;1" dur={`${dur}s`} repeatCount="indefinite" begin={begin} />
                  <animate attributeName="opacity" values="0;0.7;0" keyTimes="0;0.25;1" dur={`${dur}s`} repeatCount="indefinite" begin={begin} />
                </circle>
                <circle r={2.5} fill={color} opacity={0}>
                  <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={begin} path={edgePath} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.08;0.85;1" dur={`${dur}s`} repeatCount="indefinite" begin={begin} />
                </circle>
              </g>
            );
          })}
        </>
      )}
    </>
  );
}

export default memo(AnimatedEdge);
