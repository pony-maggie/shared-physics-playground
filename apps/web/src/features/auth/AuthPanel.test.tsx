// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AuthPanel } from "./AuthPanel";
import type { AuthSession } from "../../state/auth-store";

const guestSession: AuthSession = { kind: "anonymous" };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AuthPanel", () => {
  test("shows clear feedback while a verification code is being sent", () => {
    render(
      <AuthPanel
        challengePrompt="1 + 2 = ?"
        devCode={null}
        language="en"
        onLogout={() => {}}
        onRequestCode={() => {}}
        onVerifyCode={() => {}}
        requestStatus={{ kind: "requesting" }}
        session={guestSession}
        verifyStatus={{ kind: "idle" }}
      />,
    );

    const button = screen.getByRole("button", { name: "Sending..." });

    expect(button.hasAttribute("disabled")).toBe(true);
  });

  test("confirms when a verification code has been sent", () => {
    render(
      <AuthPanel
        challengePrompt="1 + 2 = ?"
        devCode={null}
        language="zh-CN"
        onLogout={() => {}}
        onRequestCode={() => {}}
        onVerifyCode={() => {}}
        requestStatus={{ kind: "requested" }}
        session={guestSession}
        verifyStatus={{ kind: "idle" }}
      />,
    );

    expect(screen.getByText("验证码已发送，请查看邮箱；10 分钟内有效。")).toBeTruthy();
  });
});
