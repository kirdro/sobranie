"use client";

import { useMemo, useEffect } from "react";
import { useUnit } from "effector-react";

import type { FeedPost } from "@/lib/data/feed";
import { fallbackFeedPosts } from "@/lib/data/fallback-content";
import { initialsFromName } from "@/lib/data/feed";
import { usePostsQuery } from "@/lib/hooks/usePostsQuery";
import type { Post } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils/datetime";
import {
  $posts,
  $postsLoading,
  $postsError,
  postsRequested
} from "@/lib/effector";

import { FeedCard } from "./FeedCard";

function mapPostToFeedCard(post: Post): FeedPost {
  const authorInfo = post.author;
  const fullName = authorInfo?.name || `User ${authorInfo.id.slice(0, 6)}`;
  const createdAt = formatRelativeTime(post.created_at);
  const tags = Array.isArray(post.tags) ? post.tags.map((tag) => tag.replace(/^#/, "")) : [];

  return {
    id: post.id,
    author: {
      name: fullName,
      role: "Участник Собрания",
      avatarInitials: initialsFromName(fullName)
    },
    createdAt,
    content: post.content,
    tags,
    stats: {
      comments: post.comments_count ?? 0,
      boosts: post.likes_count ?? 0,
      signals: post.reposts_count ?? 0
    }
  };
}

export function FeedTimeline() {
  // Use Effector stores instead of React Query
  const [posts, isLoading, error, onPostsRequest] = useUnit([
    $posts,
    $postsLoading,
    $postsError,
    postsRequested
  ]);

  // Load posts on mount
  useEffect(() => {
    onPostsRequest({ page: 1, limit: 20 });
  }, [onPostsRequest]);

  const items = useMemo<FeedPost[]>(() => {
    if (!posts.length) {
      return fallbackFeedPosts;
    }

    return posts.map(mapPostToFeedCard);
  }, [posts]);

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="h-48 animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
        <div className="h-48 animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {items.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}
    </div>
  );
}
