import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import type { SimulationPlan } from "../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Language } from "../../../state/auth-store";
import type { ExperimentPlaybackState, ExperimentViewerState } from "./types";

export function Experiment3DViewer(props: {
  language: Language;
  plan: SimulationPlan;
  measurements: Record<string, unknown>;
  playback: ExperimentPlaybackState;
  viewerState: ExperimentViewerState;
}) {
  return (
    <section
      aria-label="3D Experiment Viewer"
      className="experiment-3d-viewer"
      data-active-step={props.viewerState.activeStep}
      data-concept={props.plan.concept}
      data-focused-roles={props.viewerState.focusedRoles.join(",")}
      data-testid="experiment-3d-viewer"
    >
      <div className="experiment-3d-viewer__header">
        <span className="panel-kicker">3D Lab</span>
        <h2 className="panel-title">{props.plan.title}</h2>
      </div>
      <div className="experiment-3d-viewer__canvas">
        <Canvas camera={{ fov: 45, position: [4, 3, 5] }}>
          <ambientLight intensity={0.8} />
          <directionalLight intensity={1.2} position={[3, 5, 4]} />
          <gridHelper args={[8, 8]} />
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#5fc7ff" />
          </mesh>
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>
    </section>
  );
}

export default Experiment3DViewer;
