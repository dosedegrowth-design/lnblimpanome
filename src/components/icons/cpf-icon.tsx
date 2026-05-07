import type { SVGProps } from "react";

/**
 * Ícone customizado de CPF — documento estilizado com identificação pessoal.
 */
export function CpfIcon({
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* contorno do documento */}
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      {/* faixa título */}
      <line x1="3" y1="8" x2="21" y2="8" />
      {/* avatar/foto */}
      <circle cx="8.5" cy="13" r="2" />
      <path d="M5.5 18c.5-1.6 1.7-2.6 3-2.6s2.5 1 3 2.6" />
      {/* linhas de informação CPF */}
      <line x1="14" y1="12" x2="18.5" y2="12" />
      <line x1="14" y1="15" x2="18.5" y2="15" />
      <line x1="14" y1="18" x2="17" y2="18" />
    </svg>
  );
}
