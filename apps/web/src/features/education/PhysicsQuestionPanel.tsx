import React, { useState } from "react";

import { t } from "../../i18n";
import type { Language } from "../../state/auth-store";
import type { SimulationStatus } from "../../state/simulation-client";

const ExperimentPromptCloud = React.lazy(() => import("./ExperimentPromptCloud"));

export function PhysicsQuestionPanel(props: {
  language: Language;
  disabledReason?: string | null;
  onPlan: (question: string) => void;
  status: SimulationStatus;
}) {
  const [question, setQuestion] = useState("");
  const isPlanning = props.status.kind === "planning";
  const isDisabled = isPlanning || Boolean(props.disabledReason);

  return (
    <section aria-label="Physics Lab" className="panel physics-question-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">Physics</span>
        <h2 className="panel-title">{t(props.language, "physicsLabTitle")}</h2>
        <p className="panel-copy">{t(props.language, "physicsLabCopy")}</p>
      </div>
      <div className="field-stack">
        <label className="data-label" htmlFor="physics-question">
          {t(props.language, "physicsQuestion")}
        </label>
        <input
          className="tool-input"
          disabled={isDisabled}
          id="physics-question"
          placeholder={t(props.language, "physicsQuestionPlaceholder")}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </div>
      <button
        className="tool-button tool-button--primary"
        disabled={isDisabled}
        type="button"
        onClick={() => props.onPlan(question)}
      >
        {isPlanning
          ? t(props.language, "generatingExperiment")
          : t(props.language, "generateExperiment")}
      </button>
      <React.Suspense fallback={<div className="prompt-cloud prompt-cloud--loading" />}>
        <ExperimentPromptCloud
          language={props.language}
          onSelectQuestion={(nextQuestion) => setQuestion(nextQuestion)}
        />
      </React.Suspense>
      {props.status.kind === "error" ? (
        <p className="feedback-banner feedback-banner--error">{props.status.message}</p>
      ) : null}
      {props.disabledReason ? (
        <p className="feedback-banner">{props.disabledReason}</p>
      ) : null}
    </section>
  );
}
