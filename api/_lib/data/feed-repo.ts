import { getPool } from "../db/pool.js";

export async function fetchTransmissions(userId?: string) {
  const pool = getPool();
  
  // Fetch the latest 50 transmissions.
  // Join with profiles to get author details.
  // We use left joins with feed_interactions to determine if the currently logged-in user liked/reposted.
  
  const query = `
    SELECT 
      t.id,
      t.user_id,
      p.full_name as display_name,
      p.username as handle,
      p.avatar,
      p.rank,
      t.content,
      t.focus_tag,
      t.likes_count,
      t.reposts_count,
      t.replies_count,
      t.views_count,
      t.created_at,
      (t.user_id = $1) as is_mine,
      EXISTS (
        SELECT 1 FROM feed_interactions fi 
        WHERE fi.post_id = t.id AND fi.user_id = $1 AND fi.interaction_type = 'LIKE'
      ) as is_liked_by_me,
      EXISTS (
        SELECT 1 FROM feed_interactions fi 
        WHERE fi.post_id = t.id AND fi.user_id = $1 AND fi.interaction_type = 'REPOST'
      ) as is_reposted_by_me
    FROM transmissions t
    JOIN profiles p ON t.user_id = p.id
    ORDER BY t.created_at DESC
    LIMIT 50
  `;
  
  const { rows } = await pool.query(query, [userId || '00000000-0000-0000-0000-000000000000']);
  
  return rows.map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: row.display_name || 'Operative',
    handle: `@${row.handle}`,
    avatar: row.avatar || '👤',
    rank: row.rank || 'IRON',
    content: row.content,
    focus_tag: row.focus_tag,
    likes_count: Number(row.likes_count || 0),
    reposts_count: Number(row.reposts_count || 0),
    replies_count: Number(row.replies_count || 0),
    views_count: Number(row.views_count || 0),
    created_at: row.created_at,
    is_mine: row.is_mine,
    is_liked_by_me: row.is_liked_by_me,
    is_reposted_by_me: row.is_reposted_by_me
  }));
}

export async function createTransmission(userId: string, content: string, focusTag?: string) {
  const pool = getPool();
  
  const query = `
    INSERT INTO transmissions (user_id, content, focus_tag)
    VALUES ($1, $2, $3)
    RETURNING id, created_at
  `;
  
  const { rows } = await pool.query(query, [userId, content, focusTag || null]);
  // Fire-and-forget: parse @mentions and notify
  parseAndNotifyMentions(content, userId, rows[0].id, 'POST_MENTION').catch(() => {});
  return rows[0];
}

export async function toggleInteraction(userId: string, postId: string, type: 'LIKE' | 'REPOST') {
  const pool = getPool();
  
  // Check if interaction exists
  const checkQuery = `SELECT id FROM feed_interactions WHERE user_id = $1 AND post_id = $2 AND interaction_type = $3`;
  const { rows: existing } = await pool.query(checkQuery, [userId, postId, type]);
  
  if (existing.length > 0) {
    // Delete interaction (Unlike / Un-repost)
    await pool.query(`DELETE FROM feed_interactions WHERE id = $1`, [existing[0].id]);
    
    // Decrement count on transmission
    const field = type === 'LIKE' ? 'likes_count' : 'reposts_count';
    await pool.query(`UPDATE transmissions SET ${field} = GREATEST(${field} - 1, 0) WHERE id = $1`, [postId]);
    return { status: 'removed' };
  } else {
    // Add interaction
    await pool.query(
      `INSERT INTO feed_interactions (user_id, post_id, interaction_type) VALUES ($1, $2, $3)`,
      [userId, postId, type]
    );
    
    // Increment count on transmission
    const field = type === 'LIKE' ? 'likes_count' : 'reposts_count';
    await pool.query(`UPDATE transmissions SET ${field} = ${field} + 1 WHERE id = $1`, [postId]);
    return { status: 'added' };
  }
}

export async function incrementViewsBulk(postIds: string[]) {
  if (postIds.length === 0) return;
  const pool = getPool();
  await pool.query(`UPDATE transmissions SET views_count = views_count + 1 WHERE id = ANY($1)`, [postIds]);
}

export async function deleteTransmission(userId: string, postId: string) {
  const pool = getPool();
  const query = `DELETE FROM transmissions WHERE id = $1 AND user_id = $2 RETURNING id`;
  const { rowCount } = await pool.query(query, [postId, userId]);
  return rowCount !== null && rowCount > 0;
}

export async function fetchComments(postId: string) {
  const pool = getPool();
  const query = `
    SELECT 
      c.id, c.content, c.created_at,
      p.full_name as display_name,
      p.username as handle,
      p.avatar,
      p.rank
    FROM feed_comments c
    JOIN profiles p ON c.user_id = p.id
    WHERE c.post_id = $1
    ORDER BY c.created_at ASC
    LIMIT 50
  `;
  const { rows } = await pool.query(query, [postId]);
  return rows.map((row: any) => ({
    id: row.id,
    content: row.content,
    display_name: row.display_name || 'User',
    handle: `@${row.handle}`,
    avatar: row.avatar || '👤',
    rank: row.rank || 'IRON',
    created_at: row.created_at
  }));
}

