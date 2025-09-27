"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuBell, LuCompass, LuHouse, LuLibrary, LuSparkles } from "react-icons/lu";

import type { NavItem } from "@/lib/data/feed";

const iconMap: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
  home: LuHouse,
  feed: LuCompass,
  spark: LuSparkles,
  globe: LuLibrary,
  bell: LuBell
};

type SidebarNavProps = {
  items: NavItem[];
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="surface-panel flex h-full flex-col justify-between rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent-purple/70 via-accent-teal/60 to-accent-amber/50 text-lg font-bold text-white shadow-neon">
            Сб
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/20" />
          </div>
          <div>
            <p className="text-lg font-display uppercase tracking-[0.32em] text-white">Собрание</p>
            <p className="text-xs text-dawn/60">сеть живых сигналов</p>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-4 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-accent-teal/50 bg-white/10 text-white shadow-neon"
                      : "text-dawn/60 hover:border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="relative">
                    <span className="absolute inset-0 rounded-full bg-accent-teal/30 blur group-hover:opacity-90" />
                    <Icon className="relative z-10 h-5 w-5" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-dawn/70">
        <p className="font-semibold text-white">ИИ-пульс дня</p>
        <p className="mt-2 text-dawn/60">
          Наблюдаем всплеск обсуждений про realtime RAG. Подготовьте сигналы для вечернего эфира.
        </p>
      </div>
    </nav>
  );
}
