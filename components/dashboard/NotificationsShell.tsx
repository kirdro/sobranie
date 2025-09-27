"use client";

import { DashboardLayout } from "@components/dashboard/DashboardLayout";
import { notificationsCopy } from "@/lib/content/notifications";

export function NotificationsShell() {
  return (
    <DashboardLayout hero={notificationsCopy.hero}>
      <section className="grid gap-6 xl:grid-cols-2">
        {notificationsCopy.streams.map((stream) => (
          <article key={stream.id} className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-dawn/60">{stream.description}</p>
              <h2 className="text-xl font-semibold text-white">{stream.title}</h2>
            </header>
            <ul className="mt-6 space-y-4">
              {stream.entries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="space-y-2 text-sm text-dawn/70">
                    <p className="text-white">
                      <span className="font-semibold">{entry.actor}</span> {entry.message}
                    </p>
                    <span className="text-xs text-dawn/50">{entry.time}</span>
                  </div>
                  <button className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/50 hover:text-white">
                    {entry.cta}
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
        <p className="text-xs uppercase tracking-[0.25em] text-dawn/60">{notificationsCopy.summary.label}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {notificationsCopy.summary.highlights.map((highlight) => (
            <article key={highlight.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-dawn/70">
              <p className="text-lg font-semibold text-white">{highlight.title}</p>
              <p className="mt-2 text-xs text-dawn/60">{highlight.note}</p>
            </article>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}
