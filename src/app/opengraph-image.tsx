import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Limpa Nome Brazil — Limpe seu nome 100% digital";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #13312e 0%, #1f5d5d 50%, #0298d9 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            padding: "12px 24px",
            borderRadius: 999,
            fontSize: 24,
            fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.25)",
            alignSelf: "flex-start",
          }}
        >
          <span style={{ fontSize: 28 }}>✨</span>
          100% digital · resultado em minutos
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 50,
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          <span>Seu nome <span style={{ color: "#7dd3fc" }}>limpo</span>,</span>
          <span>sem sair de casa.</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 500,
            maxWidth: 900,
          }}
        >
          Consulte CPF, limpe seu nome e ative blindagem de crédito sem precisar quitar a dívida.
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 40,
            borderTop: "1px solid rgba(255,255,255,0.2)",
            fontSize: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "white",
                color: "#0298d9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 24,
              }}
            >
              LNB
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 700 }}>Limpa Nome Brazil</div>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
                limpanomebrazil.com.br
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 22,
              color: "rgba(255,255,255,0.85)",
              fontWeight: 600,
            }}
          >
            <span>10mil+ atendidos</span>
            <span>·</span>
            <span>87,5% sucesso</span>
            <span>·</span>
            <span>4,9/5</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
