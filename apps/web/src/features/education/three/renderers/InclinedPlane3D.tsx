import type { InclinedPlanePlan } from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Experiment3DRendererProps } from "../types";

export function InclinedPlane3D(props: Experiment3DRendererProps<InclinedPlanePlan>) {
  const angleRad = (props.plan.variables.angleDeg * Math.PI) / 180;
  const x = -1.6 + props.playback.progress * 3.2;
  const y = 0.35 + Math.sin(angleRad) * (1 - props.playback.progress);

  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[0, 0, -angleRad]}>
        <boxGeometry args={[4, 0.12, 1.2]} />
        <meshStandardMaterial color="#344054" />
      </mesh>
      <mesh position={[x, y, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color="#5fc7ff" />
      </mesh>
      {props.viewerState.displayLayers.trails ? (
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[3.2, 0.025, 0.025]} />
          <meshStandardMaterial color="#7c88ff" emissive="#1f2aff" emissiveIntensity={0.35} />
        </mesh>
      ) : null}
    </group>
  );
}
