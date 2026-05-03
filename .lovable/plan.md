# Hera DG OS — MVP v1

Internal operating system for Hera DG (Digital Hera's dental clinic growth unit). Combines Trello-style task management, Notion-style process docs, simple CRM, sprint cockpit and learnings diary.

## Scope (this build)

Full MVP per the PRD: auth + 8 modules + Lovable Cloud backend with RLS, real CRUD (no permanent mocks), seed data.

**Out of scope:** automations, AI generation, WhatsApp/Calendar/Meta integrations, finance, e-mail sending, mobile app, advanced PDF reports.

## Visual direction

Premium boutique-agency feel.
- Bordô profundo `#5A1E2D` (primary)
- Nude/cappuccino `#E8D8C3`
- Marrom elegante `#4A3328`
- Branco quente `#FAF7F2` (background)
- Dourado discreto `#C9A45C` (accent)
- Cinza texto `#2F2F2F`, borda `#E5E1DA`

Layout: sidebar esquerda fixa, header com título + botão global "Novo", cards arredondados, badges de status, tabelas limpas, Kanban com drag-and-drop.

## Roles & permissions

Roles stored in a dedicated `user_roles` table (security best practice) with enum: `admin`, `operation`, `editor_support`, `commercial`, `viewer`. A `has_role()` SECURITY DEFINER function powers all RLS checks.

- **Admin** (Eduardo, Samira): tudo
- **Operation** (Rafael): tarefas, processos, ativos, diário
- **Editor support** (Sarah, Rafaela): só tarefas atribuídas + ativos liberados
- **Commercial**: leads, pipeline, scripts
- **Viewer**: leitura

Apenas Admin pode excluir e marcar processo como `official`. Usuário inativo é bloqueado no login.

## Modules

1. **/login** — email + senha, redirect para `/dashboard`, rotas internas protegidas.
2. **/dashboard** — cards reais: sprint ativa, tarefas abertas/hoje/atrasadas, processos, leads no pipeline, diagnósticos agendados, propostas enviadas, últimos aprendizados. Cards clicáveis.
3. **/sprints** — CRUD, ativar/pausar/concluir, detalhe com tarefas vinculadas e progresso. Apenas uma sprint `active` por vez (confirmação ao trocar).
4. **/tasks** — Kanban 7 colunas (Backlog, Fazer hoje, Em andamento, Em revisão, Concluído, Virou processo, Arquivado). Drag-and-drop, modal de criação/edição, checklist, comentários, indicador de atraso. Ação "Transformar em processo" cria registro vinculado e move tarefa para `became_process`.
5. **/processes** — CRUD com setor, objetivo, passo a passo, checklist, ferramentas, padrão de qualidade, erros comuns, tempo estimado. Status workflow (Rascunho → Em teste → Validado → Oficial / Precisa revisão). Filtros por setor/status/responsável.
6. **/commercial** — Pipeline Kanban 10 etapas. Card de lead com clínica, cidade, potencial 1-5, próxima ação. Modal completo. Lead `lost` exige motivo, `proposal_sent` aceita valor.
7. **/diary** — registros com categoria, decisão, aprendizado, impacto, próxima ação; vincular a sprint/tarefa/lead. Filtro por categoria.
8. **/assets** — biblioteca de links (propostas, scripts, criativos, templates etc.) com status, versão, responsável.
9. **/settings** — apenas Admin: listar usuários, editar role, ativar/desativar.

Botão global "Novo" no header cria tarefa, lead, processo ou entrada de diário.

## Seed data

3 sprints (Colocar Hera DG de pé / Prospecção / Validação comercial) + 15 tarefas iniciais + 4 processos exemplo, vinculados à Sprint 1 ativa.

## Technical section

**Stack:** React + TypeScript + Tailwind + shadcn/ui + react-router. Lovable Cloud (Supabase) para auth, Postgres e RLS. `@dnd-kit` para Kanban drag-and-drop.

**Auth:** email/senha via Supabase Auth. Trigger `handle_new_user()` cria `profiles` row + `user_roles` row (default `viewer`) no signup. `onAuthStateChange` listener antes de `getSession()`. Página `/reset-password`.

**Schema (tabelas):** `profiles`, `user_roles` (com enum `app_role`), `sprints`, `tasks`, `task_checklist_items`, `processes`, `leads`, `diary_entries`, `assets`, `comments`. UUIDs, `created_at`/`updated_at`/`created_by`. Trigger `set_updated_at` em todas. FK `processes.source_task_id ↔ tasks.id` (criada após ambas).

> Ajuste vs. PRD: roles ficam em `user_roles` separado (não em `profiles.role`) para evitar privilege escalation — `has_role(uuid, app_role)` substitui `current_user_role()` nas policies. Mesma semântica, mais seguro.

**RLS:** habilitado em todas as tabelas. Policies usam `has_role(auth.uid(), 'admin')` etc. Padrão:
- Admin: ALL.
- Operation: SELECT/INSERT/UPDATE em tasks, processes, assets, diary.
- Editor support: SELECT/UPDATE só em tasks onde `assignee_id = auth.uid()`.
- Commercial: ALL em leads próprios + SELECT em todos.
- `comments`: qualquer autenticado pode criar/ver nos itens visíveis.
- DELETE só Admin.

**Índices:** status, sprint_id, assignee_id, due_date (tasks); status, owner_id, next_follow_up_date (leads); category, sprint_id (diary); entity_type+entity_id (comments).

**Regras de negócio aplicadas em código/trigger:**
- Tarefa → `done` preenche `completed_at`; sai de `done` limpa.
- Transformar em processo: cria `processes` row, seta `tasks.turned_into_process=true`, `process_id`, status `became_process`.
- Apenas Admin pode UPDATE `processes.status = 'official'` (CHECK via policy).
- Validação client + server (zod) em todos os formulários.

**Build order:** schema + auth → layout/sidebar → dashboard → sprints → tasks/kanban → processes (+ transform action) → commercial → diary → assets → settings → seed → QA pass.

## Critérios de aceite

Login funciona, rotas protegidas, dashboard com dados reais do banco, CRUD completo em todos os módulos, Kanban drag-and-drop, checklist, transformação tarefa→processo, pipeline comercial funcional, RLS ativa por role, sem mocks substituindo funcionalidade real, responsivo desktop/tablet.
