'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogOut, RefreshCw, X, AlertTriangle, Trash2, Ban, Clock, ShieldCheck } from 'lucide-react'
import * as api from '@/lib/api'
import type { Report, ReportStatus, ReportFilters, UpdateReportBody } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'list' | 'detail'

interface Filters {
  status: string
  reason: string
  targetType: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'REVIEWED', label: 'Em revisão' },
  { value: 'RESOLVED_REMOVED', label: 'Resolvido — removido' },
  { value: 'RESOLVED_INVALID', label: 'Resolvido — inválido' },
  { value: 'RESOLVED_SUSPENDED', label: 'Resolvido — suspenso' },
  { value: 'RESOLVED_BANNED', label: 'Resolvido — banido' },
]

const REASON_OPTIONS = [
  { value: '', label: 'Todos os motivos' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Assédio' },
  { value: 'HATE_SPEECH', label: 'Discurso de ódio' },
  { value: 'INAPPROPRIATE', label: 'Conteúdo inapropriado' },
  { value: 'VIOLENCE', label: 'Violência' },
  { value: 'OTHER', label: 'Outro' },
]

const TARGET_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'EVENT', label: 'Evento' },
  { value: 'COMMENT', label: 'Comentário' },
  { value: 'MESSAGE', label: 'Mensagem' },
  { value: 'USER', label: 'Usuário' },
]

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  REVIEWED: 'Em revisão',
  RESOLVED_REMOVED: 'Removido',
  RESOLVED_INVALID: 'Inválido',
  RESOLVED_SUSPENDED: 'Suspenso',
  RESOLVED_BANNED: 'Banido',
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  REVIEWED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  RESOLVED_REMOVED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  RESOLVED_INVALID: 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/30',
  RESOLVED_SUSPENDED: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  RESOLVED_BANNED: 'bg-red-600/15 text-red-300 border border-red-600/30',
}

const TARGET_LABEL: Record<string, string> = {
  EVENT: 'Evento',
  COMMENT: 'Comentário',
  MESSAGE: 'Mensagem',
  USER: 'Usuário',
}

const TARGET_CLASS: Record<string, string> = {
  EVENT: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  COMMENT: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  MESSAGE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  USER: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
}

function getTargetType(report: Report): string {
  if (report.eventId) return 'EVENT'
  if (report.commentId) return 'COMMENT'
  if (report.messageId) return 'MESSAGE'
  if (report.targetUserId) return 'USER'
  return 'UNKNOWN'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="spin w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent" />
  )
}

interface SelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

