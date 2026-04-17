import { betterAuth } from "better-auth";
import { assertAuthConfigured } from "../config/env";
import { getPool } from "../db/pool";

let authInstance: any;

export function getAuth() {
  if (authInstance) {
    return authInstance;
  }

  const env = assertAuthConfigured();
  const trustedOrigins = Array.from(
    new Set([env.betterAuthUrl, ...env.trustedOrigins]),
  );

  const instance = betterAuth({
    appName: "All Tracker",
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
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
