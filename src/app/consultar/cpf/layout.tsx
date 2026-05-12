import { Logo } from "@/components/brand/logo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mesh-brand relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <header className="relative bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Logo height={36} />
          <Link href="/" className="text-sm text-gray-500 hover:text-forest-700 inline-flex items-center gap-1.5">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 py-8 lg:py-14">
        {children}
      </main>
    </div>
  );
}
