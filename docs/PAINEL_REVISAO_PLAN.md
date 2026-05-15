# PAINEL_REVISAO_PLAN.md

**Documento de revisao do painel LNB**
Data: 2026-05-15
Projeto: `/Users/lucascassiano/Antigravity/lnb-painel`
Objetivo: tornar o painel admin operacionalmente funcional (Kanban unificado, precos/etapas/tags gerenciaveis via banco).

---

## Sumario executivo

- **Kanban unificado**: deixa de existir o conceito de "tipo de processo" no nivel da pagina. Existe 1 (uma) lista de etapas configuravel em `lnb_kanban_etapas` e cada card carrega uma `tag_servico` (Consulta CPF, Consulta CNPJ, Limpeza CPF, Limpeza CNPJ, Blindagem).
- **Precos via banco**: tabela `lnb_produtos` substitui os PRECOS_REAIS / PRECOS_TESTE hardcoded em `/api/site/checkout`, `/api/n8n/criar-checkout`, dashboard e financeiro. RPC `lnb_get_preco(codigo)` retorna o valor respeitando o env `LNB_MODO_TESTE`.
- **Etapas via banco**: tabela `lnb_kanban_etapas` substitui o `lib/processos.ts` (ETAPAS_LIMPEZA/BLINDAGEM/CONSULTA). RPC `lnb_get_etapas()`.
- **Tags via banco**: tabela `lnb_tags_servico`. RPC `lnb_get_tags()`. Coluna nova `tag_servico` em `lnb_processos`.
- **Modo teste**: continua via `LNB_MODO_TESTE` env, sem UI toggle.
- **Permissoes**: pagina de Configuracoes/Produtos/Etapas/Tags so para `role IN ('owner','admin')`.

---

## Pagina por pagina

### 1) `/painel/dashboard`

- **Caminho**: `src/app/painel/(logged)/dashboard/page.tsx`
- **Proposito**: KPIs read-only da operacao (leads, conversao, receita, origem).
- **Estado atual**:
  - Le `LNB - CRM`, `LNB_Consultas`, `LNB_Blindagem` direto.
  - Constantes hardcoded `PRECO_CONSULTA = 29.99` (linha 9) e `PRECO_LIMPEZA = 500.00` (linha 10).
  - Calcula `receitaConsultas = consultasPagas * PRECO_CONSULTA` e `receitaLimpezas = limpezasPagas * PRECO_LIMPEZA`.
- **Problemas identificados**:
  - Receita esta errada: ignora Consulta CNPJ (R$ 39,99), Limpeza CNPJ (R$ 580,01), Blindagem (R$ 29,90), desconto da limpeza (R$ 470,01).
  - Nao distingue receita real vs receita modo teste — se rodar em teste, conta R$ 500 em vez de R$ 5.
  - Card "Limpezas (R$ 500,00)" hardcoded no JSX (linha 104).
  - Texto "Consultas (R$ 29,99)" hardcoded no JSX (linha 100).
- **Mudancas propostas**:
  - Trocar constantes por `await getPrecos()` (helper novo em `src/lib/produtos.ts` que chama RPC `lnb_get_precos_map()`).
  - Receita: somar por cada produto (`consulta`, `consulta_cnpj`, `limpeza_cpf`, `limpeza_cnpj`, `blindagem`) usando dados reais do CRM (campo `cod_service` / `value`).
  - Cards e labels devem ler os valores do mapa de produtos (sem string literal).
  - Adicionar card "Modo teste ativo" quando `LNB_MODO_TESTE === "true"` para evitar confusao.
- **Dependencias**: tabela `lnb_produtos`, RPC `lnb_get_precos_map()`, helper `src/lib/produtos.ts`.
- **Prioridade**: **P1**.

### 2) `/painel/processos` (com `?tipo=`)

