"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuCalendarClock, LuTrendingUp } from "react-icons/lu";

import { DashboardLayout } from "@components/dashboard/DashboardLayout";
import { circlesCopy } from "@/lib/content/circles";
import type { CirclesResponse } from "@/lib/api/circles";
import { fetchJson } from "@/lib/frontend/fetch-json";

const toneMap: Record<"purple" | "teal", string> = {
  purple: "from-accent-purple/40 via-transparent to-accent-teal/20",
  teal: "from-accent-teal/40 via-transparent to-accent-amber/20"
};

type SpotlightCommunity = {
  id: string;
  name: string;
  focus: string;
  members: number;
  status: string;
  description: string;
  tone: "purple" | "teal";
};

function mapCirclesToSpotlight(response: CirclesResponse | undefined): SpotlightCommunity[] {
  const items = response?.items ?? [];
  if (!items.length) {
    return [...circlesCopy.spotlight.communities];
  }

  return items.slice(0, 4).map((circle, index) => ({
    id: circle.id,
    name: circle.name,
    focus: circle.description?.slice(0, 32) || "открытая сцена",
    members: circle.memberCount,
    status: circle.isPrivate ? "по приглашению" : "открыт",
    description: circle.description ?? "Создавайте события и подключайте ассистента",
    tone: index % 2 === 0 ? "purple" : "teal"
  }));
}

export function CirclesShell() {
  const circlesQuery = useQuery({
    queryKey: ["circles", "list"],
    queryFn: () => fetchJson<CirclesResponse>("/api/circles?limit=6"),
    staleTime: 60_000
  });

  const spotlight = useMemo(() => mapCirclesToSpotlight(circlesQuery.data), [circlesQuery.data]);

  return (
    <DashboardLayout hero={circlesCopy.hero}>
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-dawn/60">{circlesCopy.spotlight.label}</p>
            <h2 className="mt-3 text-xl font-semibold text-white">Сейчас в фокусе</h2>
          </div>
          <LuTrendingUp className="h-6 w-6 text-accent-teal" />
        </header>
        {circlesQuery.isLoading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-[24px] border border-white/10 bg-white/10" />
            <div className="h-40 animate-pulse rounded-[24px] border border-white/10 bg-white/10" />
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {spotlight.map((community) => (
              <article key={community.id} className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className={`absolute inset-0 bg-gradient-to-br ${toneMap[community.tone]} opacity-50`} />
                <div className="relative z-10 space-y-3 text-sm text-dawn/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">{community.name}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-dawn/60">фокус: {community.focus}</p>
                    </div>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                      {community.status}
                    </span>
                  </div>
                  <p>{community.description}</p>
                  <footer className="flex items-center justify-between text-xs text-dawn/60">
                    <span>Участников: {community.members}</span>
                    <button className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/50 hover:text-white">
                      открыть панель
                    </button>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
        <header className="flex items-center gap-3 text-white">
          <LuCalendarClock className="h-6 w-6" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-dawn/60">{circlesCopy.backlog.label}</p>
            <h2 className="text-xl font-semibold">План на неделю</h2>
          </div>
        </header>
        <div className="mt-6 space-y-4">
          {circlesCopy.backlog.items.map((item) => (
            <article key={item.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <header className="flex items-center justify-between text-sm text-white">
                <p className="font-semibold">{item.title}</p>
                <span className="text-xs uppercase tracking-[0.2em] text-dawn/60">{item.due}</span>
              </header>
              <p className="mt-2 text-xs text-dawn/60">{item.owner}</p>
              <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-accent-purple/70 to-accent-teal/70" style={{ width: `${item.progress}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}

