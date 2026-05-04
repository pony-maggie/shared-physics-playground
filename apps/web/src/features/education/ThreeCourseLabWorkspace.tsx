import React, { useMemo, useState } from "react";

import type { Language } from "../../state/auth-store";
import type { PlannedSimulation } from "../../state/simulation-client";
import type { LessonStepId } from "./lesson-flow";
import { createLessonFlow } from "./lesson-flow";
import { LessonRail } from "./LessonRail";
import { deriveFocusedRoles } from "./three/derived-visuals";
import type { ExperimentPlaybackState, ExperimentViewerState } from "./three/types";

const Experiment3DViewer = React.lazy(() => import("./three/Experiment3DViewer"));

export function ThreeCourseLabWorkspace(props: {
  language: Language;
  measurements: Record<string, unknown>;
  onVariablesChange: (variables: Record<string, number>) => void;
  playback: ExperimentPlaybackState;
  planned: PlannedSimulation;
}) {
  const [activeLessonStep, setActiveLessonStep] = useState<LessonStepId>("predict");
  const [focusedRoles, setFocusedRoles] = useState<ExperimentViewerState["focusedRoles"]>([
    "moving-object",
  ]);
  const lessonFlow = useMemo(
    () =>
      createLessonFlow({
        language: props.language,
        measurements: props.measurements,
        plan: props.planned.plan,
      }),
    [props.language, props.measurements, props.planned.plan],
  );
  const viewerState: ExperimentViewerState = {
    activeStep: activeLessonStep,
    cameraPreset: "default",
    displayLayers: {
      forces: true,
      labels: true,
      measurements: true,
      trails: true,
    },
    focusedRoles,
  };

  return (
    <>
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
      <LessonRail
        activeStep={activeLessonStep}
        flow={lessonFlow}
        language={props.language}
        measurements={props.measurements}
        onStepChange={(stepId, nextFocusedRoles) => {
          setActiveLessonStep(stepId);
          setFocusedRoles(deriveFocusedRoles(props.planned.plan.concept, nextFocusedRoles));
        }}
        onVariation={(variables) => {
          props.onVariablesChange(variables);
          props.playback.reset();
        }}
      />
    </>
  );
}

export default ThreeCourseLabWorkspace;
