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

// ─── SERASA PREMIUM ────────────────────────────────────
export interface APIFullSerasaResultado {
  status?: string;
  dados?: {
    HEADER?: Record<string, unknown>;
    CREDCADASTRAL?: {
      SCORES?: {
        OCORRENCIAS?: Array<{
          SCORE?: string;
          TEXTO?: string;
          TIPO_SCORE?: string;
          PROBABILIDADE_INADIMPLENCIA?: string;
          CLASSIF_ABC?: string;
        }>;
        QUANTIDADE_OCORRENCIAS?: string;
      };
      PEND_FINANCEIRAS?: {
        VALOR_TOTAL?: string;
        VALOR_MAIOR?: string;
        VALOR_PRIMEIRO?: string;
        DATA_MAIOR?: string;
        DATA_PRIMEIRO?: string;
        TOTAL_CREDORES?: string;
        QUANTIDADE_OCORRENCIA?: string;
        OCORRENCIAS?: Array<Record<string, unknown>>;
      };
      PEND_REFIN?: { QUANTIDADE_OCORRENCIA?: string; VALOR_TOTAL?: string };
      PEND_VENCIDAS?: { QUANTIDADE_OCORRENCIA?: string; VALOR_TOTAL?: string };
      PROTESTO_SINTETICO?: {
        QUANTIDADE_OCORRENCIA?: string;
        VALOR_TOTAL?: string;
        ULTIMO_PROTESTO?: string;
      };
      CH_SEM_FUNDOS_BACEN?: { QUANTIDADE_OCORRENCIA?: string };
      DADOS_RECEITA_FEDERAL?: {
        NOME?: string;
        SITUACAO_RECEITA?: string;
        DATA_NASCIMENTO_FUNDACAO?: string;
        DATA_ATUALIZACAO?: string;
      };
      PARTICIPACAO_EM_EMPRESAS?: { QUANTIDADE_OCORRENCIAS?: string };
    };
  };
  [k: string]: unknown;
}

/**
 * Consulta Serasa Premium na API Full.
 * Endpoint: POST /api/serasa-premium
 * Custo: R$ 5,80 (Nível 2)
 * Retorna: Score Serasa + Pendências financeiras + Protestos + Cheques BACEN + Dados RF
 */
export async function consultarSerasaPremium(cpf: string): Promise<APIFullSerasaResultado> {
  const cleanCpf = cpf.replace(/\D/g, "");
  const r = await fetch(`${API_FULL_BASE}/api/serasa-premium`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document: cleanCpf, link: "serasa-premium" }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`API Full Serasa erro ${r.status}: ${t}`);
  }
  return (await r.json()) as APIFullSerasaResultado;
}

export interface ParsedSerasa {
  score: number | null;
  tem_pendencia: boolean;
  qtd_pendencias: number;
  total_dividas: number;
  qtd_protestos: number;
  total_protestos: number;
  qtd_cheques_sem_fundo: number;
  probabilidade_pagamento: string | null; // ex: "59,25%"
  texto_risco: string | null;
  pendencias: Array<{ credor: string; valor: number; data: string }>;
  protestos: Array<{ credor: string; valor: number; data: string; cartorio?: string }>;
  nome_rf: string | null;
  situacao_receita: string | null;
  data_nascimento: string | null;
  resumo: string;
}

