import React, { useEffect, useRef, useState } from "react";

import { t } from "../../i18n";
import type { Language } from "../../state/auth-store";

export type ExperimentPlayback = {
  isRunning: boolean;
  progress: number;
  progressPercent: number;
  reset: () => void;
  toggle: () => void;
};

export function useExperimentPlayback(durationMs: number, resetDependencies: React.DependencyList): ExperimentPlayback {
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsRunning(false);
    progressRef.current = 0;
    setProgress(0);
  }, resetDependencies);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const startTime = performance.now() - progressRef.current * durationMs;

    function tick(now: number) {
      const nextProgress = Math.min(1, (now - startTime) / durationMs);
      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        setIsRunning(false);
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    }

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [durationMs, isRunning]);

  function reset() {
    setIsRunning(false);
    progressRef.current = 0;
    setProgress(0);
  }

  function toggle() {
    if (progress >= 1) {
      progressRef.current = 0;
      setProgress(0);
    }

    setIsRunning((value) => !value);
  }

  return {
    isRunning,
    progress,
    progressPercent: Math.round(progress * 100),
    reset,
    toggle,
  };
}

export function ExperimentPlaybackControls(props: {
  language: Language;
  playback: ExperimentPlayback;
}) {
  return (
    <div className="button-cluster experiment-playback">
      <button
        className="tool-button tool-button--primary"
        type="button"
        onClick={props.playback.toggle}
      >
        {props.playback.isRunning
          ? t(props.language, "pauseExperiment")
          : t(props.language, "playExperiment")}
      </button>
      <button className="tool-button" type="button" onClick={props.playback.reset}>
        {t(props.language, "resetExperiment")}
      </button>
      <span className="status-inline__meta">
        {t(props.language, "experimentProgress", { value: props.playback.progressPercent })}
      </span>
    </div>
  );
}