function Select({ value, onChange, options }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm
                 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[status] ?? 'bg-zinc-700 text-zinc-400'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function TargetBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TARGET_CLASS[type] ?? 'bg-zinc-700 text-zinc-400'}`}>
      {TARGET_LABEL[type] ?? type}
    </span>
  )
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onLogin: (token: string) => void
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await api.login(email, password)
      localStorage.setItem('admin_token', token)
      onLogin(token)
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Erro ao conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-gradient-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-900/40 mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Conectaí Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">Painel de moderação</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-xs text-zinc-400 font-medium uppercase tracking-wide">E-mail</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm
                         placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="admin@conectai.com"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-zinc-400 font-medium uppercase tracking-wide">Senha</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm
                         placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60
                       text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Spinner /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: number | string
  accent?: boolean
}

function MetricCard({ label, value, accent = false }: MetricCardProps) {
  return (
    <div className={`rounded-xl p-4 border ${accent
      ? 'bg-violet-600/10 border-violet-500/30'
      : 'bg-zinc-900 border-zinc-800'}`}>
      <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-violet-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ title, description, confirmLabel, danger = false, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-white font-semibold text-base">{title}</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-white transition-colors ml-3">
            <X size={18} />
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-5">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-9 rounded-lg text-white text-sm font-semibold transition-colors ${danger
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-violet-600 hover:bg-violet-500'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ModerateUserModal ───────────────────────────────────────────────────────

interface ModerateUserModalProps {
  mode: 'SUSPEND' | 'BAN'
  targetName: string
  pending: boolean
  onConfirm: (data: { days?: number; reason: string }) => void
  onCancel: () => void
}

function ModerateUserModal({ mode, targetName, pending, onConfirm, onCancel }: ModerateUserModalProps) {
  const isBan = mode === 'BAN'
  const [days, setDays] = useState(7)
  const [reason, setReason] = useState('')
  const [ack, setAck] = useState(false)

  // Ban exige motivo + confirmação reforçada; suspensão exige só prazo válido.
  const canConfirm = isBan
    ? reason.trim().length > 0 && ack && !pending
    : days >= 1 && days <= 3650 && !pending

  function submit() {
    if (!canConfirm) return
    onConfirm(isBan ? { reason: reason.trim() } : { days, reason: reason.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-white font-semibold text-base">
            {isBan ? 'Banir usuário' : 'Suspender usuário'}
          </h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-white transition-colors ml-3">
            <X size={18} />
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          {isBan
            ? `${targetName} perderá o acesso permanentemente.`
            : `${targetName} ficará sem acesso pelo período definido.`}
        </p>

        {!isBan && (
          <div className="mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Prazo</p>
            <div className="flex gap-2 mb-2">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`flex-1 h-9 rounded-lg text-sm transition-colors border ${days === d
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm
                         focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        )}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isBan ? 'Motivo (obrigatório)' : 'Motivo (recomendado)'}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm
                     placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500 transition-colors mb-4"
        />

        {isBan && (
          <label className="flex items-start gap-2 mb-4 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 accent-red-600"
            />
            Entendo que o banimento é permanente.
          </label>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!canConfirm}
            className={`flex-1 h-9 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center
                        disabled:opacity-50 disabled:cursor-not-allowed ${isBan
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-orange-600 hover:bg-orange-500'}`}
          >
            {pending ? <Spinner /> : isBan ? 'Banir' : 'Suspender'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ReportRow ────────────────────────────────────────────────────────────────

interface ReportRowProps {
  report: Report
  onClick: () => void
}

function ReportRow({ report, onClick }: ReportRowProps) {
  const targetType = getTargetType(report)
  const reporterName = report.reporter
    ? `${report.reporter.name} ${report.reporter.lastname}`
    : 'Anônimo'

  return (
    <tr
      onClick={onClick}
      className="border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3 text-sm text-zinc-300 font-mono">{report.id.slice(0, 8)}…</td>
      <td className="px-4 py-3"><TargetBadge type={targetType} /></td>
      <td className="px-4 py-3 text-sm text-zinc-300">{report.reason}</td>
      <td className="px-4 py-3 text-sm text-zinc-400">{reporterName}</td>
      <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
      <td className="px-4 py-3 text-sm text-zinc-500">
        {new Date(report.createdAt).toLocaleDateString('pt-BR')}
      </td>
    </tr>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function PersonLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 min-w-[80px]">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  )
}

// ─── TargetPreview ────────────────────────────────────────────────────────────

function TargetPreview({ report }: { report: Report }) {
  if (report.event) {
    return (
      <div className="bg-zinc-800/60 rounded-lg p-3 text-sm space-y-1">
        <p className="text-zinc-200 font-medium">{report.event.title}</p>
        <p className="text-zinc-500">
          {report.event.isPublic ? 'Público' : 'Privado'} ·{' '}
          {new Date(report.event.date).toLocaleDateString('pt-BR')}
        </p>
      </div>
    )
  }
  if (report.comment) {
    return (
      <div className="bg-zinc-800/60 rounded-lg p-3 text-sm">
        <p className="text-zinc-300 italic">"{report.comment.content}"</p>
      </div>
    )
  }
  if (report.message) {
    return (
      <div className="bg-zinc-800/60 rounded-lg p-3 text-sm">
        <p className="text-zinc-300 italic">"{report.message.content ?? '(sem conteúdo)'}"</p>
        <p className="text-zinc-500 mt-1">Conversa: {report.message.conversationId.slice(0, 8)}…</p>
      </div>
    )
  }
  if (report.targetUser) {
    return (
      <div className="bg-zinc-800/60 rounded-lg p-3 text-sm space-y-1">
        <p className="text-zinc-200 font-medium">
          {report.targetUser.name} {report.targetUser.lastname}
        </p>
        <p className="text-zinc-500">@{report.targetUser.username}</p>
      </div>
    )
  }
  return <p className="text-zinc-500 text-sm">Alvo não disponível.</p>
}

// ─── ReportDetail ─────────────────────────────────────────────────────────────

interface ReportDetailProps {
  reportId: string
  token: string
  onBack: () => void
  onUpdated: () => void
}

function ReportDetail({ reportId, token, onBack, onUpdated }: ReportDetailProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [newStatus, setNewStatus] = useState<ReportStatus | ''>('')
  const [note, setNote] = useState('')
  const [modal, setModal] = useState<
    'remove' | 'delete' | 'suspend' | 'ban' | 'unsuspend' | null
  >(null)

  useEffect(() => {
    setLoading(true)
    api.getReport(token, reportId)
      .then((r) => {
        setReport(r)
        setNewStatus(r.status)
        setNote(r.resolutionNote ?? '')
      })
      .catch(() => setError('Não foi possível carregar o relatório.'))
      .finally(() => setLoading(false))
  }, [reportId, token])

  async function handleSave() {
    if (!report || !newStatus) return
    setSaving(true)
    try {
      const body: UpdateReportBody = { status: newStatus as ReportStatus }
      if (note) body.resolutionNote = note
      const updated = await api.updateReport(token, report.id, body)
      setReport(updated)
      onUpdated()
    } catch {
      setError('Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveTarget() {
    if (!report) return
    setSaving(true)
    try {
      await api.removeReportTarget(token, report.id)
      const updated = await api.getReport(token, report.id)
      setReport(updated)
      onUpdated()
    } catch {
      setError('Falha ao remover alvo.')
    } finally {
      setSaving(false)
      setModal(null)
    }
  }

  async function handleDelete() {
    if (!report) return
    setSaving(true)
    try {
      await api.deleteReport(token, report.id)
      onUpdated()
      onBack()
    } catch {
      setError('Falha ao excluir.')
    } finally {
      setSaving(false)
      setModal(null)
    }
  }

  async function handleModerate(
    action: 'SUSPEND' | 'BAN',
    data: { days?: number; reason: string },
  ) {
    if (!report) return
    setSaving(true)
    setError('')
    try {
      await api.moderateUser(token, report.id, {
        action,
        days: data.days,
        reason: data.reason || undefined,
      })
      const updated = await api.getReport(token, report.id)
      setReport(updated)
      onUpdated()
    } catch (err) {
      setError(
        err instanceof api.ApiError ? err.message : 'Falha ao aplicar a punição.',
      )
    } finally {
      setSaving(false)
      setModal(null)
    }
  }

  async function handleUnsuspend() {
    if (!report?.targetUserId) return
    setSaving(true)
    setError('')
    try {
      await api.unsuspendUser(token, report.targetUserId)
      const updated = await api.getReport(token, report.id)
      setReport(updated)
      onUpdated()
    } catch (err) {
      setError(
        err instanceof api.ApiError ? err.message : 'Falha ao reverter a punição.',
      )
    } finally {
      setSaving(false)
      setModal(null)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Spinner />
    </div>
  )

  if (!report) return (
    <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error || 'Relatório não encontrado.'}</div>
  )

  const targetType = getTargetType(report)
  const targetName = report.targetUser
    ? `@${report.targetUser.username}`
    : 'o usuário'
  const isPunished =
    report.status === 'RESOLVED_SUSPENDED' ||
    report.status === 'RESOLVED_BANNED'

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
      <button onClick={onBack} className="text-zinc-400 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors">
        ← Voltar
      </button>

      <div className="flex items-center gap-3 mb-6">
        <TargetBadge type={targetType} />
        <StatusBadge status={report.status} />
        <span className="text-zinc-500 text-sm ml-auto">
          {new Date(report.createdAt).toLocaleString('pt-BR')}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800 mb-4">
        <div className="p-4 space-y-3">
          <Section title="Denúncia">
            <PersonLine label="Motivo" value={report.reason} />
            {report.details && <PersonLine label="Detalhes" value={report.details} />}
          </Section>
        </div>

        <div className="p-4 space-y-2">
          <Section title="Alvo">
            <TargetPreview report={report} />
          </Section>
        </div>

        {report.reporter && (
          <div className="p-4">
            <Section title="Denunciante">
              <PersonLine label="Nome" value={`${report.reporter.name} ${report.reporter.lastname}`} />
              <PersonLine label="Username" value={`@${report.reporter.username}`} />
              <PersonLine label="E-mail" value={report.reporter.email} />
            </Section>
          </div>
        )}

        {report.reviewer && (
          <div className="p-4">
            <Section title="Revisado por">
              <PersonLine label="Nome" value={`${report.reviewer.name} ${report.reviewer.lastname}`} />
              {report.resolvedAt && (
                <PersonLine label="Em" value={new Date(report.resolvedAt).toLocaleString('pt-BR')} />
              )}
            </Section>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Atualizar status</p>
        <Select
          value={newStatus}
          onChange={(v) => setNewStatus(v as ReportStatus)}
          options={STATUS_OPTIONS.filter(
            (o) =>
              o.value !== '' &&
              o.value !== 'RESOLVED_SUSPENDED' &&
              o.value !== 'RESOLVED_BANNED',
          )}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota de resolução (opcional)"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm
                     placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button
          onClick={handleSave} disabled={saving}
          className="h-9 px-5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60
                     text-white text-sm font-semibold transition-colors flex items-center gap-2"
        >
          {saving ? <Spinner /> : 'Salvar'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {targetType === 'USER' ? (
          isPunished ? (
            <button
              onClick={() => setModal('unsuspend')}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-emerald-500/30 text-emerald-400
                         hover:bg-emerald-500/10 text-sm transition-colors"
            >
              <ShieldCheck size={14} /> Reverter punição
            </button>
          ) : (
            <>
              <button
                onClick={() => setModal('suspend')}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-orange-500/30 text-orange-400
                           hover:bg-orange-500/10 text-sm transition-colors"
              >
                <Clock size={14} /> Suspender
              </button>
              <button
                onClick={() => setModal('ban')}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-red-500/30 text-red-400
                           hover:bg-red-500/10 text-sm transition-colors"
              >
                <Ban size={14} /> Banir
              </button>
            </>
          )
        ) : (
          <button
            onClick={() => setModal('remove')}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-amber-500/30 text-amber-400
                       hover:bg-amber-500/10 text-sm transition-colors"
          >
            <X size={14} /> Remover alvo
          </button>
        )}
        <button
          onClick={() => setModal('delete')}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-red-500/30 text-red-400
                     hover:bg-red-500/10 text-sm transition-colors"
        >
          <Trash2 size={14} /> Excluir denúncia
        </button>
      </div>

      {modal === 'remove' && (
        <ConfirmModal
          title="Remover alvo"
          description="O conteúdo denunciado será removido permanentemente. Esta ação não pode ser desfeita."
          confirmLabel="Remover"
          danger
          onConfirm={handleRemoveTarget}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'delete' && (
        <ConfirmModal
          title="Excluir denúncia"
          description="A denúncia será excluída do sistema. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
      {(modal === 'suspend' || modal === 'ban') && (
        <ModerateUserModal
          mode={modal === 'ban' ? 'BAN' : 'SUSPEND'}
          targetName={targetName}
          pending={saving}
          onConfirm={(data) =>
            handleModerate(modal === 'ban' ? 'BAN' : 'SUSPEND', data)
          }
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'unsuspend' && (
        <ConfirmModal
          title="Reverter punição"
          description={`A punição de ${targetName} será levantada — a conta volta a ter acesso. Vale para o usuário, não só para este tíquete.`}
          confirmLabel="Reverter"
          onConfirm={handleUnsuspend}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

interface AdminDashboardProps {
  token: string
  onLogout: () => void
}

function AdminDashboard({ token, onLogout }: AdminDashboardProps) {
  const [view, setView] = useState<View>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters>({ status: 'PENDING', reason: '', targetType: '' })
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchReports = useCallback(async (reset = true) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const params: ReportFilters = { limit: 20 }
      if (filters.status) params.status = filters.status
      if (filters.reason) params.reason = filters.reason
      if (filters.targetType) params.targetType = filters.targetType
      if (!reset && nextCursor) params.cursor = nextCursor

      const res = await api.listReports(token, params)
      setReports((prev) => reset ? res.data : [...prev, ...res.data])
      setNextCursor(res.nextCursor ?? null)
    } catch {
      setError('Não foi possível carregar as denúncias.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [token, filters, nextCursor])

  useEffect(() => { fetchReports(true) }, [token, filters]) // eslint-disable-line react-hooks/exhaustive-deps

  function setFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const pending = reports.filter((r) => r.status === 'PENDING').length
  const reviewed = reports.filter((r) => r.status === 'REVIEWED').length
  const resolved = reports.filter((r) => r.status.startsWith('RESOLVED')).length

  if (view === 'detail' && selectedId) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
          <span className="text-white font-semibold">Conectaí Admin</span>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
            <LogOut size={15} /> Sair
          </button>
        </header>
        <ReportDetail
          reportId={selectedId}
          token={token}
          onBack={() => { setView('list'); setSelectedId(null) }}
          onUpdated={() => fetchReports(true)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <span className="text-white font-semibold">Conectaí Admin</span>
          <span className="ml-2 text-xs text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">Moderação</span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
          <LogOut size={15} /> Sair
        </button>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total" value={reports.length} />
          <MetricCard label="Pendentes" value={pending} accent />
          <MetricCard label="Em revisão" value={reviewed} />
          <MetricCard label="Resolvidos" value={resolved} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filters.status} onChange={(v) => setFilter('status', v)} options={STATUS_OPTIONS} />
          <Select value={filters.reason} onChange={(v) => setFilter('reason', v)} options={REASON_OPTIONS} />
          <Select value={filters.targetType} onChange={(v) => setFilter('targetType', v)} options={TARGET_OPTIONS} />
          <button
            onClick={() => fetchReports(true)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-zinc-700
                       text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
            title="Recarregar"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm gap-2">
              <span className="text-3xl">🎉</span>
              Nenhuma denúncia encontrada com esses filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['ID', 'Alvo', 'Motivo', 'Denunciante', 'Status', 'Data'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wide font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <ReportRow
                      key={r.id}
                      report={r}
                      onClick={() => { setSelectedId(r.id); setView('detail') }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Load more */}
        {nextCursor && !loading && (
          <div className="flex justify-center">
            <button
              onClick={() => fetchReports(false)}
              disabled={loadingMore}
              className="h-9 px-6 rounded-lg border border-zinc-700 text-zinc-300 text-sm
                         hover:bg-zinc-800 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {loadingMore ? <Spinner /> : 'Carregar mais'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function Page() {
  const [token, setToken] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('admin_token')
    if (stored) setToken(stored)
    setHydrated(true)
  }, [])

  function handleLogin(t: string) {
    setToken(t)
  }

  function handleLogout() {
    localStorage.removeItem('admin_token')
    setToken(null)
  }

  if (!hydrated) return null

  if (!token) return <LoginScreen onLogin={handleLogin} />

  return <AdminDashboard token={token} onLogout={handleLogout} />
}
