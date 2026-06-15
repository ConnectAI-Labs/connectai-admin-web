'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogOut, RefreshCw, X, AlertTriangle, Trash2, Ban, ShieldOff, RotateCcw } from 'lucide-react'
import * as api from '@/lib/api'
import type { Report, ReportFilters } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'list' | 'detail'

interface Filters {
  status: string
  reason: string
  targetType: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Status = a própria resolução. PENDING (padrão) + os RESOLVED_*. REVIEWED foi
// removido: "olhei mas não resolvi" não é resolução — a nota cobre isso.
const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'RESOLVED_REMOVED', label: 'Removido' },
  { value: 'RESOLVED_INVALID', label: 'Denúncia inválida' },
  { value: 'RESOLVED_SUSPENDED', label: 'Usuário suspenso' },
  { value: 'RESOLVED_BANNED', label: 'Usuário banido' },
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
  { value: 'POST', label: 'Publicação' },
  { value: 'COMMENT', label: 'Comentário' },
  { value: 'MESSAGE', label: 'Mensagem' },
  { value: 'USER', label: 'Usuário' },
]

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  // Legado: denúncias antigas ainda podem ter REVIEWED; mantido só p/ exibição.
  REVIEWED: 'Em revisão',
  RESOLVED_REMOVED: 'Removido',
  RESOLVED_INVALID: 'Inválida',
  RESOLVED_SUSPENDED: 'Suspenso',
  RESOLVED_BANNED: 'Banido',
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  REVIEWED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  RESOLVED_REMOVED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  RESOLVED_INVALID: 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/30',
  RESOLVED_SUSPENDED: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  RESOLVED_BANNED: 'bg-red-500/15 text-red-300 border border-red-500/30',
}

const TARGET_LABEL: Record<string, string> = {
  EVENT: 'Evento',
  POST: 'Publicação',
  COMMENT: 'Comentário',
  MESSAGE: 'Mensagem',
  USER: 'Usuário',
}

const TARGET_CLASS: Record<string, string> = {
  EVENT: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  POST: 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20',
  COMMENT: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  MESSAGE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  USER: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
}

