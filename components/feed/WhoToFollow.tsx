"use client";

import type { SuggestedPerson } from "@/lib/data/feed";

type WhoToFollowProps = {
  people: SuggestedPerson[];
};

export function WhoToFollow({ people }: WhoToFollowProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-dawn/60">Кого позвать</h2>
      <ul className="mt-6 space-y-4">
        {people.map((person) => (
          <li key={person.id} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white">
                {person.avatarInitials}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{person.name}</p>
                <p className="text-xs text-dawn/60">{person.title}</p>
              </div>
            </div>
            <button className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-dawn/70 transition hover:border-accent-teal/50 hover:bg-accent-teal/20 hover:text-white">
              + Пригласить
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-dawn/50">Основано на {people.reduce((sum, item) => sum + item.mutuals, 0)} совместных связях.</p>
    </section>
  );
}
