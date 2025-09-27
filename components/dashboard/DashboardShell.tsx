"use client";

import { ActivityStream } from "@components/feed/ActivityStream";
import { AiSignalPanel } from "@components/feed/AiSignalPanel";
import { FeedComposer } from "@components/feed/FeedComposer";
import { FeedTimeline } from "@components/feed/FeedTimeline";
import { DashboardLayout } from "@components/dashboard/DashboardLayout";
import { dashboardCopy } from "@/lib/content/dashboard";
import { useDashboardData } from "./useDashboardData";

export function DashboardShell() {
  const { aiPrompts } = useDashboardData();

  return (
    <DashboardLayout hero={dashboardCopy.hero} mobileAside={null}>
      <FeedComposer
        placeholder={dashboardCopy.composer.placeholder}
        aiLabel={dashboardCopy.composer.aiLabel}
        submitLabel={dashboardCopy.composer.submit}
        suggestions={aiPrompts.ideas}
      />
      <div className="xl:hidden">
        <AiSignalPanel data={aiPrompts} />
      </div>
      <FeedTimeline />
      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-dawn/60">{dashboardCopy.livePulse.title}</h2>
          <span className="text-xs text-accent-teal">{dashboardCopy.livePulse.subtitle}</span>
        </header>
        <div className="mt-6">
          <ActivityStream />
        </div>
      </section>
    </DashboardLayout>
  );
}
