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

// ─── CNPJ (Receita Federal) ─────────────────────────────────

export interface APIFullSocio {
  nome?: string;
  cpf?: string;
  qualificacao?: string;
  [k: string]: unknown;
}

export interface APIFullCNPJResultado {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_situacao_cadastral?: string;
  data_abertura?: string;
  capital_social?: number | string;
  cnae_principal?: string;
  cnae_descricao?: string;
  natureza_juridica?: string;
  porte?: string;
  endereco?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  email?: string;
  telefone?: string;
  socios?: APIFullSocio[];
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
        "origem",
        "informante",
        "Informante"
      );
      const valor = pickNum(
        d,
        "Valor",
        "valor",
        "ValorAtualizado",
        "valor_atualizado",
        "valorAtualizado",
        "valorOriginal",
        "ValorOriginal"
      );
      const data = pickStr(
        d,
        "Data",
        "data",
        "DataInclusao",
        "data_inclusao",
        "dataInclusao",
        "DataOcorrencia",
        "dataOcorrencia"
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

  // Processa um node tentando todos os campos possíveis (pendências/protestos)
  function processNode(node: Record<string, unknown> | undefined) {
    if (!node || typeof node !== "object") return;

    // 1) Arrays diretos (formato plano antigo e-boavista)
    processArray(node.RegistroDeDebitos, "Credor");
    processArray(node.Pendencias, "Pendência");
    processArray(node.pendencias, "Pendência");
    processArray(node.Protestos, "Protesto");
    processArray(node.RestricoesFinanceiras, "Restrição");
    processArray(node.restricoes_financeiras, "Restrição");
    processArray(node.Apontamentos, "Apontamento");
    processArray(node.apontamentos, "Apontamento");

    // 2) Objeto envelopado: { listaDebitos: [...] } (formato API Full real)
    const regDebitos = node.RegistroDeDebitos as Record<string, unknown> | undefined;
    if (regDebitos && typeof regDebitos === "object" && !Array.isArray(regDebitos)) {
      processArray(regDebitos.listaDebitos, "Credor");
    }
    const protestos = node.Protestos as Record<string, unknown> | undefined;
    if (protestos && typeof protestos === "object" && !Array.isArray(protestos)) {
      processArray(protestos.listaProtestos, "Protesto");
    }
    const acoes = node.AcoesCiveis as Record<string, unknown> | undefined;
    if (acoes && typeof acoes === "object" && !Array.isArray(acoes)) {
      processArray(acoes.listaAcoes, "Ação Cível");
    }
  }

  // Tenta TODAS as variações comuns + estrutura aninhada da API Full real
  const raw = r as Record<string, unknown>;
  processNode(raw);

  // Caso a API retorne dentro de "data" / "resultado" / "dados.data.saida"
  const inner1 = (raw.data || raw.resultado || raw.Resultado) as Record<string, unknown> | undefined;
  processNode(inner1);

  // Estrutura API Full real: { dados: { data: { saida: {...} } } }
  const dados = raw.dados as Record<string, unknown> | undefined;
  if (dados && typeof dados === "object") {
    const dadosData = dados.data as Record<string, unknown> | undefined;
    if (dadosData && typeof dadosData === "object") {
      processNode(dadosData);
      const saida = dadosData.saida as Record<string, unknown> | undefined;
      processNode(saida);
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

// ─── CNPJ functions ────────────────────────────────────

/**
 * Consulta CNPJ Completo na API Full (Receita Federal).
 * Endpoint: POST /api/cnpj-completo
 * Custo: R$ 0,04 (Nível 2)
 */
export async function consultarCNPJ(cnpj: string): Promise<APIFullCNPJResultado> {
  const cleanCnpj = cnpj.replace(/\D/g, "");
  const r = await fetch(`${API_FULL_BASE}/api/cnpj-completo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document: cleanCnpj, link: "cnpj-completo" }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`API Full CNPJ erro ${r.status}: ${t}`);
  }
  const json = (await r.json()) as { data?: APIFullCNPJResultado } | APIFullCNPJResultado;
  return ("data" in json && json.data ? json.data : json) as APIFullCNPJResultado;
}

export interface ParsedConsultaCNPJ {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  situacao_cadastral: string;
  data_abertura: string;
  capital_social: number;
  cnae_principal: string;
  endereco: string;
  socios: Array<{ nome: string; cpf: string; qualificacao: string }>;
}

/**
 * Parser tolerante pra dados do CNPJ (Receita Federal).
 */
export function parseConsultaCNPJ(r: APIFullCNPJResultado): ParsedConsultaCNPJ {
  const raw = r as Record<string, unknown>;
  const inner = (raw.data || raw.resultado || raw.Resultado || raw) as Record<string, unknown>;

  function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
      if (o[k] != null && o[k] !== "") return String(o[k]);
    }
    return "";
  }
  function pickNum(o: Record<string, unknown>, ...keys: string[]): number {
    for (const k of keys) {
      const v = o[k];
      if (v != null) {
        const n = parseFloat(String(v).replace(",", "."));
        if (!isNaN(n)) return n;
      }
    }
    return 0;
  }

  const razao = pickStr(inner, "razao_social", "RazaoSocial", "razaoSocial", "razao");
  const fantasia = pickStr(inner, "nome_fantasia", "NomeFantasia", "nomeFantasia", "fantasia");
  const cnpj = pickStr(inner, "cnpj", "CNPJ", "documento") || pickStr(raw, "cnpj", "CNPJ");
  const situacao = pickStr(inner, "situacao_cadastral", "SituacaoCadastral", "situacao");
  const dataAbertura = pickStr(inner, "data_abertura", "DataAbertura", "dataAbertura", "data_inicio_atividade");
  const capital = pickNum(inner, "capital_social", "CapitalSocial", "capitalSocial");
  const cnae = pickStr(inner, "cnae_principal", "CnaePrincipal", "atividade_principal", "AtividadePrincipal");

  const enderecoStr =
    pickStr(inner, "endereco_completo", "EnderecoCompleto") ||
    [
      pickStr(inner, "logradouro", "Logradouro"),
      pickStr(inner, "numero", "Numero"),
      pickStr(inner, "complemento", "Complemento"),
      pickStr(inner, "bairro", "Bairro"),
      pickStr(inner, "municipio", "Municipio", "cidade"),
      pickStr(inner, "uf", "UF"),
      pickStr(inner, "cep", "CEP"),
    ]
      .filter(Boolean)
      .join(", ");

  const sociosRaw =
    (inner.socios as unknown) ||
    (inner.Socios as unknown) ||
    (inner.QSA as unknown) ||
    (inner.qsa as unknown) ||
    [];
  const socios: Array<{ nome: string; cpf: string; qualificacao: string }> = [];
  if (Array.isArray(sociosRaw)) {
    for (const s of sociosRaw) {
      if (!s || typeof s !== "object") continue;
      const sObj = s as Record<string, unknown>;
      socios.push({
        nome: pickStr(sObj, "nome", "Nome", "nome_socio", "NomeSocio"),
        cpf: pickStr(sObj, "cpf", "CPF", "cpf_socio", "cnpj_cpf"),
        qualificacao: pickStr(sObj, "qualificacao", "Qualificacao", "qualificacao_socio"),
      });
    }
  }

  return {
    razao_social: razao,
    nome_fantasia: fantasia,
    cnpj,
    situacao_cadastral: situacao,
    data_abertura: dataAbertura,
    capital_social: capital,
    cnae_principal: cnae,
    endereco: enderecoStr,
    socios,
  };
}

/**
 * Helper end-to-end: consulta CNPJ (Receita) + CPF do responsável (score/pendências).
 * Faz as 2 chamadas em paralelo.
 */
export async function consultarCNPJCompleto(
  cnpj: string,
  cpfResponsavel: string
): Promise<{
  pj: ParsedConsultaCNPJ;
  pjRaw: APIFullCNPJResultado;
  responsavel: ParsedConsulta;
  responsavelRaw: APIFullResultado;
}> {
  const [pjRaw, respRaw] = await Promise.all([
    consultarCNPJ(cnpj),
    consultarCPF(cpfResponsavel),
  ]);
  return {
    pj: parseConsultaCNPJ(pjRaw),
    pjRaw,
    responsavel: parseConsulta(respRaw),
    responsavelRaw: respRaw,
  };
}