- **Caminho**: `src/app/painel/(logged)/processos/page.tsx` + `processos-kanban.tsx`
- **Proposito**: Kanban operacional de processos ativos.
- **Estado atual**:
  - Filtro `?tipo=limpeza|blindagem|consulta` define qual das 3 listas de etapas exibir.
  - Le via RPC `admin_processos_list(p_tipo, p_etapa, p_responsavel_id)`.
  - `getEtapas(tipo)` retorna array do `lib/processos.ts` (hardcoded).
  - `ProcessosKanban` renderiza colunas e cards (sem drag-drop — apenas link para detalhe).
- **Problemas identificados**:
  - **CORE**: 3 Kanbans paralelos = operador troca filtro o tempo todo.
  - Etapas hardcoded no codigo — qualquer mudanca exige deploy.
  - Cores hardcoded como union type — adicionar nova cor exige PR.
  - Sem drag-drop: mover etapa exige abrir card e clicar em "Avancar".
  - Sem visualizacao de qual servico cada card e (so ve o nome do cliente).
- **Mudancas propostas**:
  - Remover dependencia de `?tipo=`. URL passa a ser `/painel/processos?tag=consulta_cpf` (opcional).
  - Carregar etapas via `lnb_get_etapas()` (1 lista unica ordenada).
  - Cada card mostra pill com a tag (cor/emoji da `lnb_tags_servico`).
  - Adicionar **drag-and-drop** (`@dnd-kit/core`) que chama `lnb_processo_mover_etapa(processo_id, etapa_codigo)`.
  - Toolbar com filtro multi-select de tags + filtro por etapa + busca.
  - Redirect 301 dos links antigos `?tipo=limpeza` para `?tag=limpeza_cpf,limpeza_cnpj`.
- **Dependencias**: 3 tabelas novas, RPCs, `@dnd-kit/core` + `@dnd-kit/sortable`, lib `src/lib/kanban.ts`.
- **Prioridade**: **P0**.

### 3) `/painel/processos/[id]`

- **Caminho**: `src/app/painel/(logged)/processos/[id]/page.tsx` + `processo-actions.tsx` + `processo-timeline.tsx`
- **Estado atual**: Le via RPC `admin_processo_detail(p_processo_id)`. Usa `getEtapa(p.tipo, p.etapa)` e `getEtapas(p.tipo)` (hardcoded).
- **Problemas identificados**: Dependencia de `lib/processos.ts` em 4+ lugares. "Proxima etapa" calculada em memoria.
- **Mudancas propostas**:
  - Substituir imports por `lib/kanban.ts` que recebe etapas/tags via SSR fetch.
  - Mostrar pill da tag em vez do `TIPOS_LABEL`.
  - Acao nova: "Trocar tag de servico" — chama `lnb_processo_set_tag`.
- **Prioridade**: **P0**.

### 4) `/painel/leads`

- **Caminho**: `src/app/painel/(logged)/leads/page.tsx`
- **Estado atual**: Le `LNB - CRM` direto. Limit 500 hardcoded. Filtro `or()` vulneravel a injection.
- **Mudancas propostas**:
  - Paginacao server-side.
  - Sanitizar busca `q` (remover `,` e `()`).
  - Acao "Novo lead manual" via modal.
  - Botao "Exportar CSV".
  - Coluna "Servico".
- **Prioridade**: **P1**.

### 5) `/painel/financeiro`

- **Caminho**: `src/app/painel/(logged)/financeiro/page.tsx`
- **Estado atual**: Constantes hardcoded `PRECO_CONSULTA=29.99`, `PRECO_LIMPEZA=500`, `CUSTO_API_FULL=2.49`.
- **Mudancas propostas**:
  - `getPrecos()` substitui constantes.
  - Adicionar coluna `custo_api` em `lnb_produtos`.
  - Receita por produto agrupada.
  - Filtro de periodo `?inicio&fim`.
- **Prioridade**: **P1**.

### 6) `/painel/equipe`