export async function createComment(userId: string, postId: string, content: string) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO feed_comments (user_id, post_id, content) VALUES ($1, $2, $3)`,
    [userId, postId, content]
  );
  // Increment replies count on the post
  await pool.query(
    `UPDATE transmissions SET replies_count = replies_count + 1 WHERE id = $1`,
    [postId]
  );
  // Fire-and-forget: parse @mentions in comment
  parseAndNotifyMentions(content, userId, postId, 'COMMENT_MENTION').catch(() => {});
  return { status: 'created' };
}

export async function fetchUserPosts(targetUserId: string, currentUserId?: string) {
  const pool = getPool();
  const query = `
    SELECT 
      t.id, t.user_id,
      p.full_name as display_name, p.username as handle, p.avatar, p.rank,
      t.content, t.focus_tag,
      t.likes_count, t.reposts_count, t.replies_count, t.views_count,
      t.created_at,
      (t.user_id = $2) as is_mine,
      EXISTS (SELECT 1 FROM feed_interactions fi WHERE fi.post_id = t.id AND fi.user_id = $2 AND fi.interaction_type = 'LIKE') as is_liked_by_me,
      EXISTS (SELECT 1 FROM feed_interactions fi WHERE fi.post_id = t.id AND fi.user_id = $2 AND fi.interaction_type = 'REPOST') as is_reposted_by_me
    FROM transmissions t
    JOIN profiles p ON t.user_id = p.id
    WHERE t.user_id = $1
    ORDER BY t.created_at DESC
    LIMIT 30
  `;
  const { rows } = await pool.query(query, [targetUserId, currentUserId || '00000000-0000-0000-0000-000000000000']);
  return rows.map((row: any) => ({
    id: row.id, user_id: row.user_id,
    display_name: row.display_name || 'User', handle: `@${row.handle}`,
    avatar: row.avatar || '👤', rank: row.rank || 'IRON',
    content: row.content, focus_tag: row.focus_tag,
    likes_count: Number(row.likes_count || 0), reposts_count: Number(row.reposts_count || 0),
    replies_count: Number(row.replies_count || 0), views_count: Number(row.views_count || 0),
    created_at: row.created_at, is_mine: row.is_mine,
    is_liked_by_me: row.is_liked_by_me, is_reposted_by_me: row.is_reposted_by_me
  }));
}

// ─── Notifications ───

export async function parseAndNotifyMentions(
  content: string, fromUserId: string, postId: string, type: 'POST_MENTION' | 'COMMENT_MENTION'
) {
  const mentions = content.match(/@(\w+)/g);
  if (!mentions || mentions.length === 0) return;

  const pool = getPool();
  // Dedupe and cap at 5 mentions to prevent notification spam
  const usernames = [...new Set(mentions.map(m => m.slice(1).toLowerCase()))].slice(0, 5);

  for (const username of usernames) {
    try {
      const { rows } = await pool.query(
        `SELECT id FROM profiles WHERE LOWER(username) = $1`, [username]
      );
      if (rows.length > 0 && rows[0].id !== fromUserId) {
        await createNotification(rows[0].id, fromUserId, type, postId, content.substring(0, 100));
      }
    } catch {
      // Skip failed notification silently
    }
  }
}

export async function createNotification(
  userId: string, fromUserId: string, type: string, postId: string, preview: string
) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO feed_notifications (user_id, from_user_id, type, post_id, preview)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, fromUserId, type, postId, preview]
  );
}

export async function fetchNotifications(userId: string) {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT 
      n.id, n.type, n.post_id, n.preview, n.is_read, n.created_at,
      p.full_name as from_name, p.username as from_handle, p.avatar as from_avatar, p.rank as from_rank
    FROM feed_notifications n
    JOIN profiles p ON n.from_user_id = p.id
    WHERE n.user_id = $1
    ORDER BY n.created_at DESC
    LIMIT 30
  `, [userId]);
  return rows.map((r: any) => ({
    id: r.id, type: r.type, post_id: r.post_id,
    preview: r.preview, is_read: r.is_read, created_at: r.created_at,
    from_name: r.from_name || 'User', from_handle: `@${r.from_handle}`,
    from_avatar: r.from_avatar || '👤', from_rank: r.from_rank || 'IRON'
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM feed_notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return Number(rows[0]?.count || 0);
}

export async function markNotificationsRead(userId: string) {
  const pool = getPool();
  await pool.query(
    `UPDATE feed_notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
}

export async function searchUsers(query: string) {
  const pool = getPool();
  // Sanitize: only allow alphanumeric + underscore, max 30 chars
  const safeQuery = query.replace(/[^\w]/g, '').substring(0, 30);
  if (!safeQuery) return [];
  const { rows } = await pool.query(
    `SELECT id, username, full_name, avatar, rank
     FROM profiles
     WHERE LOWER(username) LIKE $1
     ORDER BY username ASC
     LIMIT 8`,
    [`%${safeQuery.toLowerCase()}%`]
  );
  return rows.map((r: any) => ({
    id: r.id, username: r.username,
    full_name: r.full_name || r.username,
    avatar: r.avatar || '👤', rank: r.rank || 'IRON'
  }));
}
