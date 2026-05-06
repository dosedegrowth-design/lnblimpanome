import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  height?: number;
  priority?: boolean;
  variant?: "color" | "mono";
}

export function Logo({
  href = "/",
  className,
  height = 44,
  priority = false,
  variant = "color",
}: LogoProps) {
  const src = variant === "mono" ? "/brand/lnb-logo-mono.svg" : "/brand/lnb-logo.svg";
  const img = (
    <Image
      src={src}
      alt="Limpa Nome Brazil"
      width={Math.round(height * 2.83)}
      height={height}
      className={cn("object-contain select-none", className)}
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
