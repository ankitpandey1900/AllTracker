import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../_lib/auth/index.js";
import { ensureProfileForUser, updateProfileIdentity } from "../_lib/data/profile-repo.js";
import { headersFromNode, readJsonBody } from "../_lib/http/request.js";
import { handleRouteError, sendJson, sendMethodNotAllowed } from "../_lib/http/response.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const session = await getAuth().api.getSession({
      headers: headersFromNode(req.headers),
    });

    if (!session?.user) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const profile = await ensureProfileForUser(session.user);

    if (req.method === "GET") {
      sendJson(res, 200, profile);
      return;
    }

    if (req.method !== "PATCH") {
      sendMethodNotAllowed(res, ["GET", "PATCH"]);
      return;
    }

    const body = await readJsonBody<{
      username: string;
      fullName: string;
      nation: string;
      avatar: string;
      metadata?: {
        dob?: string;
        phoneNumber?: string;
        isPublic?: boolean;
        isFocusPublic?: boolean;
      };
    }>(req);

    if (!body?.username?.trim()) {
      sendJson(res, 400, { error: "Username is required" });
      return;
    }

    // 🔒 SECURITY: Validate username format (alphanumeric, dashes, underscores only; 3-30 chars)
    const username = body.username.trim();
    if (username.length < 3 || username.length > 30) {
      sendJson(res, 400, { error: "Username must be between 3 and 30 characters" });
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      sendJson(res, 400, { error: "Username can only contain letters, numbers, hyphens, and underscores" });
      return;
    }

    const updated = await updateProfileIdentity(profile, {
      username: body.username.trim(),
      fullName: body.fullName?.trim() || profile.fullName,
      nation: body.nation?.trim() || profile.nation,
      avatar: body.avatar?.trim() || profile.avatar,
      metadata: {
        dob: body.metadata?.dob || profile.metadata.dob || "",
        phoneNumber:
          body.metadata?.phoneNumber || profile.metadata.phoneNumber || "",
        isPublic:
          typeof body.metadata?.isPublic === "boolean"
            ? body.metadata.isPublic
            : profile.metadata.isPublic !== false,
        isFocusPublic:
          typeof body.metadata?.isFocusPublic === "boolean"
            ? body.metadata.isFocusPublic
            : profile.metadata.isFocusPublic !== false,
      },
    });
    sendJson(res, 200, updated);
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      sendJson(res, 409, { error: "Username already taken" });
      return;
    }
    handleRouteError(res, error);
  }
}
