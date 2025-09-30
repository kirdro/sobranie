"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUnit } from "effector-react";
import { registerSubmitted, $isLoading, $authError, loginSuccessful } from "@/lib/effector";
import { ButtonSpinner } from "@/components/ui/Spinner";

type FormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

const initialState: FormState = {
  email: "",
  password: "",
  firstName: "",
  lastName: ""
};

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);

  // Use Effector stores and events
  const [isLoading, error, onRegisterSubmit] = useUnit([
    $isLoading,
    $authError,
    registerSubmitted
  ]);

  // Handle successful registration navigation
  useEffect(() => {
    const unsubscribe = loginSuccessful.watch(({ redirect }) => {
      if (redirect) {
        router.push(redirect);
        router.refresh();
      }
    });

    return unsubscribe;
  }, [router]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Use Effector event to handle registration
    onRegisterSubmit({
      email: form.email,
      password: form.password,
      name: `${form.firstName} ${form.lastName}`.trim() || form.firstName || form.lastName || "User"
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-white">Создать аккаунт</h1>
        <p className="text-sm text-dawn/70">Подключитесь к сообществам и живым сигналам.</p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-left text-sm text-dawn/70">
            Имя
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-accent-teal"
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              autoComplete="given-name"
            />
          </label>
          <label className="block text-left text-sm text-dawn/70">
            Фамилия
            <input
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-accent-teal"
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              autoComplete="family-name"
            />
          </label>
        </div>
        <label className="block text-left text-sm text-dawn/70">
          Email
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-accent-teal"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </label>
        <label className="block text-left text-sm text-dawn/70">
          Пароль
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-accent-teal"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
      </div>

      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-gradient-to-r from-accent-purple via-accent-teal to-accent-amber px-4 py-3 text-sm font-semibold text-midnight transition disabled:opacity-50 flex items-center justify-center"
      >
        {isLoading && <ButtonSpinner />}
        {isLoading ? "Создаём..." : "Зарегистрироваться"}
      </button>
    </form>
  );
}

