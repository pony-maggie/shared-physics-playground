import React, { useEffect, useState } from "react";

import { AuthPanel } from "./features/auth/AuthPanel";
import { InclinedPlaneExperiment } from "./features/education/InclinedPlaneExperiment";
import { PhysicsQuestionPanel } from "./features/education/PhysicsQuestionPanel";
import { t } from "./i18n";
import { useAuthStore, type Language } from "./state/auth-store";
import { useSimulationClient, type SimulationStatus } from "./state/simulation-client";

const PricingPage = React.lazy(() => import("./features/billing/PricingPage"));

type PublicSnapshot = {
  snapshotId: string;
  title: string;
  imageDataUrl: string;
  objectCount: number;
  createdAt: string;
};

function LanguageToggle(props: { language: Language; onLanguageChange: (language: Language) => void }) {
  return (
    <div className="language-toggle" role="group" aria-label="Language switcher">
      <button
        className={`tool-button tool-button--utility${props.language === "en" ? " tool-button--active" : ""}`}
        type="button"
        onClick={() => props.onLanguageChange("en")}
      >
        EN
      </button>
      <button
        className={`tool-button tool-button--utility${props.language === "zh-CN" ? " tool-button--active" : ""}`}
        type="button"
        onClick={() => props.onLanguageChange("zh-CN")}
      >
        中文
      </button>
    </div>
  );
}

