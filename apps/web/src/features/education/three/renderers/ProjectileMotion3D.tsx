import type { ProjectileMotionPlan } from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Experiment3DRendererProps } from "../types";

export function ProjectileMotion3D(props: Experiment3DRendererProps<ProjectileMotionPlan>) {
  const angle = (props.plan.variables.launchAngleDeg * Math.PI) / 180;
  const progress = props.playback.progress;
  const x = -2 + progress * 4;
  const y = 0.2 + Math.sin(angle) * 2.4 * Math.sin(progress * Math.PI);

  return (
    <group>
      <mesh position={[-2.2, 0.12, 0]}>
        <boxGeometry args={[0.35, 0.24, 0.35]} />
        <meshStandardMaterial color="#9ef0b8" />
      </mesh>
      {props.viewerState.displayLayers.trails ? (
        <mesh position={[0, 1.1, 0]}>
          <torusGeometry args={[1.65, 0.012, 8, 48, Math.PI]} />
          <meshStandardMaterial color="#7c88ff" emissive="#1f2aff" emissiveIntensity={0.35} />
        </mesh>
      ) : null}
      <mesh position={[x, y, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#5fc7ff" />
      </mesh>
    </group>
  );
}
