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

/**
 * Parser tolerante: tenta múltiplas variações de chaves do JSON da API Full,
 * porque a estrutura de retorno varia conforme o produto consultado.
 *
 * Tenta nesta ordem:
 *   - r.RegistroDeDebitos (formato e-boavista padrão)
 *   - r.Pendencias / r.pendencias (formato Serasa)
 *   - r.RestricoesFinanceiras (variação)
 *   - r.data?.... (caso retorne envelope)
 */
export function parseConsulta(r: APIFullResultado): ParsedConsulta {
  const pendencias: ParsedConsulta["pendencias"] = [];
  let total = 0;

  // Helpers pra normalizar — aceita diversos formatos de chave
  type RawDebito = Record<string, unknown>;

  function pickStr(o: RawDebito, ...keys: string[]): string {
    for (const k of keys) {
      if (o[k] != null && o[k] !== "") return String(o[k]);
    }
    return "";
  }
  function pickNum(o: RawDebito, ...keys: string[]): number {
    for (const k of keys) {
      const v = o[k];
      if (v != null) {
        const n = parseFloat(String(v).replace(",", "."));
        if (!isNaN(n)) return n;
      }
    }
    return 0;
  }

  function processArray(arr: unknown, defaultCredor: string) {
    if (!Array.isArray(arr)) return;
    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const d = raw as RawDebito;
      const credor = pickStr(
        d,
        "Credor",
        "credor",
        "NomeCredor",
        "nome_credor",
        "Empresa",
        "empresa",
        "Origem",
        "origem"
      );
      const valor = pickNum(d, "Valor", "valor", "ValorAtualizado", "valor_atualizado");
      const data = pickStr(
        d,
        "Data",
        "data",
        "DataInclusao",
        "data_inclusao",
        "DataOcorrencia"
      );
      if (valor > 0 || credor) {
        pendencias.push({
          credor: credor || defaultCredor,
          valor,
          data,
        });
        total += valor;
      }
    }
  }

  // Tenta TODAS as variações comuns
  const raw = r as Record<string, unknown>;
  processArray(raw.RegistroDeDebitos, "Credor");
  processArray(raw.Pendencias, "Pendência");
  processArray(raw.pendencias, "Pendência");
  processArray(raw.Protestos, "Protesto");
  processArray(raw.RestricoesFinanceiras, "Restrição");
  processArray(raw.restricoes_financeiras, "Restrição");
  processArray(raw.Apontamentos, "Apontamento");
  processArray(raw.apontamentos, "Apontamento");

  // Caso a API retorne dentro de "data" ou "resultado"
  const inner = (raw.data || raw.resultado || raw.Resultado) as
    | Record<string, unknown>
    | undefined;
  if (inner && typeof inner === "object") {
    processArray(inner.RegistroDeDebitos, "Credor");
    processArray(inner.Pendencias, "Pendência");
    processArray(inner.pendencias, "Pendência");
    processArray(inner.Protestos, "Protesto");
    processArray(inner.RestricoesFinanceiras, "Restrição");
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
