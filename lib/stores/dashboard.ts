import { createEvent, createStore } from "effector";

import type { AiPrompts, FeedPost, NavItem, SuggestedPerson, TrendTopic } from "@/lib/data/feed";
import { aiPrompts, feedPosts, navItems, suggestedPeople, trendTopics } from "@/lib/data/feed";

export const setNavItems = createEvent<NavItem[]>();
export const setFeedPosts = createEvent<FeedPost[]>();
export const setTrendTopics = createEvent<TrendTopic[]>();
export const setSuggestedPeople = createEvent<SuggestedPerson[]>();
export const updateAiPrompts = createEvent<AiPrompts>();

export const $navItems = createStore<NavItem[]>(navItems).on(setNavItems, (_, items) => items);
export const $feedPosts = createStore<FeedPost[]>(feedPosts).on(setFeedPosts, (_, posts) => posts);
export const $trendTopics = createStore<TrendTopic[]>(trendTopics).on(setTrendTopics, (_, topics) => topics);
export const $suggestedPeople = createStore<SuggestedPerson[]>(suggestedPeople).on(setSuggestedPeople, (_, list) => list);
export const $aiPrompts = createStore<AiPrompts>(aiPrompts).on(updateAiPrompts, (_, payload) => payload);

export const rotateAiPrompts = createEvent();

$aiPrompts.on(rotateAiPrompts, (state) => ({
  ...state,
  ideas: state.ideas.slice(1).concat(state.ideas[0])
}));

export type DashboardStores = {
  navItems: NavItem[];
  feedPosts: FeedPost[];
  trendTopics: TrendTopic[];
  suggestedPeople: SuggestedPerson[];
  aiPrompts: AiPrompts;
};

export function getDashboardState(): DashboardStores {
  return {
    navItems: $navItems.getState(),
    feedPosts: $feedPosts.getState(),
    trendTopics: $trendTopics.getState(),
    suggestedPeople: $suggestedPeople.getState(),
    aiPrompts: $aiPrompts.getState()
  };
}
