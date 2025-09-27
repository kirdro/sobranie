"use client";

import { useUnit } from "effector-react";

import { $aiPrompts, $feedPosts, $navItems, $suggestedPeople, $trendTopics } from "@/lib/stores/dashboard";

export function useDashboardData() {
  return useUnit({
    navItems: $navItems,
    feedPosts: $feedPosts,
    trendTopics: $trendTopics,
    suggestedPeople: $suggestedPeople,
    aiPrompts: $aiPrompts
  });
}
