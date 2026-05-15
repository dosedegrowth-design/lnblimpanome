-- ============================================================
-- LNB Painel - RPCs gerenciaveis (15/mai/2026)
-- Projeto: hkjukobqpjezhpxzplpj
--
-- Cria 12 RPCs SECURITY DEFINER:
--   Helper:
--     _lnb_is_admin()                              -> boolean
--   Public (leitura):
--     lnb_get_preco(codigo, modo_teste)            -> jsonb
--     lnb_get_precos_map(modo_teste)               -> jsonb
--     lnb_get_etapas()                             -> jsonb
--     lnb_get_tags()                               -> jsonb
--   Admin (escrita):
--     lnb_admin_update_produto(codigo, patch)      -> jsonb
--     lnb_admin_update_etapa(codigo, patch)        -> jsonb
--     lnb_admin_update_tag(codigo, patch)          -> jsonb
--     lnb_admin_reordenar_etapas(ordem text[])     -> jsonb
--     lnb_admin_reordenar_tags(ordem text[])       -> jsonb
--   Operacional:
--     lnb_processo_mover_etapa(processo_id, etapa) -> jsonb
--     lnb_processo_set_tag(processo_id, tag)       -> jsonb
--   Atualiza:
--     lnb_calcular_valor_limpeza (substitui hardcoded por lookup)
-- ============================================================

-- ----------------------------------------------------------------
-- HELPER: valida se caller e admin
-- ----------------------------------------------------------------
create or replace function public._lnb_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from lnb_admin_users
     where id = auth.uid()
       and ativo
       and role in ('owner','admin')
  );
$$;

revoke all on function public._lnb_is_admin() from public;
grant execute on function public._lnb_is_admin() to authenticated, service_role;

-- ----------------------------------------------------------------
-- LEITURA: lnb_get_preco
-- ----------------------------------------------------------------
create or replace function public.lnb_get_preco(
  p_codigo text,
  p_modo_teste boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v lnb_produtos%rowtype;
begin
  select * into v from lnb_produtos where codigo = p_codigo and ativo;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'produto_nao_encontrado', 'codigo', p_codigo);
  end if;
  return jsonb_build_object(
    'ok', true,
    'codigo', v.codigo,
    'nome', v.nome,
    'valor', case when p_modo_teste then v.preco_teste else v.preco_real end,
    'modo_teste', p_modo_teste,
    'desconto_consulta', v.desconto_consulta,
    'custo_api', v.custo_api,
    'preco_real', v.preco_real,
    'preco_teste', v.preco_teste
  );
end $$;

revoke all on function public.lnb_get_preco(text, boolean) from public;
grant execute on function public.lnb_get_preco(text, boolean) to anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- LEITURA: lnb_get_precos_map (todos os produtos de uma vez)
-- ----------------------------------------------------------------
create or replace function public.lnb_get_precos_map(
  p_modo_teste boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_object_agg(
    codigo,
    jsonb_build_object(
      'codigo', codigo,
      'nome', nome,
      'valor', case when p_modo_teste then preco_teste else preco_real end,
      'desconto_consulta', desconto_consulta,
      'custo_api', custo_api,
      'preco_real', preco_real,
      'preco_teste', preco_teste,
      'ordem', ordem
    )
  )
    into v_result
    from lnb_produtos
   where ativo;

  return jsonb_build_object(
    'ok', true,
    'modo_teste', p_modo_teste,
    'produtos', coalesce(v_result, '{}'::jsonb)
  );
end $$;

revoke all on function public.lnb_get_precos_map(boolean) from public;
grant execute on function public.lnb_get_precos_map(boolean) to anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- LEITURA: lnb_get_etapas
-- ----------------------------------------------------------------
create or replace function public.lnb_get_etapas()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'codigo', codigo,
      'nome', nome,
      'emoji', emoji,
      'cor', cor,
      'descricao', descricao,
      'ordem', ordem,
      'ativo', ativo
    )
    order by ordem
  )
    into v_result
    from lnb_kanban_etapas
   where ativo;

  return jsonb_build_object(
    'ok', true,
    'etapas', coalesce(v_result, '[]'::jsonb)
  );
