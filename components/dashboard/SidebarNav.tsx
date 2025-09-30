"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useUnit } from "effector-react";
import { LuBell, LuCompass, LuHouse, LuLibrary, LuLogOut, LuSparkles, LuLogIn, LuUserPlus, LuUser } from "react-icons/lu";

import { useSession } from "@/components/auth/SessionProvider";
import { $isAuthenticated, $user, logoutTriggered } from "@/lib/effector";
import type { NavItem } from "@/lib/data/feed";
import { initialsFromName } from "@/lib/data/feed";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: LuHouse,
  feed: LuCompass,
  spark: LuSparkles,
  globe: LuLibrary,
  bell: LuBell
};

const fallbackIcon = LuCompass;

type SidebarNavProps = {
  items: NavItem[];
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: sessionUser, setUser } = useSession();

  // Use Effector stores
  const [isAuthenticated, user, onLogout] = useUnit([
    $isAuthenticated,
    $user,
    logoutTriggered
  ]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    onLogout();
    router.replace("/");
    router.refresh();
  }, [router, setUser, onLogout]);

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
            const Icon = iconMap[item.icon] ?? fallbackIcon;
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
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-xs text-dawn/70">
          <p className="font-semibold text-white">ИИ-пульс дня</p>
          <p className="mt-2 text-dawn/60">
            Наблюдаем всплеск обсуждений про realtime RAG. Подготовьте сигналы для вечернего эфира.
          </p>
        </div>
        {isAuthenticated && user ? (
          <div className="space-y-3">
            <Link href="/profile" className="group block">
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 transition hover:border-accent-teal/50 hover:bg-white/15 hover:shadow-neon">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white group-hover:border-accent-teal/30">
                  {initialsFromName(user.name || user.email)}
                </div>
                <div className="flex-1 text-xs text-dawn/60">
                  <p className="text-sm font-semibold text-white group-hover:text-accent-teal transition">{user.name || user.email}</p>
                  <p className="group-hover:text-dawn/80 transition">{user.email}</p>
                </div>
                <LuUser className="h-4 w-4 text-dawn/40 group-hover:text-accent-teal transition" />
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/50 hover:bg-white/10 hover:text-white"
            >
              <LuLogOut className="h-4 w-4" />
              выйти
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Link
              href="/login"
              className="group flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm transition hover:border-accent-teal/50 hover:bg-white/10 hover:shadow-neon"
            >
              <span className="relative">
                <span className="absolute inset-0 rounded-full bg-accent-teal/30 blur group-hover:opacity-90" />
                <LuLogIn className="relative z-10 h-5 w-5 text-accent-teal" />
              </span>
              <div>
                <p className="font-semibold text-white">Войти</p>
                <p className="text-xs text-dawn/60">В живую сеть сигналов</p>
              </div>
            </Link>
            <Link
              href="/register"
              className="group flex items-center gap-3 rounded-3xl border border-white/10 bg-gradient-to-r from-accent-purple/10 via-accent-teal/10 to-accent-amber/10 p-4 text-sm transition hover:from-accent-purple/20 hover:via-accent-teal/20 hover:to-accent-amber/20 hover:shadow-glow"
            >
              <span className="relative">
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-purple via-accent-teal to-accent-amber blur group-hover:opacity-90" />
                <LuUserPlus className="relative z-10 h-5 w-5 text-white" />
              </span>
              <div>
                <p className="font-semibold text-white">Регистрация</p>
                <p className="text-xs text-dawn/60">Подключиться к Собранию</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
