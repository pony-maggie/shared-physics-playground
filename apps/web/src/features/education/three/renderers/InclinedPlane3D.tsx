import type { InclinedPlanePlan } from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Experiment3DRendererProps } from "../types";

export function createInclinedPlane3DLayout(input: { angleDeg: number; progress: number }) {
  const progress = Math.max(0, Math.min(1, input.progress));
  const rampRotationZ = (-input.angleDeg * Math.PI) / 180;
  const ballPosition: [number, number, number] = [-1.45 + progress * 2.9, 0.28, 0];

  return {
    ballPosition,
    rampRotationZ,
    showTrailLine: false,
  };
}

export function InclinedPlane3D(props: Experiment3DRendererProps<InclinedPlanePlan>) {
  const layout = createInclinedPlane3DLayout({
    angleDeg: props.plan.variables.angleDeg,
    progress: props.playback.progress,
  });

  return (
    <group rotation={[0, 0, layout.rampRotationZ]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 0.12, 1.2]} />
        <meshStandardMaterial color="#344054" />
      </mesh>
      <mesh position={layout.ballPosition}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#5fc7ff" />
      </mesh>
    </group>
  );
}
