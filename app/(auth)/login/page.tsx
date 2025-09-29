import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <LoginForm />
      <p className="text-center text-sm text-dawn/60">
        Нет аккаунта? <Link href="/register" className="text-accent-teal transition hover:text-white">Зарегистрируйтесь</Link>
      </p>
    </div>
  );
}

