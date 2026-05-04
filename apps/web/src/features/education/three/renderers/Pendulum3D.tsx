import type { PendulumPlan } from "../../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Experiment3DRendererProps } from "../types";

export function Pendulum3D(props: Experiment3DRendererProps<PendulumPlan>) {
  const amplitude = (props.plan.variables.amplitudeDeg * Math.PI) / 180;
  const theta = amplitude * Math.cos(props.playback.progress * Math.PI * 2);
  const length = 2.2;
  const x = Math.sin(theta) * length;
  const y = 1.2 - Math.cos(theta) * length;

  return (
    <group position={[0, 1.4, 0]}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#f3f5f7" />
      </mesh>
      <mesh position={[x / 2, y / 2, 0]} rotation={[0, 0, -theta]}>
        <boxGeometry args={[0.035, length, 0.035]} />
        <meshStandardMaterial color="#b5bcc8" />
      </mesh>
      <mesh position={[x, y, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color="#5fc7ff" />
      </mesh>
    </group>
  );
}
