import React, { useMemo } from "react";

import type { Language } from "../../state/auth-store";
import type { PlannedSimulation } from "../../state/simulation-client";
import type { LessonStepId } from "./lesson-flow";
import { createLessonFlow } from "./lesson-flow";
import { deriveFocusedRoles } from "./three/derived-visuals";
import type { ExperimentPlaybackState, ExperimentViewerState } from "./three/types";

const Experiment3DViewer = React.lazy(() => import("./three/Experiment3DViewer"));

export function ThreeCourseLabWorkspace(props: {
  language: Language;
  measurements: Record<string, unknown>;
  playback: ExperimentPlaybackState;
  planned: PlannedSimulation;
}) {
  const activeLessonStep: LessonStepId = props.playback.isRunning
    ? "run"
    : props.playback.progress >= 1
      ? "measure"
      : "predict";
  const lessonFlow = useMemo(
    () =>
      createLessonFlow({
        language: props.language,
        measurements: props.measurements,
        plan: props.planned.plan,
      }),
    [props.language, props.measurements, props.planned.plan],
  );
  const activeLesson = lessonFlow.steps.find((step) => step.id === activeLessonStep);
  const viewerState: ExperimentViewerState = {
    activeStep: activeLessonStep,
    cameraPreset: "default",
    displayLayers: {
      forces: true,
      labels: true,
      measurements: true,
      trails: true,
    },
    focusedRoles: deriveFocusedRoles(
      props.planned.plan.concept,
      activeLesson?.focusRoles ?? ["moving-object"],
    ),
  };

  return (
    <React.Suspense
      fallback={<div className="experiment-3d-fallback">Loading 3D experiment...</div>}
    >
      <Experiment3DViewer
        language={props.language}
        measurements={props.measurements}
        plan={props.planned.plan}
        playback={props.playback}
        viewerState={viewerState}
      />
    </React.Suspense>
  );
}

export default ThreeCourseLabWorkspace;