function strNum(v: unknown): number {
  if (v == null) return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function strInt(v: unknown): number {
  if (v == null) return 0;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? 0 : n;
}

export function parseSerasa(r: APIFullSerasaResultado): ParsedSerasa {
  const cred = r.dados?.CREDCADASTRAL;
  const sc0 = cred?.SCORES?.OCORRENCIAS?.[0];
  const score = sc0?.SCORE ? strInt(sc0.SCORE) : null;
  const probabilidade = sc0?.PROBABILIDADE_INADIMPLENCIA
    ? `${(100 - strNum(sc0.PROBABILIDADE_INADIMPLENCIA)).toFixed(2)}%`
    : null;

  const pendFin = cred?.PEND_FINANCEIRAS;
  const pendRefin = cred?.PEND_REFIN;
  const pendVenc = cred?.PEND_VENCIDAS;
  const qtdPendencias =
    strInt(pendFin?.QUANTIDADE_OCORRENCIA) +
    strInt(pendRefin?.QUANTIDADE_OCORRENCIA) +
    strInt(pendVenc?.QUANTIDADE_OCORRENCIA);
  const totalDividas =
    strNum(pendFin?.VALOR_TOTAL) +
    strNum(pendRefin?.VALOR_TOTAL) +
    strNum(pendVenc?.VALOR_TOTAL);

  const protSint = cred?.PROTESTO_SINTETICO;
  const qtdProtestos = strInt(protSint?.QUANTIDADE_OCORRENCIA);
  const totalProtestos = strNum(protSint?.VALOR_TOTAL);

  const chBacen = cred?.CH_SEM_FUNDOS_BACEN;
  const qtdCheques = strInt(chBacen?.QUANTIDADE_OCORRENCIA);

  // Extrai pendências detalhadas (se a estrutura OCORRENCIAS estiver populada)
  const pendencias: ParsedSerasa["pendencias"] = [];
  if (Array.isArray(pendFin?.OCORRENCIAS)) {
    for (const o of pendFin.OCORRENCIAS) {
      const od = o as Record<string, unknown>;
      pendencias.push({
        credor: String(od.CREDOR ?? od.PROVEDOR ?? od.INFORMANTE ?? "Credor"),
        valor: strNum(od.VALOR ?? od.VALOR_TOTAL ?? od.VALOR_ATUALIZADO),
        data: String(od.DATA ?? od.DATA_INCLUSAO ?? od.DATA_OCORRENCIA ?? ""),
      });
    }
  }

  const temPendencia = qtdPendencias > 0 || qtdProtestos > 0 || qtdCheques > 0;
  const rf = cred?.DADOS_RECEITA_FEDERAL;

  const resumo = temPendencia
    ? `${qtdPendencias} pendência(s) financeira(s), ${qtdProtestos} protesto(s), ${qtdCheques} cheque(s) sem fundo. Total dívidas: R$ ${totalDividas.toFixed(2)}.`
    : "Nome limpo — sem pendências financeiras, protestos ou cheques sem fundo nas bases Serasa.";

  return {
    score,
    tem_pendencia: temPendencia,
    qtd_pendencias: qtdPendencias,
    total_dividas: totalDividas,
    qtd_protestos: qtdProtestos,
    total_protestos: totalProtestos,
    qtd_cheques_sem_fundo: qtdCheques,
    probabilidade_pagamento: probabilidade,
    texto_risco: sc0?.TEXTO ?? null,
    pendencias,
    protestos: [],
    nome_rf: rf?.NOME ?? null,
    situacao_receita: rf?.SITUACAO_RECEITA ?? null,
    data_nascimento: rf?.DATA_NASCIMENTO_FUNDACAO ?? null,
    resumo,
  };
}

// ─── COMBO: Serasa Premium + Boa Vista Essencial em paralelo ─────
export interface ConsultaCombinada {
  serasa: ParsedSerasa | null;
  serasaRaw: APIFullSerasaResultado | null;
  serasaErro: string | null;
  boaVista: ParsedConsulta | null;
  boaVistaRaw: APIFullResultado | null;
  boaVistaErro: string | null;
  // Campos agregados (união das duas fontes)
  tem_pendencia: boolean;
  qtd_pendencias: number;
  total_dividas: number;
  qtd_protestos: number;
}

/**
 * Consulta combinada: Serasa Premium + Boa Vista Essencial em paralelo.
 * Custo total: R$ 8,49 (R$ 5,80 + R$ 2,69).
 * Se uma fonte falhar, retorna apenas a outra com o erro.
 */
export async function consultarCPFCombinado(cpf: string): Promise<ConsultaCombinada> {
  const [resSerasa, resBoaVista] = await Promise.allSettled([
    consultarSerasaPremium(cpf),
    consultarCPF(cpf),
  ]);

  let serasa: ParsedSerasa | null = null;
  let serasaRaw: APIFullSerasaResultado | null = null;
  let serasaErro: string | null = null;
  if (resSerasa.status === "fulfilled") {
    serasaRaw = resSerasa.value;
    try {
      serasa = parseSerasa(serasaRaw);
    } catch (e) {
      serasaErro = `parse Serasa: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    serasaErro = resSerasa.reason instanceof Error ? resSerasa.reason.message : String(resSerasa.reason);
  }

  let boaVista: ParsedConsulta | null = null;
  let boaVistaRaw: APIFullResultado | null = null;
  let boaVistaErro: string | null = null;
  if (resBoaVista.status === "fulfilled") {
    boaVistaRaw = resBoaVista.value;
    try {
      boaVista = parseConsulta(boaVistaRaw);
    } catch (e) {
      boaVistaErro = `parse Boa Vista: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    boaVistaErro = resBoaVista.reason instanceof Error ? resBoaVista.reason.message : String(resBoaVista.reason);
  }

  // Agrega: união (qualquer pendência conta)
  const temPendenciaSerasa = serasa?.tem_pendencia ?? false;
  const temPendenciaBoa = boaVista?.tem_pendencia ?? false;
  const qtdSerasa = (serasa?.qtd_pendencias ?? 0) + (serasa?.qtd_protestos ?? 0) + (serasa?.qtd_cheques_sem_fundo ?? 0);
  const qtdBoa = boaVista?.qtd_pendencias ?? 0;
  const totalSerasa = (serasa?.total_dividas ?? 0) + (serasa?.total_protestos ?? 0);
  const totalBoa = boaVista?.total_dividas ?? 0;

  return {
    serasa,
    serasaRaw,
    serasaErro,
    boaVista,
    boaVistaRaw,
    boaVistaErro,
    tem_pendencia: temPendenciaSerasa || temPendenciaBoa,
    qtd_pendencias: Math.max(qtdSerasa, qtdBoa),
    total_dividas: Math.max(totalSerasa, totalBoa),
    qtd_protestos: serasa?.qtd_protestos ?? 0,
  };
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
 * Helper end-to-end: consulta CNPJ (Receita) + Serasa Premium + Boa Vista do sócio responsável.
 * 3 chamadas em paralelo.
 * Custo total: R$ 0,04 + R$ 5,80 + R$ 2,69 = R$ 8,53
 */
export async function consultarCNPJCompleto(
  cnpj: string,
  cpfResponsavel: string
): Promise<{
  pj: ParsedConsultaCNPJ;
  pjRaw: APIFullCNPJResultado;
  responsavel: ParsedConsulta;
  responsavelRaw: APIFullResultado;
  responsavelSerasa: ParsedSerasa | null;
  responsavelSerasaRaw: APIFullSerasaResultado | null;
}> {
  const [pjRes, respBVRes, respSerasaRes] = await Promise.allSettled([
    consultarCNPJ(cnpj),
    consultarCPF(cpfResponsavel),
    consultarSerasaPremium(cpfResponsavel),
  ]);

  if (pjRes.status === "rejected") throw pjRes.reason;
  if (respBVRes.status === "rejected") throw respBVRes.reason;

  const pjRaw = pjRes.value;
  const respRaw = respBVRes.value;

  let responsavelSerasa: ParsedSerasa | null = null;
  let responsavelSerasaRaw: APIFullSerasaResultado | null = null;
  if (respSerasaRes.status === "fulfilled") {
    responsavelSerasaRaw = respSerasaRes.value;
    try {
      responsavelSerasa = parseSerasa(responsavelSerasaRaw);
    } catch (e) {
      console.error("[apifull] parse Serasa CNPJ responsavel falhou:", e);
    }
  } else {
    console.error("[apifull] Serasa Premium responsavel falhou:", respSerasaRes.reason);
  }

  return {
    pj: parseConsultaCNPJ(pjRaw),
    pjRaw,
    responsavel: parseConsulta(respRaw),
    responsavelRaw: respRaw,
    responsavelSerasa,
    responsavelSerasaRaw,
  };
}
