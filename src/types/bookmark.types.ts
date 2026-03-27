/**
 * Bookmark types
 *
 * Bookmarks are saved links organized by category.
 */

/** Allowed bookmark categories */
export type BookmarkCategory =
  | 'Development'
  | 'Learning'
  | 'Work'
  | 'Social'
  | 'Personal'
  | 'Random'
  | 'Other';

/** A single saved bookmark */
export interface Bookmark {
  id: number;
  title: string;
  url: string;
  category: BookmarkCategory;
}
