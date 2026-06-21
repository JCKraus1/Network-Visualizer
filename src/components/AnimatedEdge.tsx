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
  const color = d?.color ?? '#3b82f6';
  const showParticles = isActive && d?.animationsEnabled !== false;
  const isWireless = d?.isWireless === true;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const strokeWidth = isOffline ? 1 : isActive ? Math.min(4, 1 + bw / 80) : 1.5;
  const strokeColor = isOffline ? '#374151' : isActive ? color : '#334155';
  const animDur = isActive ? Math.max(0.8, 3 - bw / 80) : 2;

  // Wireless: dashed stroke + slow ripple particles
  // Wired: solid stroke + fast flowing particles
  const strokeDasharray = isWireless && !isOffline ? '10 6' : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          opacity: isOffline ? 0.3 : isWireless ? 0.75 : 1,
          strokeDasharray,
          transition: 'stroke 0.5s, stroke-width 0.5s',
        }}
      />

      {showParticles && !isWireless && (
        <>
          {[0, 0.4, 0.8].map((offset, i) => (
            <circle key={i} r={i === 0 ? 4 : 3} fill={color} opacity={i === 0 ? 0.9 : 0.6}>
              <animateMotion
                dur={`${animDur + offset * 0.2}s`}
                repeatCount="indefinite"
                begin={`${-offset * animDur}s`}
                path={edgePath}
                calcMode="linear"
              />
            </circle>
          ))}
        </>
      )}

      {showParticles && isWireless && (
        <>
          {[0, 0.5, 1.0].map((offset, i) => (
            <circle key={i} r={3} fill={color} opacity="0">
              <animateMotion
                dur={`${animDur * 1.8 + offset * 0.3}s`}
                repeatCount="indefinite"
                begin={`${-offset * animDur * 1.8}s`}
                path={edgePath}
                calcMode="linear"
              />
              <animate
                attributeName="opacity"
                values="0;0.8;0.8;0"
                keyTimes="0;0.2;0.7;1"
                dur={`${animDur * 1.8 + offset * 0.3}s`}
                repeatCount="indefinite"
                begin={`${-offset * animDur * 1.8}s`}
              />
              <animate
                attributeName="r"
                values="2;4;2"
                keyTimes="0;0.5;1"
                dur={`${animDur * 1.8 + offset * 0.3}s`}
                repeatCount="indefinite"
                begin={`${-offset * animDur * 1.8}s`}
              />
            </circle>
          ))}
        </>
      )}
    </>
  );
}

export default memo(AnimatedEdge);
