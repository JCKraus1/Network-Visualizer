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

  const strokeWidth = isOffline ? 0.8 : isActive ? Math.min(3, 1 + bw / 100) : 1;
  const strokeColor = isOffline ? '#111c2e' : isActive ? color : '#0d1f36';
  const animDur = isActive ? Math.max(0.7, 2.5 - bw / 100) : 2;

  // Glowing edge line via CSS drop-shadow
  const edgeFilter = isActive && !isOffline
    ? `drop-shadow(0 0 3px ${color}88)`
    : 'none';

  return (
    <>
      {/* Base edge line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          opacity: isOffline ? 0.2 : isWireless ? 0.6 : 0.85,
          strokeDasharray: isWireless && !isOffline ? '9 7' : undefined,
          filter: edgeFilter,
          transition: 'stroke 0.5s, stroke-width 0.5s',
        }}
      />

      {/* ── Wired: 3 glowing orb trains ────────────────── */}
      {showParticles && !isWireless && (
        <>
          {[0, 0.34, 0.67].map((offset) => {
            const begin = `${-(offset * animDur)}s`;
            return (
              <g key={offset}>
                {/* Lead orb — bright, large, full glow */}
                <circle
                  r={4.5}
                  fill={color}
                  opacity={0}
                  style={{ filter: `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 14px ${color}88)` }}
                >
                  <animateMotion dur={`${animDur}s`} repeatCount="indefinite" begin={begin} path={edgePath} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.05;0.92;1" dur={`${animDur}s`} repeatCount="indefinite" begin={begin} />
                </circle>
                {/* Mid trail — softer */}
                <circle
                  r={3}
                  fill={color}
                  opacity={0}
                  style={{ filter: `drop-shadow(0 0 4px ${color}99)` }}
                >
                  <animateMotion dur={`${animDur}s`} repeatCount="indefinite" begin={`${-(offset * animDur + 0.09)}s`} path={edgePath} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0.55;0.55;0" keyTimes="0;0.05;0.92;1" dur={`${animDur}s`} repeatCount="indefinite" begin={`${-(offset * animDur + 0.09)}s`} />
                </circle>
                {/* Tail — dim */}
                <circle
                  r={1.8}
                  fill={color}
                  opacity={0}
                >
                  <animateMotion dur={`${animDur}s`} repeatCount="indefinite" begin={`${-(offset * animDur + 0.18)}s`} path={edgePath} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0.25;0.25;0" keyTimes="0;0.05;0.92;1" dur={`${animDur}s`} repeatCount="indefinite" begin={`${-(offset * animDur + 0.18)}s`} />
                </circle>
              </g>
            );
          })}
        </>
      )}

      {/* ── Wireless: expanding ring pulses ────────────── */}
      {showParticles && isWireless && (
        <>
          {[0, 0.5, 1.0].map((offset) => {
            const dur = animDur * 2;
            const begin = `${-(offset * dur)}s`;
            return (
              <g key={offset}>
                {/* Expanding ring */}
                <circle
                  r={0}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.2}
                  opacity={0}
                  style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
                >
                  <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={begin} path={edgePath} calcMode="linear" />
                  <animate attributeName="r" values="1;9;1" keyTimes="0;0.5;1" dur={`${dur}s`} repeatCount="indefinite" begin={begin} />
                  <animate attributeName="opacity" values="0;0.8;0" keyTimes="0;0.25;1" dur={`${dur}s`} repeatCount="indefinite" begin={begin} />
                  <animate attributeName="stroke-width" values="2;0.5;0" keyTimes="0;0.7;1" dur={`${dur}s`} repeatCount="indefinite" begin={begin} />
                </circle>
                {/* Center dot */}
                <circle
                  r={2.5}
                  fill={color}
                  opacity={0}
                  style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                >
                  <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={begin} path={edgePath} calcMode="linear" />
                  <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.08;0.85;1" dur={`${dur}s`} repeatCount="indefinite" begin={begin} />
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
