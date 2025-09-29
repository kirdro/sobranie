"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { HiOutlinePaperAirplane, HiOutlineSparkles } from "react-icons/hi2";
import { LuBookMarked } from "react-icons/lu";
import { HiArrowPath } from "react-icons/hi2";

type Message = {
  role: "assistant" | "user";
  content: string;
  sources?: Array<{ title: string; excerpt: string }>;
};

const systemSeed: Message[] = [
  {
    role: "assistant",
    content:
      "Я — проводник Собрания. Помогаю собирать знание из общих блогов, заметок и приглашать участников к диалогу."
  }
];

const knowledgeBase = [
  {
    title: "Свежие практики сообществ",
    excerpt: "Координаторы используют цикл \"созыв — разведка — сбор\" для быстрой реакции на изменения."
  },
  {
    title: "Гайд по RAG",
    excerpt: "Подготовьте 20-30 эталонных заметок, чтобы ассистент подбирал контекст с нужным тоном."
  },
  {
    title: "Сводка за 24 часа",
    excerpt: "Активность сконцентрирована в канале \"Лаборатория RAG\" и в эфире \"Радио Собрание\"."
  }
];

const emulateLLM = async (prompt: string) => {
  await new Promise((resolve) => setTimeout(resolve, 620));
  return {
    reply:
      `Сводим для вас главное по запросу \"${prompt}\". Предлагаю начать с обзорной заметки и подключить живой эфир.`,
    sources: knowledgeBase.slice(0, 2)
  };
};

export function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>(systemSeed);

  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["assistant"],
    mutationFn: emulateLLM,
    onSuccess: (result) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply,
          sources: result.sources
        }
      ]);
    }
  });

  const sources = useMemo(() => knowledgeBase, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const prompt = (formData.get("prompt") as string)?.trim();

    if (!prompt) return;

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    form.reset();
    await mutateAsync(prompt);
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <div className="grid gap-8">
        <header className="flex flex-col gap-2 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-dawn/60">ИИ-проводник</p>
          <h2 className="text-2xl font-display">Создаём общую фабрику знаний</h2>
        </header>
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-dawn/60">
              <HiOutlineSparkles className="h-5 w-5" />
              живой диалог
            </div>
            <div className="flex max-h-80 flex-col gap-4 overflow-y-auto pr-2">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "assistant"
                      ? "bg-white/10 text-dawn/80"
                      : "bg-accent-purple/20 text-white"
                  }`}
                >
                  {message.content}
                  {message.sources && (
                    <div className="mt-3 space-y-3">
                      {message.sources.map((source) => (
                        <div key={source.title} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-dawn/60">
                          <p className="font-medium text-white">{source.title}</p>
                          <p className="mt-1">{source.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="relative mt-2 flex items-center rounded-full border border-white/10 bg-white/5 pr-2">
              <input
                name="prompt"
                placeholder="Спросить проводника..."
                className="flex-1 rounded-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-dawn/40"
                aria-label="Спросить проводника"
              />
              <button
                type="submit"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-midnight transition hover:bg-white disabled:cursor-not-allowed"
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? <HiArrowPath className="h-4 w-4 animate-spin" /> : <HiOutlinePaperAirplane className="h-4 w-4" />}
              </button>
            </form>
          </div>
          <aside className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-dawn/60">
              <LuBookMarked className="h-5 w-5" />
              источники контекста
            </div>
            <ul className="space-y-3">
              {sources.map((source) => (
                <li key={source.title} className="rounded-2xl bg-white/5 p-3 text-sm text-dawn/70">
                  <p className="font-medium text-white">{source.title}</p>
                  <p className="text-xs text-dawn/60">{source.excerpt}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </div>
    </div>
  );
}