function SnapshotPage(props: {
  language: Language;
  snapshot: PublicSnapshot | null;
  onLanguageChange: (language: Language) => void;
}) {
  if (!props.snapshot) {
    return (
      <main className="app-shell app-shell--lab">
        <section aria-label="Public Snapshot" className="panel public-snapshot-panel">
          <div className="snapshot-loading">{t(props.language, "sceneBooting")}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell app-shell--lab">
      <section aria-label="Status Bar" className="status-bar status-bar--lab">
        <div className="status-hero">
          <span className="status-kicker">{t(props.language, "savedSnapshot")}</span>
          <h1 className="status-title">{props.snapshot.title}</h1>
          <p className="status-subtitle">{t(props.language, "guestReadOnly")}</p>
        </div>
        <section aria-label="Language" className="status-group status-group--compact">
          <span className="status-kicker">{t(props.language, "language")}</span>
          <LanguageToggle language={props.language} onLanguageChange={props.onLanguageChange} />
        </section>
      </section>
      <section aria-label="Public Snapshot" className="panel public-snapshot-panel">
        <div className="panel-title-row">
          <span className="panel-kicker">{t(props.language, "savedSnapshot")}</span>
          <h2 className="panel-title">{props.snapshot.title}</h2>
          <p className="panel-copy">
            {t(props.language, "roomObjectsValue", {
              count: props.snapshot.objectCount,
              limit: props.snapshot.objectCount,
            })}
          </p>
        </div>
        <img
          alt={props.snapshot.title}
          className="public-snapshot-image"
          src={props.snapshot.imageDataUrl}
        />
      </section>
    </main>
  );
}

function TemplateSuggestionsPanel(props: {
  language: Language;
  status: Extract<SimulationStatus, { kind: "suggestions" }>;
  onSelect: (concept: Extract<SimulationStatus, { kind: "suggestions" }>["suggestions"][number]["concept"]) => void;
}) {
  return (
    <section aria-label="Experiment Suggestions" className="panel experiment-suggestions-panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(props.language, "experiment")}</span>
        <h2 className="panel-title">{t(props.language, "closestExperiments")}</h2>
        <p className="panel-copy">{props.status.message}</p>
      </div>
      <div className="suggestion-list">
        {props.status.suggestions.map((suggestion) => (
          <article className="suggestion-item" key={suggestion.concept}>
            <div>
              <h3 className="group-title">{suggestion.title}</h3>
              <p className="panel-copy">{suggestion.reason}</p>
            </div>
            <button
              className="tool-button tool-button--primary tool-button--utility"
              type="button"
              onClick={() => props.onSelect(suggestion.concept)}
            >
              {t(props.language, "useExperiment", { title: suggestion.title })}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [publicSnapshot, setPublicSnapshot] = useState<PublicSnapshot | null>(null);
  const requestedPathname = typeof globalThis.window !== "undefined" ? globalThis.window.location.pathname : "/";
  const requestedPricingPage = requestedPathname === "/pricing";
  const requestedSnapshotId =
    typeof globalThis.window !== "undefined"
      ? new URLSearchParams(globalThis.window.location.search).get("snapshot")
      : null;
  const initializeAuth = useAuthStore((state) => state.initialize);
  const session = useAuthStore((state) => state.session);
  const language = useAuthStore((state) => state.language);
  const challenge = useAuthStore((state) => state.challenge);
  const requestStatus = useAuthStore((state) => state.requestStatus);
  const verifyStatus = useAuthStore((state) => state.verifyStatus);
  const devCode = useAuthStore((state) => state.devCode);
  const setLanguage = useAuthStore((state) => state.setLanguage);
  const requestCode = useAuthStore((state) => state.requestCode);
  const verifyCode = useAuthStore((state) => state.verifyCode);
  const logout = useAuthStore((state) => state.logout);
  const plannedSimulation = useSimulationClient((state) => state.planned);
  const simulationStatus = useSimulationClient((state) => state.status);
  const planSimulation = useSimulationClient((state) => state.plan);
  const loadLocalInclinedPlaneDemo = useSimulationClient((state) => state.loadLocalInclinedPlaneDemo);
  const updateSimulationVariables = useSimulationClient((state) => state.updateVariables);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (typeof globalThis.window === "undefined" || typeof globalThis.fetch !== "function") {
      return;
    }

    const snapshotId = requestedSnapshotId;

    if (!snapshotId) {
      setPublicSnapshot(null);
      return;
    }

    let active = true;
    void globalThis.fetch(`/api/snapshots/${encodeURIComponent(snapshotId)}`)
      .then(async (response) => (response.ok ? ((await response.json()) as PublicSnapshot) : null))
      .then((snapshot) => {
        if (active) {
          setPublicSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (active) {
          setPublicSnapshot(null);
        }
      });

    return () => {
      active = false;
    };
  }, [requestedSnapshotId]);

  useEffect(() => {
    if (session.kind === "authenticated") {
      setAuthOpen(false);
    }
  }, [session.kind]);

  useEffect(() => {
    if (!requestedPricingPage && session.kind === "anonymous" && !plannedSimulation) {
      loadLocalInclinedPlaneDemo();
    }
  }, [loadLocalInclinedPlaneDemo, plannedSimulation, requestedPricingPage, session.kind]);

  if (requestedSnapshotId) {
    return (
      <SnapshotPage
        language={language}
        snapshot={publicSnapshot}
        onLanguageChange={setLanguage}
      />
    );
  }

  if (requestedPricingPage) {
    return (
      <React.Suspense fallback={null}>
        <PricingPage
          language={language}
          session={session}
          onLanguageChange={setLanguage}
        />
      </React.Suspense>
    );
  }

  return (
    <main className="app-shell app-shell--lab">
      <section aria-label="Status Bar" className="status-bar status-bar--lab">
        <div className="status-hero">
          <span className="status-kicker">{t(language, "sharedRoom")}</span>
          <h1 className="status-title">{t(language, "productName")}</h1>
          <p className="status-subtitle">{t(language, "shellSubtitle")}</p>
        </div>
        <section aria-label="Account" className="status-group status-group--compact">
          <span className="status-kicker">{t(language, "language")}</span>
          <div className="status-links status-links--stacked">
            <div className="utility-strip">
              <LanguageToggle language={language} onLanguageChange={setLanguage} />
              <a className="tool-button tool-button--utility" href="/pricing">
                {language === "zh-CN" ? "套餐" : "Pricing"}
              </a>
              {session.kind === "authenticated" ? (
                <div className="session-chip">
                  <span className="session-email">{session.user.email}</span>
                  <button
                    className="tool-button tool-button--utility"
                    type="button"
                    onClick={() => {
                      void logout();
                    }}
                  >
                    {t(language, "signOut")}
                  </button>
                </div>
              ) : (
                <button
                  aria-expanded={authOpen}
                  className="tool-button tool-button--utility auth-trigger"
                  type="button"
                  onClick={() => setAuthOpen((value) => !value)}
                >
                  {t(language, "authTitle")}
                </button>
              )}
            </div>
            {authOpen && session.kind !== "authenticated" ? (
              <div className="auth-popover">
                <AuthPanel
                  challengePrompt={challenge?.prompt ?? null}
                  devCode={devCode}
                  language={language}
                  onLogout={() => {
                    void logout();
                  }}
                  onRequestCode={(email, challengeAnswer) => {
                    void requestCode(email, challengeAnswer);
                  }}
                  onVerifyCode={(email, code) => {
                    void verifyCode(email, code);
                  }}
                  requestStatus={requestStatus}
                  session={session}
                  verifyStatus={verifyStatus}
                />
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <div className="physics-lab-layout">
        <PhysicsQuestionPanel
          disabledReason={session.kind === "authenticated" ? null : t(language, "signInToGenerate")}
          language={language}
          status={simulationStatus}
          onPlan={(question) => {
            void planSimulation(question, {
              authToken: session.kind === "authenticated" ? session.authToken : null,
            });
          }}
        />
        <div className="experiment-column">
          {simulationStatus.kind === "suggestions" ? (
            <TemplateSuggestionsPanel
              language={language}
              status={simulationStatus}
              onSelect={(selectedConcept) => {
                void planSimulation(simulationStatus.question, {
                  authToken: session.kind === "authenticated" ? session.authToken : null,
                  selectedConcept,
                });
              }}
            />
          ) : null}
          {plannedSimulation ? (
            <InclinedPlaneExperiment
              language={language}
              planned={plannedSimulation}
              onVariablesChange={updateSimulationVariables}
            />
          ) : (
            <section aria-label="Generated Experiment" className="panel experiment-panel experiment-panel--empty">
              <div className="panel-title-row">
                <span className="panel-kicker">{t(language, "experiment")}</span>
                <h2 className="panel-title">{t(language, "emptyExperimentTitle")}</h2>
                <p className="panel-copy">{t(language, "emptyExperimentCopy")}</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
