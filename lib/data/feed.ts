export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export type FeedPost = {
  id: string;
  author: {
    name: string;
    role?: string | null;
    avatarInitials: string;
  };
  createdAt: string;
  content: string;
  tags: string[];
  stats: {
    comments: number;
    boosts: number;
    signals: number;
  };
  accent?: "globe" | "neural" | "aurora" | string;
};

export type TrendTopic = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type SuggestedPerson = {
  id: string;
  name: string;
  title: string;
  avatarInitials: string;
  mutuals: number;
};

export type AiPrompts = {
  headline: string;
  description: string;
  ideas: string[];
};

export function initialsFromName(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (!parts.length) return "";
  const [first, second] = parts;
  if (parts.length === 1) {
    return first.length >= 2 ? first.slice(0, 2).toUpperCase() : first.toUpperCase();
  }
  return `${first[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase();
}

