import type { Metadata } from "next";
import { Questrial, Quicksand } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const questrial = Questrial({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Limpa Nome Brazil — Limpe seu nome 100% digital",
    template: "%s · Limpa Nome Brazil",
  },
  description:
    "Consulta de CPF, limpeza de nome e blindagem de crédito 100% digital. Resultado em minutos, sem sair de casa.",
  metadataBase: new URL("https://limpanomebrazil.com.br"),
  openGraph: {
    title: "Limpa Nome Brazil — Limpe seu nome 100% digital",
    description:
      "Consulta de CPF, limpeza de nome e blindagem de crédito. Resultado em minutos.",
    url: "https://limpanomebrazil.com.br",
    siteName: "Limpa Nome Brazil",
    locale: "pt_BR",
    type: "website",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${questrial.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <Toaster position="top-right" richColors closeButton theme="light" />
      </body>
    </html>
  );
}
