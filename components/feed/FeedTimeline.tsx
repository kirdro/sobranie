"use client";

import { useUnit } from "effector-react";

import { $feedPosts } from "@/lib/stores/dashboard";

import { FeedCard } from "./FeedCard";

export function FeedTimeline() {
  const posts = useUnit($feedPosts);

  return (
    <div className="grid gap-6">
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}
    </div>
  );
}