- **Mudancas propostas**:
  - Trocar AddForm: email+senha+nome+role (via `auth.admin.createUser`).
  - "Enviar reset de senha".
  - Soft delete.
  - Sub-pagina de auditoria.
- **Prioridade**: **P2**.

### 7) `/painel/consultas`

- **Mudancas propostas**:
  - Coluna `tipo_servico` exibida.
  - Acoes "Reprocessar" e "Regerar PDF".
  - Filtro `?tipo=cpf|cnpj`.
  - Paginacao.
- **Prioridade**: **P2**.

### 8) `/painel/configuracoes`

- **Mudancas propostas**: Transformar em HUB com cards (Produtos, Etapas, Tags, Sistema).
- **Prioridade**: **P0** (entrada das novas paginas).

### 9) `/painel/teste-fluxo`

- **Mudancas propostas**: Auditar arquivo, atualizar selects para usar tags do banco, aviso visual modo teste.
- **Prioridade**: **P2**.

### 10) `/painel/configuracoes/produtos` (NOVA)

- CRUD inline de 5 produtos: `codigo`, `nome`, `preco_real`, `preco_teste`, `desconto_consulta`, `ativo`, `ordem`.
- **Prioridade**: **P0**.

### 11) `/painel/configuracoes/etapas` (NOVA)

- Lista drag-drop unica de etapas. Form criar/editar com cor + emoji + ativo.
- **Prioridade**: **P0**.

### 12) `/painel/configuracoes/tags` (NOVA)

- CRUD tags de servico (Consulta CPF, Consulta CNPJ, Limpeza CPF, Limpeza CNPJ, Blindagem).
- Vincular tag → produto (FK opcional).
- **Prioridade**: **P0**.

### 13) `/painel/configuracoes/sistema` (NOVA)

- Cards read-only: Modo teste, Versao, Provedor API, Links uteis, Counts de tabelas.
- **Prioridade**: **P2**.

---

## Migrations propostas

Arquivo: `supabase/migrations/20260515_lnb_painel_gerenciavel.sql`

