import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  height?: number;
  priority?: boolean;
}

export function Logo({ href = "/", className, height = 44, priority = false }: LogoProps) {
  const img = (
    <Image
      src="/brand/lnb-logo.svg"
      alt="Limpa Nome Brazil"
      width={Math.round(height * 2.83)}
      height={height}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
  if (!href) return img;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Limpa Nome Brazil — Início">
      {img}
    </Link>
  );
}
