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

  // Robust baseURL calculation
  let authBaseURL = env.betterAuthUrl;
  if (!authBaseURL.includes("/api/auth")) {
    authBaseURL = `${authBaseURL.replace(/\/$/, "")}/api/auth`;
  }

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
