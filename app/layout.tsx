import type { Metadata } from "next";
import "./globals.css";
import "./readability.css";
import "./tabletop.css";
import "./quick-actions.css";
import "./encounters.css";
import "./conditions.css";
import "./modal-layout.css";

export const metadata: Metadata = {
  title: "Nexo — Seu universo de RPG",
  description:
    "Campanhas, fichas interativas e rolagens. Toda história começa com uma escolha.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
