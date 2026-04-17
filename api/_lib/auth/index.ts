import { betterAuth } from "better-auth";
import { assertAuthConfigured } from "../config/env.js";
import { getPool } from "../db/pool.js";

let authInstance: any;

export function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  const env = assertAuthConfigured();
  const trustedOrigins = Array.from(
    new Set([env.betterAuthUrl, ...env.trustedOrigins]),
  );

  const authBaseURL = env.betterAuthUrl.endsWith("/api/auth")
    ? env.betterAuthUrl
    : `${env.betterAuthUrl.replace(/\/$/, "")}/api/auth`;

  const instance = betterAuth({
    appName: "All Tracker",
    secret: env.betterAuthSecret,
    baseURL: authBaseURL,
    trustedOrigins,
    database: getPool(),
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
        prompt: "select_account",
      },
      github: {
        clientId: env.githubClientId,
        clientSecret: env.githubClientSecret,
        scope: ["read:user", "user:email"],
      },
    },
  });

  authInstance = instance;
  return instance;
}
