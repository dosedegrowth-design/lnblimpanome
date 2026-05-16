"use client";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Banner que avisa quando modo teste está ativo (cobrança vira R$ 5,00).
 * Aparece nas páginas /consultar/* e /contratar.
 */
export function ModoTesteBanner() {
  const [modoTeste, setModoTeste] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/site/modo-teste")
      .then((r) => r.json())
      .then((d) => setModoTeste(!!d.modo_teste))
      .catch(() => setModoTeste(false));
  }, []);

  if (!modoTeste) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2 justify-center">
        <AlertTriangle className="size-4 shrink-0" />
        <span>
          <strong>Modo de teste ativo</strong> — esta operação cobrará apenas <strong>R$ 5,00</strong> em vez do valor exibido.
        </span>
      </div>
    </div>
  );
}
