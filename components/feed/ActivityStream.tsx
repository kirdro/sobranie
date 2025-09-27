"use client";

import { ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiOutlineLightningBolt, HiOutlineChat, HiOutlinePhotograph } from "react-icons/hi";
import { LuClock3, LuShare2 } from "react-icons/lu";

const fetchActivity = async () => {
  await new Promise((resolve) => setTimeout(resolve, 420));
  return [
    {
      id: "pulse-1",
      title: "Экспедиция RAG",
      author: "Агата Н.",
      description: "Собрали подборку материалов про цифровой гуманизм. ИИ выделил 3 свежих цитаты.",
      tags: ["RAG", "анализ"],
      icon: HiOutlineLightningBolt,
      status: "live"
    },
    {
      id: "pulse-2",
      title: "Подкаст-эфир",
      author: "Модуль Миссия",
      description: "Запускаем аудио-чат, подключайтесь со своими вопросами и историями.",
      tags: ["эфир", "сообщество"],
      icon: HiOutlineChat,
      status: "soon"
    },
    {
      id: "pulse-3",
      title: "Визуальный отчёт",
      author: "Ярослав Т.",
      description: "Опубликовал визуализацию роста подписчиков и откликов за последнюю неделю.",
      tags: ["growth", "визуал"],
      icon: HiOutlinePhotograph,
      status: "replay"
    }
  ] as const;
};

type Activity = Awaited<ReturnType<typeof fetchActivity>>[number];

const statusMeta: Record<Activity["status"], { label: string; accent: string; icon: ReactNode }> = {
  live: {
    label: "В эфире",
    accent: "bg-red-400/80",
    icon: <HiOutlineLightningBolt className="h-4 w-4" />
  },
  soon: {
    label: "Скоро",
    accent: "bg-amber-400/80",
    icon: <LuClock3 className="h-4 w-4" />
  },
  replay: {
    label: "Запись",
    accent: "bg-accent-teal/60",
    icon: <LuShare2 className="h-4 w-4" />
  }
};

export function ActivityStream() {
  const { data, isLoading } = useQuery({ queryKey: ["activity"], queryFn: fetchActivity, refetchInterval: 6000 });

  const pulses = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="surface-panel animate-pulse rounded-[24px] p-6 text-sm text-dawn/50">
          Загружаем живой поток...
        </div>
      )}
      {pulses.map((item) => {
        const meta = statusMeta[item.status];
        const Icon = item.icon;

        return (
          <article
            key={item.id}
            className="surface-panel group grid gap-5 rounded-[24px] border border-white/10 p-6 transition hover:border-white/20 hover:bg-white/10 sm:grid-cols-[auto,1fr] sm:items-center"
          >
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Icon className="h-6 w-6" />
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-midnight ${meta.accent}`}>
                {meta.icon}
                {meta.label}
              </span>
            </div>
            <div className="space-y-4">
              <header className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-dawn/60">{item.author}</p>
              </header>
              <p className="text-sm text-dawn/70">{item.description}</p>
              <div className="flex flex-wrap gap-3">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-dawn/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
