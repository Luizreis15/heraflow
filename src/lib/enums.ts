export const SECTORS = [
  { value: "strategy", label: "Estratégia" },
  { value: "brand", label: "Marca" },
  { value: "content", label: "Conteúdo" },
  { value: "traffic", label: "Tráfego" },
  { value: "commercial", label: "Comercial" },
  { value: "diagnosis", label: "Diagnóstico" },
  { value: "proposal", label: "Proposta" },
  { value: "client", label: "Cliente" },
  { value: "product", label: "Produto" },
  { value: "ai", label: "IA" },
  { value: "processes", label: "Processos" },
  { value: "training", label: "Treinamento" },
  { value: "finance", label: "Financeiro" },
  { value: "operation", label: "Operação" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
] as const;

export const TASK_STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "today", label: "Fazer hoje" },
  { value: "in_progress", label: "Em andamento" },
  { value: "review", label: "Em revisão" },
  { value: "done", label: "Concluído" },
  { value: "became_process", label: "Virou processo" },
  { value: "archived", label: "Arquivado" },
] as const;

export const SPRINT_STATUSES = [
  { value: "planned", label: "Planejada" },
  { value: "active", label: "Ativa" },
  { value: "paused", label: "Pausada" },
  { value: "completed", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
] as const;

export const PROCESS_STATUSES = [
  { value: "draft", label: "Rascunho" },
  { value: "testing", label: "Em teste" },
  { value: "validated", label: "Validado" },
  { value: "official", label: "Oficial" },
  { value: "needs_review", label: "Precisa revisão" },
] as const;

export const LEAD_STATUSES = [
  { value: "mapped", label: "Lead mapeado" },
  { value: "contacted", label: "Abordagem feita" },
  { value: "replied", label: "Respondeu" },
  { value: "diagnosis_scheduled", label: "Diagnóstico agendado" },
  { value: "diagnosis_done", label: "Diagnóstico realizado" },
  { value: "proposal_sent", label: "Proposta enviada" },
  { value: "follow_up", label: "Follow-up" },
  { value: "won", label: "Fechado" },
  { value: "lost", label: "Perdido" },
  { value: "nurturing", label: "Nutrição" },
] as const;

export const LEAD_SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "google_maps", label: "Google Maps" },
  { value: "referral", label: "Indicação" },
  { value: "paid_campaign", label: "Campanha paga" },
  { value: "networking", label: "Networking" },
  { value: "manual_prospecting", label: "Prospecção manual" },
  { value: "other", label: "Outro" },
] as const;

export const DIARY_CATEGORIES = [
  { value: "commercial", label: "Comercial" },
  { value: "content", label: "Conteúdo" },
  { value: "offer", label: "Oferta" },
  { value: "client", label: "Cliente" },
  { value: "process", label: "Processo" },
  { value: "technology", label: "Tecnologia" },
  { value: "mentorship", label: "Mentoria" },
  { value: "mistake", label: "Erro" },
  { value: "insight", label: "Insight" },
  { value: "win", label: "Vitória" },
] as const;

export const ASSET_CATEGORIES = [
  { value: "proposal", label: "Proposta" },
  { value: "contract", label: "Contrato" },
  { value: "script", label: "Script" },
  { value: "content_script", label: "Roteiro" },
  { value: "creative", label: "Criativo" },
  { value: "template", label: "Template" },
  { value: "presentation", label: "Apresentação" },
  { value: "diagnosis", label: "Diagnóstico" },
  { value: "checklist", label: "Checklist" },
  { value: "training", label: "Treinamento" },
  { value: "case", label: "Case" },
  { value: "other", label: "Outro" },
] as const;

export const ASSET_STATUSES = [
  { value: "draft", label: "Rascunho" },
  { value: "in_use", label: "Em uso" },
  { value: "approved", label: "Aprovado" },
  { value: "archived", label: "Arquivado" },
] as const;

export const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "operation", label: "Operação" },
  { value: "editor_support", label: "Apoio de edição" },
  { value: "commercial", label: "Comercial" },
  { value: "viewer", label: "Viewer" },
] as const;

export const labelOf = <T extends readonly { value: string; label: string }[]>(
  list: T,
  value: string | null | undefined
) => list.find((i) => i.value === value)?.label ?? value ?? "—";
