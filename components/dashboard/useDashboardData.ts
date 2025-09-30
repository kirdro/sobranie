"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUnit } from "effector-react";

import type { NavigationLink, PaginatedResponse, Post, User } from "@/lib/api/types";
import type { AiPrompts, NavItem, SuggestedPerson, TrendTopic } from "@/lib/data/feed";
import { initialsFromName } from "@/lib/data/feed";
import {
  fallbackAiPrompts,
  fallbackNavItems,
  fallbackSuggestedPeople,
  fallbackTrendTopics
} from "@/lib/data/fallback-content";
import { useSession } from "@/components/auth/SessionProvider";
import { fetchJson } from "@/lib/frontend/fetch-json";
import { $posts } from "@/lib/effector";

type AssistantModesResponse = {
  items: Array<{
    id: string;
    name: string;
    description: string;
    capabilities?: string[];
  }>;
};

type NavigationResponse = {
  items: NavigationLink[];
};

type UsersResponse = PaginatedResponse<User>;

function computeMutualsSeed(id: string): number {
  if (!id) return 1;
  let sum = 0;
  for (let index = 0; index < id.length; index += 1) {
    sum += id.charCodeAt(index);
  }
  return (sum % 12) + 1;
}

function mapPostsToTopics(posts: Post[]): TrendTopic[] {
  const tagCount = new Map<string, number>();

  // Check if posts is defined and is an array
  if (!posts || !Array.isArray(posts)) {
    return fallbackTrendTopics;
  }

  posts.forEach((post) => {
    (post.tags ?? []).forEach((tag) => {
      const key = tag.trim();
      if (!key) return;
      tagCount.set(key, (tagCount.get(key) ?? 0) + 1);
    });
  });

  if (tagCount.size === 0) {
    return fallbackTrendTopics;
  }

  return [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({
      id: tag,
      label: tag.startsWith("#") ? tag : `#${tag}`,
      description: `Упоминаний: ${count}`,
      href: `/tags/${encodeURIComponent(tag.replace(/^#/, ""))}`
    }));
}

function mapUsersToSuggestions(users: User[]): SuggestedPerson[] {
  if (!users.length) {
    return fallbackSuggestedPeople;
  }

  return users.slice(0, 3).map((person) => {
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
    const label = fullName || person.email.split("@")[0];
    return {
      id: person.id,
      name: label,
      title: person.role ?? "Участник Собрания",
      avatarInitials: initialsFromName(label),
      mutuals: computeMutualsSeed(person.id)
    };
  });
}

function mapAssistantModesToPrompts(response: AssistantModesResponse | undefined): AiPrompts {
  const items = response?.items ?? [];
  if (!items.length) {
    return fallbackAiPrompts;
  }

  const primary = items[0];
  const candidates: string[] = [];
  primary.capabilities?.forEach((capability) => {
    candidates.push(`Как ${primary.name} помогает с ${capability}?`);
  });
  items.slice(1).forEach((mode) => {
    candidates.push(`Переключись в режим «${mode.name}»`);
  });

  return {
    headline: primary.name || fallbackAiPrompts.headline,
    description: primary.description || fallbackAiPrompts.description,
    ideas: candidates.length ? candidates.slice(0, 3) : fallbackAiPrompts.ideas
  };
}

export function useDashboardData() {
  const { user } = useSession();
  const [posts] = useUnit([$posts]);

  const navigationQuery = useQuery({
    queryKey: ["navigation", "links"],
    queryFn: () => fetchJson<NavigationResponse>("/api/navigation/links"),
    staleTime: 300_000
  });

  const assistantQuery = useQuery({
    queryKey: ["assistant", "modes"],
    queryFn: () => fetchJson<AssistantModesResponse>("/api/assistant/modes"),
    staleTime: 300_000
  });

  const usersQuery = useQuery({
    queryKey: ["users", "suggested"],
    queryFn: () => fetchJson<UsersResponse>("/api/users?limit=8"),
    enabled: Boolean(user),
    staleTime: 300_000
  });

  const navItems: NavItem[] = useMemo(() => {
    const links = navigationQuery.data?.items;
    if (!links || links.length === 0) {
      return fallbackNavItems;
    }

    return links
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((link) => ({
        id: link.id,
        label: link.title,
        href: link.url,
        icon: link.icon ?? "spark"
      }));
  }, [navigationQuery.data]);

  const aiPrompts = useMemo(() => mapAssistantModesToPrompts(assistantQuery.data), [assistantQuery.data]);

  const trendTopics = useMemo<TrendTopic[]>(() => mapPostsToTopics(posts || []), [posts]);

  const suggestedPeople = useMemo<SuggestedPerson[]>(() => {
    const people = usersQuery.data?.items ?? [];
    if (!people.length) {
      return fallbackSuggestedPeople;
    }
    return mapUsersToSuggestions(people);
  }, [usersQuery.data]);

  return {
    navItems,
    aiPrompts,
    trendTopics,
    suggestedPeople,
    posts
  };
}
