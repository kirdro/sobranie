"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineSparkles, HiOutlineHome, HiOutlineChatAlt2 } from "react-icons/hi";
import { PiArticleMediumLight } from "react-icons/pi";

const links = [
  { href: "/", label: "Обзор", icon: HiOutlineSparkles },
  { href: "/feed", label: "Поток", icon: HiOutlineHome },
  { href: "/llm", label: "Интеллект", icon: HiOutlineChatAlt2 },
  { href: "#blogs", label: "Блоги", icon: PiArticleMediumLight }
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2 backdrop-blur-2xl shadow-glow">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = href !== "#blogs" && pathname === href;

        return (
          <Link
            key={href}
            href={href === "#blogs" ? "/feed#blogs" : href}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
              isActive
                ? "bg-white/20 text-white shadow-neon"
                : "text-dawn/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