function getTargetType(report: Report): string {
  if (report.eventId) return 'EVENT'
  if (report.postId) return 'POST'
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
  if (report.post) {
    const { post } = report
    return (
      <div className="bg-zinc-800/60 rounded-lg p-3 text-sm space-y-2">
        {post.content && (
          <p className="text-zinc-300 whitespace-pre-wrap">&ldquo;{post.content}&rdquo;</p>
        )}
        {post.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {post.images.map((img) => (
              <a
                key={img.id}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt="Imagem denunciada"
                  className="aspect-square w-full rounded-md object-cover border border-zinc-700"
                />
              </a>
            ))}
          </div>
        )}
        <p className="text-zinc-500">
          {post.author
            ? `${post.author.name} ${post.author.lastname} · @${post.author.username}`
            : `Autor: ${post.authorId.slice(0, 8)}…`}
          {post.event ? ` · Evento: ${post.event.title}` : ''}
        </p>
      </div>
    )
  }
  if (report.comment) {
    return (
      <div className="bg-zinc-800/60 rounded-lg p-3 text-sm">
        <p className="text-zinc-300 italic">&ldquo;{report.comment.content}&rdquo;</p>
      </div>
    )
  }
  if (report.message) {
    return (
      <div className="bg-zinc-800/60 rounded-lg p-3 text-sm">
        <p className="text-zinc-300 italic">&ldquo;{report.message.content ?? '(sem conteúdo)'}&rdquo;</p>
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
  const [note, setNote] = useState('')
  const [modal, setModal] = useState<'remove' | 'suspend' | 'ban' | null>(null)
  const [suspendDays, setSuspendDays] = useState(7)

  useEffect(() => {
    setLoading(true)
    api.getReport(token, reportId)
      .then((r) => {
        setReport(r)
        setNote(r.resolutionNote ?? '')
      })
      .catch(() => setError('Não foi possível carregar o relatório.'))
      .finally(() => setLoading(false))
  }, [reportId, token])

  // Toda resolução é uma transição de status; a nota da moderação acompanha.
  async function resolve(fn: () => Promise<unknown>, failMsg: string) {
    if (!report) return
    setSaving(true)
    setError('')
    try {
      await fn()
      const updated = await api.getReport(token, report.id)
      setReport(updated)
      onUpdated()
    } catch {
      setError(failMsg)
    } finally {
      setSaving(false)
      setModal(null)
    }
  }

  const noteOrUndefined = () => (note.trim() ? note.trim() : undefined)

  const handleSaveNote = () =>
    resolve(
      () => api.updateReport(token, report!.id, { status: report!.status, resolutionNote: note.trim() }),
      'Falha ao salvar a nota.',
    )

  const handleInvalid = () =>
    resolve(
      () => api.updateReport(token, report!.id, { status: 'RESOLVED_INVALID', resolutionNote: noteOrUndefined() }),
      'Falha ao marcar como inválida.',
    )

  const handleReopen = () =>
    resolve(
      () => api.updateReport(token, report!.id, { status: 'PENDING', resolutionNote: noteOrUndefined() }),
      'Falha ao reabrir.',
    )

  // Remover conteúdo: o backend já transiciona para RESOLVED_REMOVED; a nota da
  // moderação (se houver) é persistida por cima.
  const handleRemoveTarget = () =>
    resolve(async () => {
      await api.removeReportTarget(token, report!.id)
      if (note.trim())
        await api.updateReport(token, report!.id, { status: 'RESOLVED_REMOVED', resolutionNote: note.trim() })
    }, 'Falha ao remover o conteúdo.')

  const handleModerate = (action: 'SUSPEND' | 'BAN') =>
    resolve(
      () =>
        api.moderateUser(token, report!.id, {
          action,
          days: action === 'SUSPEND' ? suspendDays : undefined,
          reason: noteOrUndefined(),
        }),
      action === 'SUSPEND'
        ? 'Falha ao suspender (requer o backend de moderação de usuário — PR #94).'
        : 'Falha ao banir (requer o backend de moderação de usuário — PR #94).',
    )


  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Spinner />
    </div>
  )

  if (!report) return (
    <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error || 'Relatório não encontrado.'}</div>
  )

  const targetType = getTargetType(report)

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

      {/* Resolução = o próprio status. A nota é sempre opcional e independente. */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4 mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Resolução</p>

        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota da moderação (opcional) — registrada na denúncia."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm
                       placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            onClick={handleSaveNote} disabled={saving}
            className="mt-2 h-8 px-3 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800
                       disabled:opacity-60 text-xs font-medium transition-colors"
          >
            Salvar nota
          </button>
        </div>

        <div className="border-t border-zinc-800 pt-4 space-y-3">
          {targetType === 'USER' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Suspensão por</span>
                <input
                  type="number" min={1} max={3650} value={suspendDays}
                  onChange={(e) => setSuspendDays(Math.max(1, Math.min(3650, Number(e.target.value) || 1)))}
                  className="w-16 h-8 px-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm
                             focus:outline-none focus:border-violet-500"
                />
                <span className="text-xs text-zinc-400">dias</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setModal('suspend')} disabled={saving}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-500
                             disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  <ShieldOff size={14} /> Suspender
                </button>
                <button
                  onClick={() => setModal('ban')} disabled={saving}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-red-600 hover:bg-red-500
                             disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                >
                  <Ban size={14} /> Banir
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setModal('remove')} disabled={saving}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-red-600 hover:bg-red-500
                         disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              <Trash2 size={14} /> Remover conteúdo
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleInvalid} disabled={saving}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-zinc-600 text-zinc-300
                         hover:bg-zinc-800 disabled:opacity-60 text-sm transition-colors"
            >
              <X size={14} /> Denúncia inválida
            </button>
            {report.status !== 'PENDING' && (
              <button
                onClick={handleReopen} disabled={saving}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-amber-500/30 text-amber-400
                           hover:bg-amber-500/10 disabled:opacity-60 text-sm transition-colors"
              >
                <RotateCcw size={14} /> Reabrir (pendente)
              </button>
            )}
          </div>
        </div>
      </div>

      {modal === 'remove' && (
        <ConfirmModal
          title="Remover conteúdo"
          description="O conteúdo denunciado será removido permanentemente e a denúncia marcada como Removido. Esta ação não pode ser desfeita."
          confirmLabel="Remover"
          danger
          onConfirm={handleRemoveTarget}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'suspend' && (
        <ConfirmModal
          title="Suspender usuário"
          description={`O usuário ficará suspenso por ${suspendDays} dia(s) e a denúncia será marcada como Suspenso.`}
          confirmLabel="Suspender"
          danger
          onConfirm={() => handleModerate('SUSPEND')}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'ban' && (
        <ConfirmModal
          title="Banir usuário"
          description="O usuário será banido permanentemente e a denúncia marcada como Banido. Esta ação não pode ser desfeita."
          confirmLabel="Banir"
          danger
          onConfirm={() => handleModerate('BAN')}
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
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Total" value={reports.length} />
          <MetricCard label="Pendentes" value={pending} accent />
          <MetricCard label="Resolvidas" value={resolved} />
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
