import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo oficial LNB.
 * Source: public/brand/lnb-logo.png (1172×448, ratio ~2.62)
 *
 * variant:
 *   "color" → versão original (azul + cinza chumbo) sobre fundo claro
 *   "mono"  → mesma logo mas com filter CSS pra ficar branca em fundos escuros
 */
interface LogoProps {
  href?: string | null;
  className?: string;
  height?: number;
  priority?: boolean;
  variant?: "color" | "mono";
}

const NATIVE_W = 1172;
const NATIVE_H = 448;
const RATIO = NATIVE_W / NATIVE_H; // ~2.616

export function Logo({
  href = "/",
  className,
  height = 44,
  priority = false,
  variant = "color",
}: LogoProps) {
  const img = (
    <Image
      src="/brand/lnb-logo.png"
      alt="Limpa Nome Brazil"
      width={Math.round(height * RATIO)}
      height={height}
      className={cn(
        "object-contain select-none",
        variant === "mono" && "brightness-0 invert",
        className
      )}
      priority={priority}
    />
  );
  if (!href) return img;
  return (
    <Link
      href={href}
      className="inline-flex items-center"
      aria-label="Limpa Nome Brazil — Início"
    >
      {img}
    </Link>
  );
}