end $$;

revoke all on function public.lnb_get_etapas() from public;
grant execute on function public.lnb_get_etapas() to anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- LEITURA: lnb_get_tags (com contagem de processos)
-- ----------------------------------------------------------------
create or replace function public.lnb_get_tags()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'codigo', t.codigo,
      'nome', t.nome,
      'cor', t.cor,
      'emoji', t.emoji,
      'produto_codigo', t.produto_codigo,
      'ordem', t.ordem,
      'ativo', t.ativo,
      'processos_count', coalesce(p.cnt, 0)
    )
    order by t.ordem
  )
    into v_result
    from lnb_tags_servico t
    left join (
      select tag_servico, count(*)::int as cnt
        from lnb_processos
       where tag_servico is not null
       group by tag_servico
    ) p on p.tag_servico = t.codigo
   where t.ativo;

  return jsonb_build_object(
    'ok', true,
    'tags', coalesce(v_result, '[]'::jsonb)
  );
end $$;

revoke all on function public.lnb_get_tags() from public;
grant execute on function public.lnb_get_tags() to anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- ADMIN: lnb_admin_update_produto
-- ----------------------------------------------------------------
create or replace function public.lnb_admin_update_produto(
  p_codigo text,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before lnb_produtos%rowtype;
  v_after lnb_produtos%rowtype;
begin
  if not _lnb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_before from lnb_produtos where codigo = p_codigo;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'produto_nao_encontrado');
  end if;

  update lnb_produtos set
    nome              = coalesce(p_patch->>'nome', nome),
    preco_real        = coalesce((p_patch->>'preco_real')::numeric, preco_real),
    preco_teste       = coalesce((p_patch->>'preco_teste')::numeric, preco_teste),
    desconto_consulta = coalesce((p_patch->>'desconto_consulta')::numeric, desconto_consulta),
    custo_api         = coalesce((p_patch->>'custo_api')::numeric, custo_api),
    ativo             = coalesce((p_patch->>'ativo')::boolean, ativo),
    ordem             = coalesce((p_patch->>'ordem')::int, ordem),
    descricao         = coalesce(p_patch->>'descricao', descricao)
   where codigo = p_codigo
   returning * into v_after;

  insert into lnb_audit_log (actor_id, actor_type, action, resource_type, resource_id, metadata)
  values (
    coalesce(auth.uid()::text, 'unknown'),
    'admin',
    'update_produto',
    'lnb_produtos',
    p_codigo,
    jsonb_build_object('before', to_jsonb(v_before), 'patch', p_patch, 'after', to_jsonb(v_after))
  );

  return jsonb_build_object('ok', true, 'produto', to_jsonb(v_after));
end $$;

