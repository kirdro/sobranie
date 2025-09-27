export const dashboardCopy = {
  hero: {
    title: "Собрание — живая лента вашего сообщества",
    description:
      "Следите за сигналами, запускайте коллективные эфиры и подключайте ИИ-ассистента для анализа того, что происходит прямо сейчас."
  },
  livePulse: {
    title: "Живой поток",
    subtitle: "обновление каждые 6 сек"
  },
  heatmap: {
    label: "Карта дня",
    headline: "Тепловая сетка активности",
    hint: "1 284 участников в онлайне, 8 эфиров запланировано на сегодня."
  },
  composer: {
    placeholder: "Что происходит в вашем сообществе?",
    draftBadge: "черновик",
    aiLabel: "ИИ-подсказка",
    submit: "Запросить сигнал"
  }
} as const;

export type DashboardCopy = typeof dashboardCopy;
