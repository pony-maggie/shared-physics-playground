import nodemailer from "nodemailer";

import { getSmtpConfig, type SmtpConfig } from "./smtp-config";

export type LoginCodeEmailInput = {
  email: string;
  code: string;
};

export type ProInterestEmailInput = {
  currentTier: string;
  ipAddress: string;
  occurredAt: string;
  operatorEmail?: string;
  source: string;
  userEmail: string | null;
  userId: string | null;
};

type Transport = {
  sendMail: (payload: Record<string, unknown>) => Promise<unknown>;
};

type MailerFactoryInput = {
  env?: Record<string, string | undefined>;
  transportFactory?: (config: SmtpConfig) => Transport;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderLoginCodeEmail(input: LoginCodeEmailInput) {
  const code = escapeHtml(input.code);

  return {
    subject: "Your Shared Physics Playground verification code",
    text: `Your Shared Physics Playground verification code is ${input.code}. It expires in 10 minutes.`,
    html: `<p>Your Shared Physics Playground verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  };
}

export function renderProInterestEmail(input: ProInterestEmailInput) {
  const userEmail = input.userEmail ?? "anonymous visitor";
  const userId = input.userId ?? "unknown";
  const safeUserEmail = escapeHtml(userEmail);
  const safeUserId = escapeHtml(userId);
  const safeTier = escapeHtml(input.currentTier);
  const safeSource = escapeHtml(input.source);
  const safeIpAddress = escapeHtml(input.ipAddress);
  const safeOccurredAt = escapeHtml(input.occurredAt);

  return {
    subject: `Pro upgrade request: ${userEmail}`,
    text: [
      "A user wants to upgrade to Pro.",
      `User: ${userEmail}`,
      `User ID: ${userId}`,
      `Current tier: ${input.currentTier}`,
      `Source: ${input.source}`,
      `IP address: ${input.ipAddress}`,
      `Occurred at: ${input.occurredAt}`,
    ].join("\n"),
    html: [
      "<p>A user wants to upgrade to <strong>Pro</strong>.</p>",
      "<ul>",
      `<li>User: ${safeUserEmail}</li>`,
      `<li>User ID: ${safeUserId}</li>`,
      `<li>Current tier: ${safeTier}</li>`,
      `<li>Source: ${safeSource}</li>`,
      `<li>IP address: ${safeIpAddress}</li>`,
      `<li>Occurred at: ${safeOccurredAt}</li>`,
      "</ul>",
    ].join(""),
  };
}

export function createMailer({
  env = process.env,
  transportFactory = (config) =>
    nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTls,
      auth: config.auth,
    }),
}: MailerFactoryInput = {}) {
  const config = getSmtpConfig(env);
  const transport = transportFactory(config);

  return {
    async sendLoginCode(input: LoginCodeEmailInput) {
      const message = renderLoginCodeEmail(input);

      await transport.sendMail({
        from: `"${config.from.name}" <${config.from.email}>`,
        to: input.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
    async sendProInterest(input: ProInterestEmailInput & { operatorEmail: string }) {
      const message = renderProInterestEmail(input);

      await transport.sendMail({
        from: `"${config.from.name}" <${config.from.email}>`,
        to: input.operatorEmail,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}
