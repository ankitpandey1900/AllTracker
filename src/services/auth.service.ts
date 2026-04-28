import { getSecureLocalProfileString, setSecureLocalProfileString } from "@/utils/security";
import { STORAGE_KEYS } from "@/config/constants";
import { syncDataOnLogin } from "@/services/data-bridge";
import { ApiError, apiRequest } from "@/services/api.service";
import { authClient } from "@/lib/auth-client";
import { log } from "@/utils/logger.utils";

type BootstrapResponse = {
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  };
  profile: {
    authUserId: string;
    username: string;
    fullName: string;
    nation: string;
    avatar: string;
    metadata: {
      dob?: string;
      phoneNumber?: string;
      isPublic?: boolean;
      isFocusPublic?: boolean;
    };
  };
};

type AppConfigResponse = {
  authConfigured: boolean;
  dbConfigured: boolean;
  oauthProviders: {
    google: boolean;
    github: boolean;
  };
};

let currentUserId: string | null = null;
let appConfig: AppConfigResponse | null = null;

async function getAppConfig(): Promise<AppConfigResponse> {
  if (appConfig) {
    return appConfig;
  }
  appConfig = await apiRequest<AppConfigResponse>("/api/app/config");
  return appConfig;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export function setupPasswordToggle(toggleId: string, inputId: string): void {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  if (!toggle || !input) return;

  toggle.onclick = () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    toggle.textContent = isPassword ? "🔒" : "👁️";
  };
}

export function setupHeaderScroll(): void {
  const header = document.getElementById("appHeader");
  if (!header) return;

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });
}

function buildLocalProfile(payload: BootstrapResponse) {
  return {
    displayName: payload.profile.username,
    realName: payload.profile.fullName || payload.session.user.name || "",
    dob: payload.profile.metadata?.dob || "",
    nation: payload.profile.nation || "Global",
    email: payload.session.user.email || "",
    avatar: payload.profile.avatar || "👤",
    phoneNumber: payload.profile.metadata?.phoneNumber || "",
    isFocusPublic: payload.profile.metadata?.isFocusPublic !== false,
    isPublic: payload.profile.metadata?.isPublic !== false,
  };
}

async function hydrateSessionState(): Promise<void> {
  const config = await getAppConfig();
  if (!config.authConfigured) {
    handleUserSignedOut(
      "Authentication is not configured yet. Add the Better Auth and OAuth environment variables to enable login.",
    );
    return;
  }

  const { data } = await authClient.getSession();
  if (!data?.user) {
    handleUserSignedOut();
    return;
  }

  const bootstrap = await apiRequest<BootstrapResponse>("/api/app/bootstrap");
  currentUserId = bootstrap.session.user.id;

  const localProfile = buildLocalProfile(bootstrap);
  setSecureLocalProfileString(JSON.stringify(localProfile));
  localStorage.setItem("tracker_username", localProfile.displayName);

  updateHeaderProfileUI();
  dispatchIdentitySync(localProfile);
  await syncDataOnLogin(true);
}

export function initSyncAuth(): Promise<void> {
  bindAuthUi();

  return hydrateSessionState().catch((error) => {
    log.error("Better Auth session bootstrap failed", error);
    if (error instanceof ApiError && error.code === "SERVICE_NOT_CONFIGURED") {
      handleUserSignedOut(error.message);
      return;
    }
    handleUserSignedOut();
  });
}

function bindAuthUi(): void {
  document.getElementById("authTriggerBtn")?.addEventListener("click", openAuthModal);
  document.getElementById("closeAuthModal")?.addEventListener("click", closeAuthModal);
  document.getElementById("loginWithGoogleBtn")?.addEventListener("click", () => {
    void signInWithProvider("google");
  });
  document.getElementById("loginWithGithubBtn")?.addEventListener("click", () => {
    void signInWithProvider("github");
  });
  rebindAliasTrigger();
}

