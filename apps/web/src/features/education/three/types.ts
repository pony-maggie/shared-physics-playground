import type { SimulationPlan } from "../../../../../../packages/prompt-contracts/src/simulation-spec";
import type { Language } from "../../../state/auth-store";
import type { LessonStepId } from "../lesson-flow";

export type ExperimentObjectRole =
  | "moving-object"
  | "path"
  | "force-vector"
  | "measurement-line"
  | "surface"
  | "source"
  | "target"
  | "field"
  | "component";

export type ExperimentDisplayLayers = {
  trails: boolean;
  forces: boolean;
  measurements: boolean;
  labels: boolean;
};

export type ExperimentCameraPreset = "default" | "top" | "side" | "focus";

export type ExperimentViewerState = {
  activeStep: LessonStepId;
  cameraPreset: ExperimentCameraPreset;
  displayLayers: ExperimentDisplayLayers;
  focusedRoles: ExperimentObjectRole[];
};

export type ExperimentPlaybackState = {
  isRunning: boolean;
  progress: number;
  progressPercent: number;
  play: () => void;
  pause: () => void;
  reset: () => void;
};

export type Experiment3DRendererProps<TPlan extends SimulationPlan = SimulationPlan> = {
  language: Language;
  plan: TPlan;
  measurements: Record<string, unknown>;
  playback: ExperimentPlaybackState;
  viewerState: ExperimentViewerState;
  registerObject: (role: ExperimentObjectRole, object: object | null) => void;
};
