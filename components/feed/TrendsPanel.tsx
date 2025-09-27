"use client";

import Link from "next/link";

import type { TrendTopic } from "@/lib/data/feed";

type TrendsPanelProps = {
  topics: TrendTopic[];
};

export function TrendsPanel({ topics }: TrendsPanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-dawn/60">Тренды для вас</h2>
        <Link href="/trends" className="text-xs text-accent-teal hover:text-white">
          все
        </Link>
      </header>
      <ul className="mt-6 space-y-5">
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link href={topic.href} className="group block">
              <p className="text-sm font-semibold text-white group-hover:text-accent-teal">{topic.label}</p>
              <p className="text-xs text-dawn/60">{topic.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
