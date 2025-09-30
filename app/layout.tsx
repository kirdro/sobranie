import "effector/enable_debug_traces";
import "./globals.css";

import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { Background } from "@components/layout/Background";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Собрание — социальная сеть следующей волны",
  description:
    "Собрание — это социальная сеть с живым знанием и правдой момента. Реалтайм, ИИ, коллективные блоги.",
  icons: {
    icon: "/favicon.ico"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Note: Skip initial user for now to avoid type conflicts between API and local types
  // SessionProvider will handle session checking

  return (
    <html lang="ru" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="relative flex min-h-screen flex-col overflow-x-hidden">
        <Background />
        <Providers initialUser={null}>
          <main className="relative z-10 flex min-h-screen flex-col px-4 pb-8 pt-6 md:px-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
