import type { Metadata, Viewport } from "next";
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

const SITE_URL = "https://limpanomebrazil.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Limpa Nome Brazil — Limpe seu nome 100% digital, sem quitar dívida",
    template: "%s · Limpa Nome Brazil",
  },
  description:
    "Consulte CPF ou CNPJ, limpe seu nome 100% digital. Resultado em até 20 dias úteis, sem precisar quitar a dívida. Monitoramento 12 meses bônus. Mais de 10 mil pessoas atendidas.",
  applicationName: "Limpa Nome Brazil",
  authors: [{ name: "Limpa Nome Brazil" }],
  generator: "Next.js",
  keywords: [
    "limpar nome",
    "limpar nome sujo",
    "limpa nome",
    "consulta CPF",
    "consultar CPF",
    "score de crédito",
    "consultar CNPJ",
    "consulta CNPJ",
    "limpar nome empresa",
    "Serasa",
    "SPC",
    "Boa Vista",
    "tirar nome do SPC",
    "limpar nome online",
    "limpa nome brazil",
    "regularizar CPF",
    "Cadastro Positivo",
    "negativação",
    "renegociação dívida",
    "dívida atrasada",
    "score baixo",
    "monitoramento de CPF",
  ],
  referrer: "origin-when-cross-origin",
  creator: "Limpa Nome Brazil",
  publisher: "Limpa Nome Brazil",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
    },
  },
  openGraph: {
    title: "Limpa Nome Brazil — Limpe seu nome 100% digital",
    description:
      "Consulta de CPF ou CNPJ, limpeza de nome 100% digital. Resultado em minutos, sem sair de casa, sem quitar a dívida.",
    url: SITE_URL,
    siteName: "Limpa Nome Brazil",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Limpa Nome Brazil — Limpeza de nome 100% digital",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Limpa Nome Brazil — Limpe seu nome 100% digital",
    description:
      "Consulta de CPF ou CNPJ, limpeza de nome 100% digital.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
  verification: {
    // adicionar conforme criar conta no Search Console
    // google: "xxxxx",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0298d9" },
    { media: "(prefers-color-scheme: dark)", color: "#13312e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // JSON-LD: Organization + WebSite
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Limpa Nome Brazil",
        url: SITE_URL,
        logo: `${SITE_URL}/brand/lnb-logo.png`,
        sameAs: [],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+55-11-99744-0101",
            contactType: "customer service",
            areaServed: "BR",
            availableLanguage: ["Portuguese"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Limpa Nome Brazil",
        description:
          "Consulta de CPF ou CNPJ, limpeza de nome 100% digital.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "pt-BR",
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/#servico-limpeza`,
        name: "Limpeza de Nome",
        description:
          "Limpamos seu nome em até 20 dias úteis sem necessidade de quitar a dívida.",
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: "BR",
        offers: {
          "@type": "Offer",
          price: "500.00",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/#servico-consulta`,
        name: "Consulta de CPF",
        description:
          "Consulte seu CPF e descubra pendências, score de crédito e credores.",
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: "BR",
        offers: {
          "@type": "Offer",
          price: "29.99",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };

  return (
    <html
      lang="pt-BR"
      className={`${questrial.variable} ${quicksand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster position="top-right" richColors closeButton theme="light" />
      </body>
    </html>
  );
}
