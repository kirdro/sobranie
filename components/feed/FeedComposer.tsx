"use client";

import { FormEvent, useEffect, useState } from "react";
import { useUnit } from "effector-react";
import { HiOutlineSparkles } from "react-icons/hi";
import { postCreated, $createPostLoading, $isAuthenticated } from "@/lib/effector";

type FeedComposerProps = {
  placeholder: string;
  aiLabel: string;
  submitLabel: string;
  suggestions: string[];
  onSubmit?: (value: string) => Promise<void> | void;
};

export function FeedComposer({ placeholder, aiLabel, submitLabel, suggestions, onSubmit }: FeedComposerProps) {
  const [value, setValue] = useState("");
  const [localSuggestions, setLocalSuggestions] = useState<string[]>(suggestions);
  const [error, setError] = useState<string | null>(null);

  // Use Effector stores
  const [isAuthenticated, isCreatingPost, onCreatePost] = useUnit([
    $isAuthenticated,
    $createPostLoading,
    postCreated
  ]);

  useEffect(() => {
    setLocalSuggestions(suggestions);
  }, [suggestions]);

  const rotateSuggestions = () => {
    setLocalSuggestions((prev) => {
      if (!prev.length) {
        return prev;
      }
      return prev.slice(1).concat(prev[0]);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    if (!isAuthenticated) {
      setError("Войдите в систему, чтобы создать пост");
      return;
    }

    setError(null);
    try {
      // Use Effector event for post creation
      onCreatePost({
        content: trimmed,
        visibility: 'public',
        tags: []
      });

      // Also call legacy onSubmit if provided
      await onSubmit?.(trimmed);
      setValue("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить пост");
    }
  };

  const handleSuggestion = (next: string) => {
    setValue(next);
  };

  return (
    <section className="surface-panel rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple/60 to-accent-teal/60 text-lg font-semibold text-white">
            Сб
          </div>
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="min-h-[84px] flex-1 resize-none rounded-2xl border border-white/10 bg-midnight/60 px-5 py-4 text-sm text-dawn/70 placeholder:text-dawn/40 focus:border-accent-teal/60 focus:outline-none focus:ring-2 focus:ring-accent-teal/40"
            aria-label={placeholder}
          />
          <button
            type="button"
            onClick={() => rotateSuggestions()}
            className="hidden rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-dawn/60 transition hover:border-accent-teal/40 hover:text-white lg:block"
          >
            {aiLabel}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-dawn/50">
          {localSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestion(suggestion)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-dawn/70 transition hover:border-accent-teal/40 hover:bg-accent-teal/20 hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
        {error ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-200">{error}</p> : null}
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.25em] text-dawn/70">
            <HiOutlineSparkles className="h-4 w-4 text-accent-teal" />
            {aiLabel}
          </span>
          <button
            type="submit"
            disabled={isCreatingPost || value.trim().length === 0 || !isAuthenticated}
            className={`inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-midnight transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-midnight/60 ${
              isCreatingPost ? "animate-pulse" : ""
            }`}
            aria-busy={isCreatingPost}
          >
            {isCreatingPost ? "Отправка..." : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
