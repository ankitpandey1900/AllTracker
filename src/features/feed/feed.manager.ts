import { apiRequest } from '@/services/api.service';
import { Transmission } from './feed.types';

export async function fetchFeed(): Promise<Transmission[]> {
  try {
    // Track which posts we've already "viewed" this session
    const seenKey = 'feed_seen_ids';
    const seenIds: string[] = JSON.parse(sessionStorage.getItem(seenKey) || '[]');
    const seenParam = seenIds.length > 0 ? `?seen=${seenIds.join(',')}` : '';

    const posts = await apiRequest<Transmission[]>(`/api/app/feed${seenParam}`);

    // Mark all returned posts as seen
    const allIds = [...new Set([...seenIds, ...posts.map(p => p.id)])];
    // Cap at 200 to avoid huge query strings — keep the most recent
    sessionStorage.setItem(seenKey, JSON.stringify(allIds.slice(-200)));

    return posts;
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    return [];
  }
}

export async function postTransmission(content: string): Promise<void> {
  try {
    await apiRequest('/api/app/feed', {
      method: 'POST',
      body: { content }
    });
  } catch (error) {
    console.error('Failed to post:', error);
    throw error;
  }
}

export async function toggleLike(postId: string): Promise<void> {
  try {
    await apiRequest('/api/app/feed', {
      method: 'PUT',
      body: { post_id: postId, interaction_type: 'LIKE' }
    });
  } catch (error) {
    console.error('Failed to toggle like:', error);
  }
}

export async function toggleRepost(postId: string): Promise<void> {
  try {
    await apiRequest('/api/app/feed', {
      method: 'PUT',
      body: { post_id: postId, interaction_type: 'REPOST' }
    });
  } catch (error) {
    console.error('Failed to toggle repost:', error);
  }
}

export async function deletePost(postId: string): Promise<boolean> {
  try {
    await apiRequest('/api/app/feed', {
      method: 'DELETE',
      body: { post_id: postId }
    });
    return true;
  } catch (error) {
    console.error('Failed to delete post:', error);
    return false;
  }
}

export async function fetchComments(postId: string): Promise<any[]> {
  try {
    return await apiRequest('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'get_comments', post_id: postId }
    });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return [];
  }
}

export async function postComment(postId: string, content: string): Promise<boolean> {
  try {
    await apiRequest('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'add_comment', post_id: postId, content }
    });
    return true;
  } catch (error) {
    console.error('Failed to post comment:', error);
    return false;
  }
}

export async function fetchUserPosts(userId: string): Promise<Transmission[]> {
  try {
    return await apiRequest<Transmission[]>('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'user_posts', user_id: userId }
    });
  } catch (error) {
    console.error('Failed to fetch user posts:', error);
    return [];
  }
}

export async function getUnreadNotifCount(): Promise<number> {
  try {
    const res = await apiRequest<{ count: number }>('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'unread_count' }
    });
    return res.count;
  } catch { return 0; }
}

export async function getNotifications(): Promise<any[]> {
  try {
    return await apiRequest('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'get_notifications' }
    });
  } catch { return []; }
}

export async function markNotifsRead(): Promise<void> {
  try {
    await apiRequest('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'mark_read' }
    });
  } catch { }
}

export async function searchMentionUsers(query: string): Promise<any[]> {
  try {
    return await apiRequest('/api/app/feed', {
      method: 'PATCH',
      body: { action: 'search_users', query }
    });
  } catch { return []; }
}