revoke all on function public.lnb_admin_update_produto(text, jsonb) from public;
grant execute on function public.lnb_admin_update_produto(text, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------
-- ADMIN: lnb_admin_update_etapa
-- ----------------------------------------------------------------
create or replace function public.lnb_admin_update_etapa(
  p_codigo text,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before lnb_kanban_etapas%rowtype;
  v_after lnb_kanban_etapas%rowtype;
begin
  if not _lnb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_before from lnb_kanban_etapas where codigo = p_codigo;
  if not found then
    -- INSERT novo
    insert into lnb_kanban_etapas (codigo, nome, emoji, cor, descricao, ordem, ativo)
    values (
      p_codigo,
      coalesce(p_patch->>'nome', p_codigo),
      coalesce(p_patch->>'emoji', ''),
      coalesce(p_patch->>'cor', 'gray'),
      p_patch->>'descricao',
      coalesce((p_patch->>'ordem')::int, 999),
      coalesce((p_patch->>'ativo')::boolean, true)
    )
    returning * into v_after;

    insert into lnb_audit_log (actor_id, actor_type, action, resource_type, resource_id, metadata)
    values (coalesce(auth.uid()::text, 'unknown'), 'admin', 'create_etapa', 'lnb_kanban_etapas', p_codigo,
            jsonb_build_object('patch', p_patch, 'after', to_jsonb(v_after)));

    return jsonb_build_object('ok', true, 'etapa', to_jsonb(v_after), 'created', true);
  end if;

  update lnb_kanban_etapas set
    nome      = coalesce(p_patch->>'nome', nome),
    emoji     = coalesce(p_patch->>'emoji', emoji),
    cor       = coalesce(p_patch->>'cor', cor),
    descricao = coalesce(p_patch->>'descricao', descricao),
    ordem     = coalesce((p_patch->>'ordem')::int, ordem),
    ativo     = coalesce((p_patch->>'ativo')::boolean, ativo)
   where codigo = p_codigo
   returning * into v_after;

  insert into lnb_audit_log (actor_id, actor_type, action, resource_type, resource_id, metadata)
  values (coalesce(auth.uid()::text, 'unknown'), 'admin', 'update_etapa', 'lnb_kanban_etapas', p_codigo,
          jsonb_build_object('before', to_jsonb(v_before), 'patch', p_patch, 'after', to_jsonb(v_after)));

  return jsonb_build_object('ok', true, 'etapa', to_jsonb(v_after));
end $$;

revoke all on function public.lnb_admin_update_etapa(text, jsonb) from public;
grant execute on function public.lnb_admin_update_etapa(text, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------
-- ADMIN: lnb_admin_update_tag
-- ----------------------------------------------------------------
create or replace function public.lnb_admin_update_tag(
  p_codigo text,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before lnb_tags_servico%rowtype;
  v_after lnb_tags_servico%rowtype;
begin
  if not _lnb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_before from lnb_tags_servico where codigo = p_codigo;
  if not found then
    insert into lnb_tags_servico (codigo, nome, cor, emoji, produto_codigo, ordem, ativo)
    values (
      p_codigo,
      coalesce(p_patch->>'nome', p_codigo),
      coalesce(p_patch->>'cor', 'gray'),
      coalesce(p_patch->>'emoji', ''),
      p_patch->>'produto_codigo',
      coalesce((p_patch->>'ordem')::int, 999),
      coalesce((p_patch->>'ativo')::boolean, true)
    )
    returning * into v_after;

    insert into lnb_audit_log (actor_id, actor_type, action, resource_type, resource_id, metadata)
    values (coalesce(auth.uid()::text, 'unknown'), 'admin', 'create_tag', 'lnb_tags_servico', p_codigo,
            jsonb_build_object('patch', p_patch, 'after', to_jsonb(v_after)));

    return jsonb_build_object('ok', true, 'tag', to_jsonb(v_after), 'created', true);
  end if;

  update lnb_tags_servico set
    nome           = coalesce(p_patch->>'nome', nome),
    cor            = coalesce(p_patch->>'cor', cor),
    emoji          = coalesce(p_patch->>'emoji', emoji),
    produto_codigo = coalesce(p_patch->>'produto_codigo', produto_codigo),
    ordem          = coalesce((p_patch->>'ordem')::int, ordem),
    ativo          = coalesce((p_patch->>'ativo')::boolean, ativo)
   where codigo = p_codigo
   returning * into v_after;

  insert into lnb_audit_log (actor_id, actor_type, action, resource_type, resource_id, metadata)
  values (coalesce(auth.uid()::text, 'unknown'), 'admin', 'update_tag', 'lnb_tags_servico', p_codigo,
          jsonb_build_object('before', to_jsonb(v_before), 'patch', p_patch, 'after', to_jsonb(v_after)));

  return jsonb_build_object('ok', true, 'tag', to_jsonb(v_after));
end $$;

revoke all on function public.lnb_admin_update_tag(text, jsonb) from public;
grant execute on function public.lnb_admin_update_tag(text, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------
-- ADMIN: lnb_admin_reordenar_etapas
-- ----------------------------------------------------------------
create or replace function public.lnb_admin_reordenar_etapas(
  p_ordem text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  if not _lnb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_ordem is null or array_length(p_ordem, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'ordem_vazia');
  end if;

  for i in 1..array_length(p_ordem, 1) loop
    update lnb_kanban_etapas
       set ordem = i * 10
     where codigo = p_ordem[i];
  end loop;

  insert into lnb_audit_log (actor_id, actor_type, action, resource_type, metadata)
  values (coalesce(auth.uid()::text, 'unknown'), 'admin', 'reordenar_etapas', 'lnb_kanban_etapas',
          jsonb_build_object('ordem', p_ordem));

  return jsonb_build_object('ok', true, 'ordem', p_ordem);
end $$;

revoke all on function public.lnb_admin_reordenar_etapas(text[]) from public;
grant execute on function public.lnb_admin_reordenar_etapas(text[]) to authenticated, service_role;

-- ----------------------------------------------------------------
-- ADMIN: lnb_admin_reordenar_tags
-- ----------------------------------------------------------------
create or replace function public.lnb_admin_reordenar_tags(
  p_ordem text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
begin
  if not _lnb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_ordem is null or array_length(p_ordem, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'ordem_vazia');
  end if;

  for i in 1..array_length(p_ordem, 1) loop
    update lnb_tags_servico
       set ordem = i * 10
     where codigo = p_ordem[i];
  end loop;

  insert into lnb_audit_log (actor_id, actor_type, action, resource_type, metadata)
  values (coalesce(auth.uid()::text, 'unknown'), 'admin', 'reordenar_tags', 'lnb_tags_servico',
          jsonb_build_object('ordem', p_ordem));

  return jsonb_build_object('ok', true, 'ordem', p_ordem);
end $$;

revoke all on function public.lnb_admin_reordenar_tags(text[]) from public;
grant execute on function public.lnb_admin_reordenar_tags(text[]) to authenticated, service_role;

-- ----------------------------------------------------------------
-- OPERACIONAL: lnb_processo_mover_etapa
-- ----------------------------------------------------------------
create or replace function public.lnb_processo_mover_etapa(
  p_processo_id uuid,
  p_etapa_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etapa_existe boolean;
  v_etapa_anterior text;
begin
  if not _lnb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select exists(select 1 from lnb_kanban_etapas where codigo = p_etapa_codigo and ativo)
    into v_etapa_existe;
  if not v_etapa_existe then
    return jsonb_build_object('ok', false, 'error', 'etapa_invalida', 'etapa', p_etapa_codigo);
  end if;

  select etapa into v_etapa_anterior from lnb_processos where id = p_processo_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'processo_nao_encontrado');
  end if;

  update lnb_processos
     set etapa = p_etapa_codigo,
         updated_at = now(),
         finalizado_em = case when p_etapa_codigo in ('finalizado','encerrada') then now() else null end
   where id = p_processo_id;

  insert into lnb_processo_eventos (processo_id, tipo, descricao, metadata, criado_por)
  values (
    p_processo_id,
    'mudanca_etapa',
    'De ' || coalesce(v_etapa_anterior, '?') || ' para ' || p_etapa_codigo,
    jsonb_build_object('de', v_etapa_anterior, 'para', p_etapa_codigo),
    auth.uid()
  );

  insert into lnb_audit_log (actor_id, actor_type, action, resource_type, resource_id, metadata)
  values (coalesce(auth.uid()::text, 'unknown'), 'admin', 'mover_etapa', 'lnb_processos',
          p_processo_id::text,
          jsonb_build_object('de', v_etapa_anterior, 'para', p_etapa_codigo));

  return jsonb_build_object('ok', true, 'processo_id', p_processo_id,
                            'de', v_etapa_anterior, 'para', p_etapa_codigo);
end $$;

revoke all on function public.lnb_processo_mover_etapa(uuid, text) from public;
grant execute on function public.lnb_processo_mover_etapa(uuid, text) to authenticated, service_role;

-- ----------------------------------------------------------------
-- OPERACIONAL: lnb_processo_set_tag
-- ----------------------------------------------------------------
create or replace function public.lnb_processo_set_tag(
  p_processo_id uuid,
  p_tag_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag_existe boolean;
  v_tag_anterior text;
begin
  if not _lnb_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select exists(select 1 from lnb_tags_servico where codigo = p_tag_codigo and ativo)
    into v_tag_existe;
  if not v_tag_existe then
    return jsonb_build_object('ok', false, 'error', 'tag_invalida', 'tag', p_tag_codigo);
  end if;

  select tag_servico into v_tag_anterior from lnb_processos where id = p_processo_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'processo_nao_encontrado');
  end if;

  update lnb_processos
     set tag_servico = p_tag_codigo,
         updated_at = now()
   where id = p_processo_id;

  insert into lnb_processo_eventos (processo_id, tipo, descricao, metadata, criado_por)
  values (
    p_processo_id,
    'mudanca_tag',
    'Tag de servico alterada',
    jsonb_build_object('de', v_tag_anterior, 'para', p_tag_codigo),
    auth.uid()
  );

  return jsonb_build_object('ok', true, 'processo_id', p_processo_id,
                            'de', v_tag_anterior, 'para', p_tag_codigo);
end $$;

revoke all on function public.lnb_processo_set_tag(uuid, text) from public;
grant execute on function public.lnb_processo_set_tag(uuid, text) to authenticated, service_role;

-- ----------------------------------------------------------------
-- ATUALIZACAO: lnb_calcular_valor_limpeza (R5)
-- Antes: valor_cheio=500.00 e desconto=29.99 HARDCODED no SQL
-- Depois: le de lnb_produtos (limpeza_cpf)
-- ----------------------------------------------------------------
create or replace function public.lnb_calcular_valor_limpeza(p_cpf text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_consulta_paga_em timestamptz;
  v_valor_cheio numeric;
  v_desconto numeric;
  v_modo_teste boolean := coalesce(current_setting('app.modo_teste', true)::boolean, false);
  v_validade_dias int := 15;
  v_dias_passados numeric;
  v_dias_restantes numeric;
  v_tem_desconto boolean := false;
begin
  -- Le valores da tabela de produtos (substitui hardcoded)
  select case when v_modo_teste then preco_teste else preco_real end,
         desconto_consulta
    into v_valor_cheio, v_desconto
    from lnb_produtos
   where codigo = 'limpeza_cpf' and ativo;

  -- Fallback se produto nao existir
  if v_valor_cheio is null then
    v_valor_cheio := 500.00;
    v_desconto := 29.99;
  end if;

  -- Busca data do pagamento da consulta
  select created_at
    into v_consulta_paga_em
    from "LNB_Consultas"
   where cpf = p_cpf
     and consulta_paga = true
   order by created_at desc
   limit 1;

  if v_consulta_paga_em is not null then
    v_dias_passados := extract(epoch from (now() - v_consulta_paga_em)) / 86400.0;
    v_dias_restantes := v_validade_dias - v_dias_passados;
    v_tem_desconto := (v_dias_restantes > 0);
  end if;

  return jsonb_build_object(
    'cpf', p_cpf,
    'valor_cheio', v_valor_cheio,
    'valor_com_desconto', v_valor_cheio - v_desconto,
    'desconto', v_desconto,
    'tem_desconto', v_tem_desconto,
    'dias_restantes', greatest(coalesce(v_dias_restantes, 0), 0)::int,
    'consulta_paga_em', v_consulta_paga_em,
    'validade_dias', v_validade_dias,
    'modo_teste', v_modo_teste
  );
end;
$function$;
