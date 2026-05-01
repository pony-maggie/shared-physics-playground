import { create } from "zustand";

import type { UserAccessPolicy } from "../../../../packages/shared/src/access-policy";

export type Language = "en" | "zh-CN";

export type AuthUser = {
  userId: string;
  email: string;
  access: UserAccessPolicy;
};

export type AuthSession =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "authenticated"; authToken: string; user: AuthUser };

type AuthChallenge = {
  challengeId: string;
  prompt: string;
};

type AuthRequestStatus =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "requested" }
  | { kind: "error"; message: string };

type AuthVerifyStatus =
  | { kind: "idle" }
  | { kind: "verifying" }
  | { kind: "error"; message: string };

type AuthStoreState = {
  initialized: boolean;
  language: Language;
  session: AuthSession;
  challenge: AuthChallenge | null;
  requestStatus: AuthRequestStatus;
  verifyStatus: AuthVerifyStatus;
  devCode: string | null;
  initialize: () => Promise<void>;
  fetchChallenge: () => Promise<void>;
  requestCode: (email: string, challengeAnswer: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setLanguage: (language: Language) => void;
  reset: () => void;
};

const AUTH_TOKEN_STORAGE_KEY = "shared-physics-playground:auth-token";
const LANGUAGE_STORAGE_KEY = "shared-physics-playground:language";

function getStorage() {
  const storage = globalThis.localStorage;

  if (
    typeof storage === "undefined" ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  ) {
    return null;
  }

  return storage;
}

function getStoredLanguage(): Language {
  const storage = getStorage();

  if (!storage) {
    return "en";
  }

  const stored = storage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "zh-CN" ? "zh-CN" : "en";
}

function getStoredAuthToken(): string | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const token = storage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token && token.length > 0 ? token : null;
}

function setStoredAuthToken(token: string | null) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  if (!token) {
    storage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return;
  }

  storage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

function setStoredLanguage(language: Language) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  initialized: false,
  language: getStoredLanguage(),
  session: { kind: "loading" },
  challenge: null,
  requestStatus: { kind: "idle" },
  verifyStatus: { kind: "idle" },
  devCode: null,
  async initialize() {
    if (get().initialized) {
      return;
    }

    const language = getStoredLanguage();
    const token = getStoredAuthToken();

    set({
      language,
    });

    if (!token || typeof globalThis.fetch !== "function") {
      set({
        initialized: true,
        session: { kind: "anonymous" },
      });
      await get().fetchChallenge();
      return;
    }

    try {
      const response = await globalThis.fetch("/api/auth/session", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setStoredAuthToken(null);
        set({
          initialized: true,
          session: { kind: "anonymous" },
        });
        await get().fetchChallenge();
        return;
      }

      const payload = (await response.json()) as { user: AuthUser };

      set({
        initialized: true,
        session: {
          kind: "authenticated",
          authToken: token,
          user: payload.user,
        },
      });
    } catch {
      setStoredAuthToken(null);
      set({
        initialized: true,
        session: { kind: "anonymous" },
      });
      await get().fetchChallenge();
    }
  },
  async fetchChallenge() {
    if (typeof globalThis.fetch !== "function") {
      return;
    }

    try {
      const response = await globalThis.fetch("/api/auth/challenge");

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as AuthChallenge;
      set({
        challenge: payload,
      });
    } catch {}
  },
  async requestCode(email, challengeAnswer) {
    const challenge = get().challenge;

    if (!challenge) {
      await get().fetchChallenge();
    }

    const nextChallenge = get().challenge;

    if (!nextChallenge || typeof globalThis.fetch !== "function") {
      set({
        requestStatus: { kind: "error", message: "unable to load verification challenge" },
      });
      return;
    }

    set({
      devCode: null,
      requestStatus: { kind: "requesting" },
    });

    try {
      const response = await globalThis.fetch("/api/auth/request-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          challengeId: nextChallenge.challengeId,
          challengeAnswer,
        }),
      });

      if (!response.ok) {
        const failed = (await response.json()) as { error?: string };
        set({
          requestStatus: {
            kind: "error",
            message: failed.error ?? "request code failed",
          },
        });
        await get().fetchChallenge();
        return;
      }

      const payload = (await response.json()) as { devCode?: string };
      set({
        requestStatus: { kind: "requested" },
        devCode: payload.devCode ?? null,
      });
      await get().fetchChallenge();
    } catch {
      set({
        requestStatus: { kind: "error", message: "request code failed" },
      });
    }
  },
  async verifyCode(email, code) {
    set({
      verifyStatus: { kind: "verifying" },
    });

    try {
      const response = await globalThis.fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      if (!response.ok) {
        const failed = (await response.json()) as { error?: string };
        set({
          verifyStatus: {
            kind: "error",
            message: failed.error ?? "verify code failed",
          },
        });
        return;
      }

      const payload = (await response.json()) as {
        authToken: string;
        user: AuthUser;
      };

      setStoredAuthToken(payload.authToken);
      set({
        initialized: true,
        devCode: null,
        requestStatus: { kind: "idle" },
        verifyStatus: { kind: "idle" },
        session: {
          kind: "authenticated",
          authToken: payload.authToken,
          user: payload.user,
        },
      });
    } catch {
      set({
        verifyStatus: { kind: "error", message: "verify code failed" },
      });
    }
  },
  async logout() {
    const session = get().session;

    try {
      if (session.kind === "authenticated" && typeof globalThis.fetch === "function") {
        await globalThis.fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.authToken}`,
          },
        });
      }
    } catch {}

    setStoredAuthToken(null);
    set({
      devCode: null,
      requestStatus: { kind: "idle" },
      verifyStatus: { kind: "idle" },
      session: { kind: "anonymous" },
    });
    await get().fetchChallenge();
  },
  setLanguage(language) {
    setStoredLanguage(language);
    set({ language });
  },
  reset() {
    setStoredAuthToken(null);
    setStoredLanguage("en");
    set({
      initialized: false,
      language: "en",
      session: { kind: "loading" },
      challenge: null,
      requestStatus: { kind: "idle" },
      verifyStatus: { kind: "idle" },
      devCode: null,
    });
  },
}));

export function getAuthSnapshot() {
  return useAuthStore.getState();
}

export function getAuthHeaders(): Record<string, string> {
  const session = useAuthStore.getState().session;

  return session.kind === "authenticated"
    ? {
        Authorization: `Bearer ${session.authToken}`,
      }
    : {};
}

export function resetAuthState() {
  useAuthStore.getState().reset();
}
