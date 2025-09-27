"use client";

import type { AiPrompts } from "@/lib/data/feed";

const accentRing = ["from-accent-purple/60", "via-accent-teal/40", "to-accent-amber/40"].join(" ");

type AiSignalPanelProps = {
  data: AiPrompts;
  className?: string;
};

export function AiSignalPanel({ data, className }: AiSignalPanelProps) {
  const baseClass =
    "relative overflow-hidden rounded-[28px] border border-accent-purple/30 bg-midnight/70 p-6 backdrop-blur-2xl";

  return (
    <section className={className ? `${baseClass} ${className}` : baseClass}>
      <div className="pointer-events-none absolute -right-24 top-0 h-48 w-48 bg-mesh-aurora opacity-40" />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-gradient-to-br from-accent-purple/40 via-accent-teal/40 to-accent-amber/20 blur-2xl" />
      <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-accent-teal">{data.headline}</h2>
      <p className="mt-4 text-sm text-dawn/70">{data.description}</p>
      <ul className="mt-6 space-y-3 text-xs text-dawn/60">
        {data.ideas.map((idea) => (
          <li key={idea} className="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className={`absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-gradient-to-br ${accentRing}`} />
            <span className="ml-4 block">{idea}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
