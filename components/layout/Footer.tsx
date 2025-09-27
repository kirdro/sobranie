import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-20 mt-20 border-t border-white/10 px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-dawn/60">
          © {new Date().getFullYear()} Собрание. Сообщество, которое чувствует импульс момента.
        </p>
        <div className="flex gap-6 text-sm text-dawn/60">
          <Link href="/">Принципы</Link>
          <Link href="/">Конфиденциальность</Link>
          <Link href="/">Контакты</Link>
        </div>
      </div>
    </footer>
  );
}
