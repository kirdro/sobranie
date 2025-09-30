"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { DashboardLayout } from "@components/dashboard/DashboardLayout";
import { notificationsCopy } from "@/lib/content/notifications";
import type { NotificationsResponse } from "@/lib/api/types";
import { fetchJson } from "@/lib/frontend/fetch-json";
import { useSession } from "@/components/auth/SessionProvider";
import { PanelSpinner } from "@/components/ui/Spinner";

type NotificationEntry = NotificationsResponse["items"][number];

function formatNotificationMessage(entry: NotificationEntry) {
  return entry.message;
}

export function NotificationsShell() {
  const { user } = useSession();
  const notificationsQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => fetchJson<NotificationsResponse>("/api/notifications"),
    enabled: Boolean(user),
    staleTime: 30_000
  });

  const hasNotifications = (notificationsQuery.data?.items?.length ?? 0) > 0;
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const notifications = useMemo(() => notificationsQuery.data?.items ?? [], [notificationsQuery.data]);

  return (
    <DashboardLayout hero={notificationsCopy.hero}>
      {!user ? (
        <section className="rounded-[28px] border border-accent-teal/30 bg-accent-teal/10 p-6 text-sm text-accent-teal">
          <p className="text-base font-semibold text-white">Войдите, чтобы увидеть уведомления</p>
          <p className="mt-2 text-sm text-accent-teal/80">
            После авторизации мы покажем приглашения, ответы ассистента и сигналы из ваших кругов.
          </p>
        </section>
      ) : null}

      {user ? (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-dawn/60">Центр входящих</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {hasNotifications ? "Свежие уведомления" : "Пока тихо"}
              </h2>
            </div>
            <span className="rounded-full border border-accent-teal/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent-teal/80">
              непрочитанные: {unreadCount}
            </span>
          </header>
          {notificationsQuery.isLoading ? (
            <PanelSpinner text="Загружаем уведомления..." />
          ) : hasNotifications ? (
            <ul className="mt-6 space-y-4">
              {notifications.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="space-y-2 text-sm text-dawn/70">
                    <p className="text-white">{formatNotificationMessage(entry)}</p>
                    <span className="text-xs text-dawn/50">{new Date(entry.createdAt).toLocaleString("ru-RU")}</span>
                  </div>
                  {entry.isRead ? (
                    <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-dawn/60">
                      прочитано
                    </span>
                  ) : (
                    <span className="rounded-full border border-accent-teal/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent-teal/80">
                      новое
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-dawn/60">
              Новых уведомлений нет. Проверьте приглашения позже.
            </p>
          )}
        </section>
      ) : null}

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
