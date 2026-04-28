import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuth } from "../_lib/auth/index.js";
import { ensureProfileForUser } from "../_lib/data/profile-repo.js";
import { fetchTransmissions, createTransmission, deleteTransmission, deleteComment, fetchComments, createComment, incrementViewsBulk, fetchUserPosts, fetchNotifications, getUnreadCount, markNotificationsRead, searchUsers, toggleInteraction } from "../_lib/data/feed-repo.js";
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

    let profile = null;
    if (session?.user) {
      profile = await ensureProfileForUser(session.user);
    }

    if (req.method === "GET") {
      const transmissions = await fetchTransmissions(profile?.profileId);
      
      // Parse query string for already-seen post IDs and force_view flag
      const url = new URL(req.url || '/', `http://localhost`);
      const seenParam = url.searchParams.get('seen') || '';
      const forceView = url.searchParams.get('force_view') === 'true';
      const seenIds = seenParam ? seenParam.split(',').filter(Boolean) : [];
      
      // If force_view is true, we increment for all IDs regardless of seen list
      // Otherwise, only increment views for posts the client hasn't seen yet this session
      const newPostIds = transmissions
        .map((t: any) => t.id)
        .filter((id: string) => forceView || !seenIds.includes(id));
      
      if (newPostIds.length > 0) {
        incrementViewsBulk(newPostIds).catch(() => {});
      }
      
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
      sendJson(res, 200, transmissions);
      return;
    }

    if (req.method === "POST") {
      // Must be authenticated
      if (!profile) {
        sendJson(res, 401, { error: "Unauthorized. You must be an operative to broadcast." });
        return;
      }

      const body = await readJsonBody<{ content: string; focus_tag?: string }>(req);

      if (!body?.content?.trim()) {
        sendJson(res, 400, { error: "Transmission content cannot be empty." });
        return;
      }

      if (body.content.length > 280) {
        sendJson(res, 400, { error: "Transmission cannot exceed 280 characters." });
        return;
      }

      const newPost = await createTransmission(profile.profileId, body.content.trim(), body.focus_tag?.trim());
      sendJson(res, 201, newPost);
      return;
    }

    if (req.method === "DELETE") {
      if (!profile) {
        sendJson(res, 401, { error: "Unauthorized." });
        return;
      }

      const body = await readJsonBody<{ post_id?: string; comment_id?: string }>(req);

      if (body?.comment_id) {
        const success = await deleteComment(profile.profileId, body.comment_id);
        if (!success) {
          sendJson(res, 403, { error: "You can only delete your own comments." });
          return;
        }
        sendJson(res, 200, { status: 'deleted' });
        return;
      }

      if (!body?.post_id) {
        sendJson(res, 400, { error: "post_id or comment_id is required." });
        return;
      }

      const success = await deleteTransmission(profile.profileId, body.post_id);
      if (!success) {
        sendJson(res, 403, { error: "You can only delete your own posts." });
        return;
      }

      sendJson(res, 200, { status: 'deleted' });
      return;
    }

    // PATCH = comment + profile operations
    if (req.method === "PATCH") {
      const body = await readJsonBody<{ action: string; post_id?: string; user_id?: string; content?: string }>(req);

      if (body?.action === 'user_posts') {
        let targetUserId = body.user_id;
        if (!targetUserId) {
          sendJson(res, 400, { error: "user_id is required." });
          return;
        }
        // 'me' = current authenticated user
        if (targetUserId === 'me') {
          if (!profile) { sendJson(res, 401, { error: "Unauthorized." }); return; }
          targetUserId = profile.profileId;
        }
        const posts = await fetchUserPosts(targetUserId, profile?.profileId);
        sendJson(res, 200, posts);
        return;
      }

      if (body?.action === 'get_comments') {
        if (!body.post_id) {
          sendJson(res, 400, { error: "post_id is required." });
          return;
        }
        const comments = await fetchComments(body.post_id, profile?.profileId || '');
        sendJson(res, 200, comments);
        return;
      }

      if (body?.action === 'add_comment') {
        if (!profile) {
          sendJson(res, 401, { error: "Unauthorized." });
          return;
        }
        if (!body.post_id || !body.content?.trim()) {
          sendJson(res, 400, { error: "post_id and content are required." });
          return;
        }
        if (body.content.length > 280) {
          sendJson(res, 400, { error: "Comment cannot exceed 280 characters." });
          return;
        }
        const result = await createComment(profile.profileId, body.post_id, body.content.trim());
        sendJson(res, 201, result);
        return;
      }

      if (body?.action === 'get_notifications') {
        if (!profile) { sendJson(res, 401, { error: "Unauthorized." }); return; }
        const notifications = await fetchNotifications(profile.profileId);
        sendJson(res, 200, notifications);
        return;
      }

      if (body?.action === 'unread_count') {
        if (!profile) { sendJson(res, 200, { count: 0 }); return; }
        const count = await getUnreadCount(profile.profileId);
        sendJson(res, 200, { count });
        return;
      }

      if (body?.action === 'mark_read') {
        if (!profile) { sendJson(res, 401, { error: "Unauthorized." }); return; }
        await markNotificationsRead(profile.profileId);
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (body?.action === 'search_users') {
        const q = (body as any).query;
        if (!q || typeof q !== 'string' || q.length < 1) {
          sendJson(res, 200, []);
          return;
        }
        const users = await searchUsers(q);
        sendJson(res, 200, users);
        return;
      }

      sendJson(res, 400, { error: "Invalid action." });
      return;
    }

    // PUT = like/repost interactions
    if (req.method === "PUT") {
      if (!profile) {
        sendJson(res, 401, { error: "Unauthorized." });
        return;
      }
      const body = await readJsonBody<{ post_id: string; interaction_type: 'LIKE' | 'REPOST' }>(req);
      if (!body?.post_id || !body?.interaction_type) {
        sendJson(res, 400, { error: "post_id and interaction_type are required." });
        return;
      }
      if (body.interaction_type !== 'LIKE' && body.interaction_type !== 'REPOST') {
        sendJson(res, 400, { error: "Invalid interaction type." });
        return;
      }
      const result = await toggleInteraction(profile.profileId, body.post_id, body.interaction_type);
      sendJson(res, 200, result);
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST", "DELETE", "PATCH", "PUT"]);
  } catch (error) {
    handleRouteError(res, error);
  }
}
