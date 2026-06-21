import { memo } from 'react';
import type { EdgeProps } from '@xyflow/react';
import { getBezierPath, BaseEdge } from '@xyflow/react';
import type { DeviceStatus } from '../types';

export type AnimatedEdgeData = {
  status: DeviceStatus;
  bandwidth?: number;
  color?: string;
  animationsEnabled?: boolean;
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

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const strokeWidth = isOffline ? 1 : isActive ? Math.min(4, 1 + bw / 80) : 1.5;
  const strokeColor = isOffline ? '#374151' : isActive ? color : '#334155';
  const animDur = isActive ? Math.max(0.8, 3 - bw / 80) : 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          opacity: isOffline ? 0.3 : 1,
          transition: 'stroke 0.5s, stroke-width 0.5s',
        }}
      />

      {showParticles && (
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
    </>
  );
}

export default memo(AnimatedEdge);
