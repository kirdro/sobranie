import Link from "next/link";
import { MainNav } from "./MainNav";

export function Header() {
  return (
    <header className="relative z-20 flex flex-col gap-6 px-6 pt-10 sm:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-neon">
            <span className="text-xl font-bold text-white">Сб</span>
            <div className="absolute inset-0 rounded-2xl border border-white/20" />
          </div>
          <div>
            <p className="text-lg font-display uppercase tracking-[0.3em] text-white">
              Собрание
            </p>
            <p className="text-xs text-dawn/70">социальная сеть нового созыва</p>
          </div>
        </Link>
        <div className="hidden lg:block">
          <MainNav />
        </div>
      </div>
      <div className="lg:hidden">
        <MainNav />
      </div>
    </header>
  );
}
