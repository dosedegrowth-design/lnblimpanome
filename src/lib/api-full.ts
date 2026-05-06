/**
 * API Full — consulta de CPF (Boa Vista / Serasa).
 * Endpoint: https://app.apifull.com.br
 */

const API_FULL_BASE = "https://api.apifull.com.br";

function token(): string {
  const t = process.env.API_FULL_TOKEN ||
    "eyJpc3MiOiJhcGkuYXBpZnVsbC5jb20uYnIiLCJpYXQiOjE3Nzc5ODEzMDAsImV4cCI6MTgwOTU2MDUwMCwic3ViIjoiZG9zZWRlZ3Jvd3RoQGdtYWlsLmNvbSJ9.jVWZJ8yg177SJb1843lJfmeZkukL2gRFmfsaPTFEaPQ=";
  return t;
}

export interface APIFullResultado {
  Score?: number;
  RegistroDeDebitos?: Array<{ Credor?: string; Valor?: number | string; Data?: string }>;
  Protestos?: Array<{ Credor?: string; Valor?: number | string; Data?: string }>;
  Identificacao?: Record<string, unknown>;
  [k: string]: unknown;
}

export async function consultarCPF(cpf: string): Promise<APIFullResultado> {
  const cleanCpf = cpf.replace(/\D/g, "");
  const r = await fetch(`${API_FULL_BASE}/api/e-boavista`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document: cleanCpf, link: "e-boavista" }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`API Full erro ${r.status}: ${t}`);
  }

  const json = (await r.json()) as { data?: APIFullResultado } | APIFullResultado;
  return ("data" in json && json.data ? json.data : json) as APIFullResultado;
}

export interface ParsedConsulta {
  tem_pendencia: boolean;
  qtd_pendencias: number;
  total_dividas: number;
  pendencias: Array<{ credor: string; valor: number; data: string }>;
  resumo: string;
}

export function parseConsulta(r: APIFullResultado): ParsedConsulta {
  const pendencias: ParsedConsulta["pendencias"] = [];
  let total = 0;

  if (Array.isArray(r.RegistroDeDebitos)) {
    for (const d of r.RegistroDeDebitos) {
      const valor = parseFloat(String(d.Valor ?? 0)) || 0;
      pendencias.push({
        credor: d.Credor || "Desconhecido",
        valor,
        data: d.Data || "",
      });
      total += valor;
    }
  }
  if (Array.isArray(r.Protestos)) {
    for (const p of r.Protestos) {
      const valor = parseFloat(String(p.Valor ?? 0)) || 0;
      pendencias.push({
        credor: p.Credor || "Protesto",
        valor,
        data: p.Data || "",
      });
      total += valor;
    }
  }

  const tem_pendencia = pendencias.length > 0;
  const resumo = tem_pendencia
    ? `${pendencias.length} pendência(s), total R$ ${total.toFixed(2)}`
    : "Nome limpo — sem pendências";

  return {
    tem_pendencia,
    qtd_pendencias: pendencias.length,
    total_dividas: total,
    pendencias,
    resumo,
  };
}
