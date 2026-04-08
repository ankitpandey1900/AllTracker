/**
 * Types for the bookmarks.
 *
 * Bookmarks are just saved links organized by folder.
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