function showAuthError(message: string): void {
  const errorEl = document.getElementById("authErrorMsg");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function showAuthInfo(message: string): void {
  const errorEl = document.getElementById("authErrorMsg");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = "block";
  errorEl.style.color = "#fbbf24";
  errorEl.style.background = "rgba(251, 191, 36, 0.08)";
  errorEl.style.border = "1px solid rgba(251, 191, 36, 0.25)";
}

function clearAuthError(): void {
  const errorEl = document.getElementById("authErrorMsg");
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.style.display = "none";
  errorEl.style.color = "";
  errorEl.style.background = "";
  errorEl.style.border = "";
}

async function openAuthModal(): Promise<void> {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  clearAuthError();
  modal.style.display = "flex";
  modal.classList.add("active");

  try {
    const config = await getAppConfig();
    const googleBtn = document.getElementById("loginWithGoogleBtn") as HTMLButtonElement | null;
    const githubBtn = document.getElementById("loginWithGithubBtn") as HTMLButtonElement | null;
    if (googleBtn) googleBtn.disabled = !config.authConfigured || !config.oauthProviders.google;
    if (githubBtn) githubBtn.disabled = !config.authConfigured || !config.oauthProviders.github;
    if (!config.authConfigured) {
      showAuthInfo(
        "Authentication is not configured yet. Add the Better Auth and OAuth environment variables first.",
      );
    }
  } catch (error) {
    showAuthError(error instanceof Error ? error.message : "Unable to load auth configuration.");
  }
}

function closeAuthModal(): void {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.style.display = "none";
}

async function signInWithProvider(provider: "google" | "github"): Promise<void> {
  clearAuthError();
  try {
    const config = await getAppConfig();
    if (!config.authConfigured) {
      showAuthInfo(
        "Authentication is not configured yet. Add the Better Auth and OAuth environment variables first.",
      );
      return;
    }

    await authClient.signIn.social({
      provider,
      callbackURL: window.location.href,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === "SERVICE_NOT_CONFIGURED") {
      showAuthInfo(error.message);
      return;
    }
    showAuthError(error instanceof Error ? error.message : "Authentication failed.");
  }
}

function dispatchIdentitySync(profile: unknown): void {
  window.dispatchEvent(new CustomEvent("all-tracker-identity-sync", { detail: profile }));
}

export function updateHeaderProfileUI(): void {
  const headerRight = document.getElementById("headerRight");
  if (!headerRight) return;

  const profileRaw = getSecureLocalProfileString();
  const profile = profileRaw ? JSON.parse(profileRaw) : null;
  const avatar = profile?.avatar || "👤";
  const handle = localStorage.getItem("tracker_username") || "Tracker User";

  const existingAlias = document.getElementById("headerUserAlias");
  if (existingAlias) {
    existingAlias.innerHTML = `
      <div class="pilot-hud-avatar">${avatar}</div>
      <span>${handle}</span>
    `;
    return;
  }

  headerRight.innerHTML = `
    <div class="user-info-group" style="display:flex; align-items:center; gap:12px;">
      <div id="headerUserAlias" class="pilot-hud-pill">
        <div class="pilot-hud-avatar">${avatar}</div>
        <span>${handle}</span>
      </div>
      <div id="syncStatus" class="data-stream-active" style="display:flex; align-items:center; background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.3); padding:5px 14px; border-radius:30px; font-size:0.65rem; font-weight:900; color:#10b981; letter-spacing:1px; text-transform:uppercase;">
        <div class="pulse-emerald" style="width:6px; height:6px; background:#10b981; border-radius:50%; margin-right:8px; box-shadow:0 0 8px #10b981;"></div>
        Live Ready
      </div>
      <button class="btn btn-ghost" id="logoutBtn" style="height:32px; width:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); color:#ef4444; cursor:pointer; transition:all 0.2s;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  `;

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    void handleSignOut();
  });
  rebindAliasTrigger();
}

async function handleSignOut(): Promise<void> {
  try {
    await authClient.signOut();
  } finally {
    handleUserSignedOut();
  }
}

function handleUserSignedOut(infoMessage?: string): void {
  currentUserId = null;
  localStorage.removeItem(STORAGE_KEYS.SYNC_ID);
  localStorage.removeItem("tracker_username");
  setSecureLocalProfileString(null);

  const headerRight = document.getElementById("headerRight");
  if (headerRight) {
    headerRight.innerHTML = `
      <button class="btn btn-primary glow-blue" id="authTriggerBtn" style="font-size:0.65rem; font-weight:800; letter-spacing:1px; padding:6px 14px; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:6px; height:32px; background:#10b981; border:none; color:white;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        <span class="btn-text">LOGIN</span>
      </button>
    `;
    document.getElementById("authTriggerBtn")?.addEventListener("click", openAuthModal);
  }

  closeAuthModal();
  dispatchIdentitySync(null);
  if (infoMessage) {
    const triggerBtn = document.getElementById("authTriggerBtn");
    triggerBtn?.setAttribute("title", infoMessage);
    showAuthInfo(infoMessage);
  }
}

function rebindAliasTrigger(): void {
  const aliasBtn = document.getElementById("headerUserAlias");
  if (!aliasBtn) return;

  aliasBtn.onclick = async () => {
    const { openProfileModal } = await import("@/features/profile/profile.ui");
    openProfileModal();
  };
}
