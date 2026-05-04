-- =============================================================================
-- HeraFlow — seed inicial (Sprint 1 + 15 tarefas + 4 processos)
-- =============================================================================
--
-- Admin utilizado (created_by / owner_id): UUID fixo em auth.users / public.profiles:
--   25227ad9-b9ad-4184-bfb4-2660fa4fb788
-- (conta associada: admin@hera.com.br)
--
-- Pré-requisitos
-- --------------
-- 1. Migrações aplicadas (tabelas public.sprints, public.tasks, public.processes).
-- 2. Este UUID já existir em auth.users (e em public.profiles), senão o INSERT falha
--    por violação de chave estrangeira.
--
-- Execução
-- ---------
-- Correr manualmente no SQL Editor do Supabase (ou psql com permissões adequadas).
-- Não é executado automaticamente pelo repositório.
--
-- Idempotência
-- ------------
-- Sem ON CONFLICT: voltar a correr duplica sprint, tarefas e processos.
-- Opcional antes de re-seed: apagar dados de teste ou pausar sprint ativa:
--
--   UPDATE public.sprints SET status = 'paused' WHERE status = 'active';
--
-- =============================================================================

WITH admin AS (
  SELECT '25227ad9-b9ad-4184-bfb4-2660fa4fb788'::uuid AS id
),
new_sprint AS (
  INSERT INTO public.sprints (
    name,
    objective,
    status,
    progress,
    created_by,
    owner_id
  )
  SELECT
    'Sprint 1 — Colocar a Hera DG de pé',
    'Fundação operacional: presença digital, materiais comerciais e primeiros aprendizados da Hera DG.',
    'active',
    0,
    admin.id,
    admin.id
  FROM admin
  RETURNING id
)
INSERT INTO public.tasks (
  title,
  sprint_id,
  status,
  priority,
  sector,
  created_by
)
SELECT
  v.title,
  ns.id,
  v.status,
  v.priority,
  v.sector,
  a.id
FROM new_sprint ns
CROSS JOIN admin a
CROSS JOIN (
  VALUES
    ('Criar Instagram Hera DG', 'backlog', 'high', 'brand'::text),
    ('Criar página Facebook', 'backlog', 'medium', 'traffic'::text),
    ('Configurar Business Manager', 'backlog', 'high', 'traffic'::text),
    ('Criar WhatsApp comercial', 'backlog', 'high', 'commercial'::text),
    ('Criar pasta Google Drive', 'backlog', 'medium', 'operation'::text),
    ('Definir promessa principal', 'backlog', 'high', 'strategy'::text),
    ('Criar landing page de diagnóstico', 'backlog', 'high', 'product'::text),
    ('Criar formulário de diagnóstico', 'backlog', 'high', 'product'::text),
    ('Criar 10 temas de conteúdo', 'backlog', 'medium', 'content'::text),
    ('Gravar 3 vídeos com Eduardo', 'backlog', 'medium', 'content'::text),
    ('Gravar 3 vídeos com Samira', 'backlog', 'medium', 'content'::text),
    ('Mapear 50 clínicas', 'backlog', 'high', 'commercial'::text),
    ('Fazer 10 abordagens manuais', 'backlog', 'high', 'commercial'::text),
    ('Criar modelo de proposta', 'backlog', 'high', 'proposal'::text),
    ('Criar diagnóstico demonstrativo', 'backlog', 'high', 'diagnosis'::text)
) AS v(title, status, priority, sector);

-- -----------------------------------------------------------------------------
-- Processos iniciais (documentação operacional em rascunho)
-- -----------------------------------------------------------------------------
INSERT INTO public.processes (
  name,
  sector,
  objective,
  status,
  steps,
  created_by
)
SELECT
  p.name,
  p.sector,
  p.objective,
  p.status,
  p.steps,
  admin.id
FROM (
  VALUES
    (
      'Como criar tarefa no Hera DG OS',
      'operation',
      'Padronizar o registo de trabalho no sistema interno.',
      'draft',
      E'1. Abrir Tarefas no menu lateral.\n2. Clicar em "Nova tarefa" ou usar o botão Novo no topo.\n3. Preencher título, setor, prioridade e sprint.\n4. Guardar e mover o cartão no Kanban conforme o estado real.'::text
    ),
    (
      'Como transformar tarefa concluída em processo',
      'processes',
      'Formalizar execução recorrente a partir de uma tarefa bem feita.',
      'draft',
      E'1. Concluir ou colocar a tarefa em revisão, conforme fluxo interno.\n2. Na edição da tarefa, usar "Transformar em processo".\n3. Completar nome, objetivo e passos do processo.\n4. Rever o processo criado em Processos e evoluir status (rascunho → teste → validado).'::text
    ),
    (
      'Como mapear lead odontológico',
      'commercial',
      'Checklist mínimo para registo consistente no pipeline.',
      'draft',
      E'1. Em Comercial, criar novo lead com nome da clínica e cidade.\n2. Registar origem (Instagram, Maps, indicação, etc.).\n3. Definir potencial (1–5) e próxima ação com data de follow-up.\n4. Arrastar o cartão no Kanban conforme evolução até won/lost.'::text
    ),
    (
      'Como registrar aprendizado no diário de bordo',
      'operation',
      'Capturar decisões e aprendizados para a equipa.',
      'draft',
      E'1. Abrir Diário de Bordo.\n2. Novo registo: título, categoria e conteúdo obrigatórios.\n3. Opcional: associar sprint em curso.\n4. Guardar; usar filtros por categoria para revisões periódicas.'::text
    )
) AS p(name, sector, objective, status, steps)
CROSS JOIN (
  SELECT '25227ad9-b9ad-4184-bfb4-2660fa4fb788'::uuid AS id
) AS admin;