```sql
-- ============================================================
-- LNB Painel - tornar gerenciavel via banco (15/mai/2026)
-- ============================================================

-- 1) lnb_produtos
create table if not exists public.lnb_produtos (
  codigo              text primary key,
  nome                text not null,
  preco_real          numeric(10,2) not null check (preco_real >= 0),
  preco_teste         numeric(10,2) not null default 5.00 check (preco_teste >= 0),
  desconto_consulta   numeric(10,2) default 0 check (desconto_consulta >= 0),
  custo_api           numeric(10,2) default 0 check (custo_api >= 0),
  ativo               boolean not null default true,
  ordem               int not null default 0,
  descricao           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_lnb_produtos_ativo on public.lnb_produtos(ativo);
create index if not exists idx_lnb_produtos_ordem on public.lnb_produtos(ordem);

-- 2) lnb_kanban_etapas
create table if not exists public.lnb_kanban_etapas (
  codigo       text primary key,
  nome         text not null,
  emoji        text default '',
  cor          text not null default 'gray'
                check (cor in ('brand','amber','emerald','violet','red','gray','forest')),
  descricao    text,
  ordem        int not null default 0,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_etapas_ordem on public.lnb_kanban_etapas(ordem) where ativo;

-- 3) lnb_tags_servico
create table if not exists public.lnb_tags_servico (
  codigo          text primary key,
  nome            text not null,
  cor             text not null default 'gray'
                  check (cor in ('brand','amber','emerald','violet','red','gray','forest')),
  emoji           text default '',
  produto_codigo  text references public.lnb_produtos(codigo) on delete set null,
  ordem           int not null default 0,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 4) Coluna nova em lnb_processos
alter table public.lnb_processos
  add column if not exists tag_servico text references public.lnb_tags_servico(codigo);

create index if not exists idx_processos_tag on public.lnb_processos(tag_servico);

-- Backfill
update public.lnb_processos
   set tag_servico = case tipo
     when 'limpeza'   then 'limpeza_cpf'
     when 'blindagem' then 'blindagem'
     when 'consulta'  then 'consulta_cpf'
   end
 where tag_servico is null and tipo is not null;

-- 5) RLS
alter table public.lnb_produtos       enable row level security;
alter table public.lnb_kanban_etapas  enable row level security;
alter table public.lnb_tags_servico   enable row level security;

-- 6) Seed
insert into public.lnb_produtos (codigo, nome, preco_real, preco_teste, desconto_consulta, custo_api, ordem, descricao)
values
  ('consulta_cpf',   'Consulta CPF',                29.99,  5.00, 0.00,    2.49, 10, 'Consulta de CPF + relatorio PDF'),
  ('consulta_cnpj',  'Consulta CNPJ',               39.99,  5.00, 0.00,    2.49, 20, 'Consulta de CNPJ + relatorio PDF'),
  ('limpeza_cpf',    'Limpeza de Nome CPF',         500.00, 5.00, 29.99,   0.00, 30, 'Limpeza de nome PF'),
  ('limpeza_cnpj',   'Limpeza de Nome CNPJ',        580.01, 5.00, 39.99,   0.00, 40, 'Limpeza de nome PJ'),
  ('blindagem',      'Blindagem mensal CPF',        29.90,  5.00, 0.00,    0.00, 50, 'Blindagem mensal')
on conflict (codigo) do nothing;

insert into public.lnb_kanban_etapas (codigo, nome, emoji, cor, descricao, ordem) values
  ('iniciado',     'Iniciado',      '🟦', 'brand',   'Pagamento confirmado',                 10),
  ('pago',         'Pago',          '💳', 'brand',   'Pagamento confirmado',                 20),
  ('documentacao', 'Documentacao',  '📄', 'amber',   'Coletando documentos',                 30),
  ('analise',      'Em analise',    '🔍', 'violet',  'Equipe analisando o caso',             40),
  ('execucao',     'Em execucao',   '⚡', 'forest',  'Executando junto aos orgaos',          50),
  ('executada',    'Executada',     '🔍', 'amber',   'Consulta realizada na API',            60),
  ('entregue',     'Entregue',      '📨', 'emerald', 'Relatorio enviado pro cliente',        70),
  ('finalizado',   'Finalizado',    '✅', 'emerald', 'Processo concluido',                   80),
  ('ativada',      'Ativada',       '🛡️', 'brand',   'Blindagem ativada',                    90),
  ('monitorando',  'Monitorando',   '👁️', 'emerald', 'Verificacoes automaticas ativas',     100),
  ('alerta',       'Alerta',        '⚠️', 'red',     'Pendencia detectada',                 110),
  ('encerrada',    'Encerrada',     '🔚', 'gray',    'Cliente cancelou',                    120)
on conflict (codigo) do nothing;

insert into public.lnb_tags_servico (codigo, nome, cor, emoji, produto_codigo, ordem) values
  ('consulta_cpf',  'Consulta CPF',   'brand',   '🔍',  'consulta_cpf',  10),
  ('consulta_cnpj', 'Consulta CNPJ',  'violet',  '🏢',  'consulta_cnpj', 20),
  ('limpeza_cpf',   'Limpeza CPF',    'emerald', '✨',  'limpeza_cpf',   30),
  ('limpeza_cnpj',  'Limpeza CNPJ',   'forest',  '🏛️', 'limpeza_cnpj',  40),
  ('blindagem',     'Blindagem',      'amber',   '🛡️', 'blindagem',     50)
on conflict (codigo) do nothing;
```

---

## RPCs propostas (SECURITY DEFINER)

Arquivo: `supabase/migrations/20260515_lnb_painel_rpcs.sql`

