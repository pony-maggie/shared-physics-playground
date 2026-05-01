import React, { useState } from "react";

import { t } from "../../i18n";
import type { Language } from "../../state/auth-store";
import type { AuthSession } from "../../state/auth-store";

export function AuthPanel(props: {
  language: Language;
  session: AuthSession;
  challengePrompt: string | null;
  requestStatus:
    | { kind: "idle" }
    | { kind: "requesting" }
    | { kind: "requested" }
    | { kind: "error"; message: string };
  verifyStatus:
    | { kind: "idle" }
    | { kind: "verifying" }
    | { kind: "error"; message: string };
  devCode: string | null;
  onRequestCode: (email: string, challengeAnswer: string) => void;
  onVerifyCode: (email: string, code: string) => void;
  onLogout: () => void;
}) {
  const [email, setEmail] = useState("");
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [code, setCode] = useState("");
  const language = props.language;

  return (
    <section className="panel">
      <div className="panel-title-row">
        <span className="panel-kicker">{t(language, "authTitle")}</span>
        <h2 className="panel-title">{t(language, "authTitle")}</h2>
        <p className="panel-copy">{t(language, "authCopy")}</p>
      </div>
      {props.session.kind === "authenticated" ? (
        <>
          <p className="feedback-banner">
            {t(language, "signedInAs", { email: props.session.user.email })}
          </p>
          <button className="tool-button" type="button" onClick={props.onLogout}>
            {t(language, "signOut")}
          </button>
        </>
      ) : (
        <>
          <div className="field-stack">
            <label className="data-label" htmlFor="auth-email">
              {t(language, "emailLabel")}
            </label>
            <input
              className="tool-input"
              id="auth-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label className="data-label" htmlFor="auth-challenge">
              {t(language, "challengeLabel")}
            </label>
            <input
              className="tool-input"
              id="auth-challenge"
              placeholder={props.challengePrompt ?? ""}
              value={challengeAnswer}
              onChange={(event) => setChallengeAnswer(event.target.value)}
            />
          </div>
          <button
            className="tool-button"
            type="button"
            onClick={() => props.onRequestCode(email, challengeAnswer)}
          >
            {t(language, "requestCode")}
          </button>
          <div className="field-stack">
            <label className="data-label" htmlFor="auth-code">
              {t(language, "codeLabel")}
            </label>
            <input
              className="tool-input"
              id="auth-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <button
            className="tool-button tool-button--primary"
            type="button"
            onClick={() => props.onVerifyCode(email, code)}
          >
            {t(language, "verifyCode")}
          </button>
          {props.requestStatus.kind === "error" ? (
            <p className="feedback-banner feedback-banner--error">
              {props.requestStatus.message}
            </p>
          ) : null}
          {props.verifyStatus.kind === "error" ? (
            <p className="feedback-banner feedback-banner--error">
              {props.verifyStatus.message}
            </p>
          ) : null}
          {props.devCode ? (
            <p className="feedback-banner">{t(language, "devCode", { code: props.devCode })}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
