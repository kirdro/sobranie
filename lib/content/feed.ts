export const feedCopy = {
  hero: {
    title: "Пульс пространства в реальном времени",
    description:
      "Следите за эфирами, синхронной работой и вызовами, которые разворачиваются прямо сейчас в Собрании."
  },
  loops: [
    {
      id: "radio",
      title: "Радио Собрание",
      description: "Аудио-эфир с экспертами, подключение через мобильное приложение.",
      members: 128,
      intensity: "Высокая",
      icon: "spark"
    },
    {
      id: "design",
      title: "Дизайн-кружок",
      description: "Кураторская разметка статей, синхронный фидбек и эфиры каждую пятницу.",
      members: 86,
      intensity: "Средняя",
      icon: "users"
    }
  ],
  alerts: [
    {
      id: "rag-index",
      title: "RAG индекс обновлён",
      details: "Найдено 12 новых источников, 4 из них верифицированы модераторами",
      tone: "purple"
    },
    {
      id: "join-requests",
      title: "Новые заявки",
      details: "5 участников хотят присоединиться к пространству \"Исследовательский штаб\"",
      tone: "teal"
    }
  ]
} as const;

export type FeedCopy = typeof feedCopy;