| RPC | Funcao |
|---|---|
| `_lnb_is_admin()` | Helper interno — valida `auth.uid()` em `lnb_admin_users` role admin/owner |
| `lnb_get_preco(codigo, p_modo_teste)` | Retorna preco respeitando modo teste |
| `lnb_get_precos_map(p_modo_teste)` | Mapa completo codigo → preco |
| `lnb_get_etapas()` | Lista ordenada de etapas ativas |
| `lnb_get_tags()` | Lista ordenada de tags + count de processos |
| `lnb_admin_update_produto(codigo, patch)` | UPDATE com audit log |
| `lnb_admin_update_etapa(codigo, patch)` | UPDATE com audit log |
| `lnb_admin_update_tag(codigo, patch)` | UPDATE com audit log |
| `lnb_admin_reordenar_etapas(ordem text[])` | UPDATE em lote da ordem |
| `lnb_admin_reordenar_tags(ordem text[])` | UPDATE em lote da ordem |
| `lnb_processo_mover_etapa(processo_id, etapa_codigo)` | Drag-drop |
| `lnb_processo_set_tag(processo_id, tag_codigo)` | Trocar tag de servico |

---

## Ordem de execucao

1. **Migration estrutural** (tabelas + seed + backfill)
2. **Migration RPCs**
3. **Helpers TypeScript** (`src/lib/produtos.ts`, `src/lib/kanban.ts`) com cache 60s
4. **Refatorar `/painel/configuracoes` em HUB** (cards de navegacao)
5. **Criar `/painel/configuracoes/produtos`** (CRUD inline)
6. **Criar `/painel/configuracoes/etapas`** e **`/tags`** (drag-drop reorder)
7. **Backend usar precos do banco** (4 arquivos: 2 checkouts, dashboard, financeiro)
8. **Refatorar Kanban (CUTOVER)**: 1 lista unica + tags + drag-drop
9. **Cliente dashboard `/conta/dashboard`**
10. **Criar `/painel/configuracoes/sistema`** (read-only info)
11. **Deletar `lib/processos.ts`** (quando todos os imports foram migrados)
12. **Drop coluna `tipo` em `lnb_processos`** (1 semana depois, em prod)

---

## Riscos

| # | Risco | Mitigacao |
|---|---|---|
| R1 | Precos hardcoded em `app/layout.tsx` (JSON-LD SEO) | Manter hardcoded por enquanto. Aviso na pagina de produtos. |
| R2 | `lib/processos.ts` importada em 4+ arquivos | Delete so depois de passos 8-9 validados. |
| R3 | Deep links antigos `?tipo=limpeza` | Redirect 301 mapeando para `?tag=Y`. |
| R4 | Coluna `tipo` em `lnb_processos` quebra RPCs do banco | Manter `tipo` + `tag_servico` em paralelo 1 semana. Trigger sync temporario. |
| R5 | RPC `lnb_calcular_valor_limpeza` com preco hardcoded no SQL | Ler source da RPC antes da migration. Se hardcoded, reescrever. |
| R6 | Mudar preco em PROD afeta receita historica | Adicionar coluna `valor_pago` em LNB_Consultas. Dashboard usa soma real, nao count * preco. |
| R7 | `LNB_MODO_TESTE=true` em prod por engano | Banner vermelho em todas paginas + email diario + check em next.config.ts. |
| R8 | Drag-drop com RPCs lentas | Optimistic update + toast de erro. |

---

## Resumo de entregaveis

- **Tabelas novas**: 3 (`lnb_produtos`, `lnb_kanban_etapas`, `lnb_tags_servico`)
- **Coluna nova**: 1 (`lnb_processos.tag_servico`)
- **RPCs novas**: 11 + 1 helper
- **Paginas refatoradas**: 9
- **Paginas novas**: 4
- **Libs novas**: 2 (`src/lib/produtos.ts`, `src/lib/kanban.ts`)
- **Lib deletada**: 1 (`src/lib/processos.ts`)
- **NPM packages**: 2 (`@dnd-kit/core`, `@dnd-kit/sortable`)
