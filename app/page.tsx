'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogOut, RefreshCw, X, AlertTriangle, Trash2, ShieldCheck, KeyRound, Copy, ArrowLeft, Shield, ChevronDown } from 'lucide-react'
import * as api from '@/lib/api'
import type { Report, ReportStatus, ReportFilters, UpdateReportBody } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'list' | 'detail' | 'lgpd'

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
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  REVIEWED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  RESOLVED_REMOVED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  RESOLVED_INVALID: 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/30',
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

const CONSENT_ACTION_LABEL: Record<string, string> = {
  GRANTED: 'Concedido',
  REVOKED: 'Revogado',
  UPDATED: 'Atualizado',
  EXPORTED: 'Exportado',
}

const CONSENT_ACTION_CLASS: Record<string, string> = {
  GRANTED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  REVOKED: 'bg-red-500/10 text-red-400 border border-red-500/20',
  UPDATED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  EXPORTED: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
}

const CONSENT_ACTION_OPTIONS = [
  { value: '', label: 'Todas as ações' },
  { value: 'GRANTED', label: 'Concedido' },
  { value: 'REVOKED', label: 'Revogado' },
  { value: 'UPDATED', label: 'Atualizado' },
  { value: 'EXPORTED', label: 'Exportado' },
]

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

function ConsentActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CONSENT_ACTION_CLASS[action] ?? 'bg-zinc-700 text-zinc-400'}`}>
      {CONSENT_ACTION_LABEL[action] ?? action}
    </span>
  )
}

// ─── ConsentAuditRow ──────────────────────────────────────────────────────────

interface ConsentAuditRowProps {
  entry: api.ConsentAuditEntry
  expanded: boolean
  onToggle: () => void
}

function ConsentAuditRow({ entry, expanded, onToggle }: ConsentAuditRowProps) {
  const hasMetadata = !!entry.metadata && Object.keys(entry.metadata).length > 0

  return (
    <>
      <tr
        onClick={hasMetadata ? onToggle : undefined}
        className={`border-b border-zinc-800 transition-colors ${hasMetadata ? 'cursor-pointer hover:bg-zinc-800/50' : ''}`}
      >
        <td className="px-4 py-3">
          <p className="text-sm text-zinc-300">{entry.userName}</p>
        </td>
        <td className="px-4 py-3"><ConsentActionBadge action={entry.action} /></td>
        <td className="px-4 py-3 text-sm text-zinc-400">
          {new Date(entry.timestamp).toLocaleString('pt-BR')}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-500 font-mono">
          {entry.ipAddress ?? '—'}
        </td>
        <td className="px-4 py-3">
          {hasMetadata ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggle() }}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Ocultar' : 'Ver'}
            </button>
          ) : (
            <span className="text-xs text-zinc-600">—</span>
          )}
        </td>
      </tr>
      {expanded && hasMetadata && (
        <tr className="border-b border-zinc-800 bg-zinc-950/40">
          <td colSpan={5} className="px-4 py-3">
            <pre className="text-xs text-zinc-400 bg-zinc-900 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── ConsentAuditView ─────────────────────────────────────────────────────────

function ConsentAuditView({ token }: { token: string }) {
  const [stats, setStats] = useState<api.ConsentStats | null>(null)
  const [entries, setEntries] = useState<api.ConsentAuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [draftUserId, setDraftUserId] = useState('')
  const [draftAction, setDraftAction] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')

  const [appliedFilters, setAppliedFilters] = useState<api.ConsentAuditFilters>({})

  useEffect(() => {
    api.getConsentStats(token).then(setStats).catch(() => {})
  }, [token])

  async function fetchEntries(reset = true) {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    setError('')
    try {
      const params: api.ConsentAuditFilters = { limit: 20, ...appliedFilters }
      if (!reset && nextCursor) params.cursor = nextCursor
      const res = await api.listConsentAudit(token, params)
      setEntries((prev) => (reset ? res.data : [...prev, ...res.data]))
      setNextCursor(res.nextCursor ?? null)
    } catch {
      setError('Não foi possível carregar o log de auditoria.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => { fetchEntries(true) }, [appliedFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters() {
    const filters: api.ConsentAuditFilters = {}
    if (draftUserId.trim()) filters.userId = draftUserId.trim()
    if (draftAction) filters.action = draftAction as api.ConsentAction
    if (draftStartDate) filters.startDate = `${draftStartDate}T00:00:00.000Z`
    if (draftEndDate) filters.endDate = `${draftEndDate}T23:59:59.999Z`
    setAppliedFilters(filters)
    setExpandedId(null)
  }

  const totalEvents = stats ? Object.values(stats.actionDistribution).reduce((a, b) => a + b, 0) : 0

  return (
    <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Ativos" value={stats?.totalUsersWithActiveConsent ?? '—'} accent />
        <MetricCard label="Revogados" value={stats?.totalRevocations ?? '—'} />
        <MetricCard label="Exportados" value={stats?.totalExports ?? '—'} />
        <MetricCard label="Total eventos" value={stats ? totalEvents : '—'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="block text-xs text-zinc-500 uppercase tracking-wide font-medium">Usuário (ID)</label>
          <input
            value={draftUserId}
            onChange={(e) => setDraftUserId(e.target.value)}
            placeholder="ID do usuário"
            className="h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm
                       placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-zinc-500 uppercase tracking-wide font-medium">Ação</label>
          <Select value={draftAction} onChange={setDraftAction} options={CONSENT_ACTION_OPTIONS} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-zinc-500 uppercase tracking-wide font-medium">De</label>
          <input
            type="date"
            value={draftStartDate}
            onChange={(e) => setDraftStartDate(e.target.value)}
            className="h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm
                       focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-zinc-500 uppercase tracking-wide font-medium">Até</label>
          <input
            type="date"
            value={draftEndDate}
            onChange={(e) => setDraftEndDate(e.target.value)}
            className="h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm
                       focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <button
          onClick={applyFilters}
          className="h-9 px-5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          Aplicar
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
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm gap-2">
            <Shield size={24} className="text-zinc-700" />
            Nenhum registro de auditoria encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Usuário', 'Ação', 'Data/hora', 'IP', 'Metadata'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wide font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <ConsentAuditRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {nextCursor && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchEntries(false)}
            disabled={loadingMore}
            className="h-9 px-6 rounded-lg border border-zinc-700 text-zinc-300 text-sm
                       hover:bg-zinc-800 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {loadingMore ? <Spinner /> : 'Próxima página'}
          </button>
        </div>
      )}
    </main>
  )
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onLogin: (token: string) => void
}

// Passos do login. A decisão de exigir MFA vem do backend; aqui só reagimos:
//  credentials → (token) entra | (mfaRequired) challenge | (mfaSetupRequired) enroll
type LoginStep = 'credentials' | 'challenge' | 'enroll'

const inputClass =
  'w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm ' +
  'placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors'

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Desafio do segundo fator (conta com MFA já ativo).
  const [mfaCode, setMfaCode] = useState('')

  // Matrícula forçada (admin sem MFA): token de matrícula + QR + segredo.
  const [enrollmentToken, setEnrollmentToken] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [enableCode, setEnableCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  function describeError(err: unknown) {
    setError(err instanceof api.ApiError ? err.message : 'Erro ao conectar ao servidor.')
  }

  // Resolve a resposta do login nos três estados possíveis.
  async function resolveLogin(res: api.LoginResponse) {
    if ('token' in res) {
      localStorage.setItem('admin_token', res.token)
      onLogin(res.token)
      return
    }
    if ('mfaSetupRequired' in res) {
      // Admin sem MFA: já busca o QR com o token de matrícula e abre o cadastro.
      const setup = await api.mfaSetup(res.enrollmentToken)
      setEnrollmentToken(res.enrollmentToken)
      setQrCode(setup.qrCode)
      setSecret(setup.secret)
      setStep('enroll')
      return
    }
    // mfaRequired: conta com MFA ativo, falta o código.
    setStep('challenge')
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resolveLogin(await api.login(email, password))
    } catch (err) {
      describeError(err)
    } finally {
      setLoading(false)
    }
  }

  async function submitChallenge(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resolveLogin(await api.login(email, password, mfaCode.trim()))
    } catch (err) {
      describeError(err)
    } finally {
      setLoading(false)
    }
  }

  async function submitEnable(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.mfaEnable(enrollmentToken, enableCode.trim())
      setRecoveryCodes(res.recoveryCodes)
    } catch (err) {
      describeError(err)
    } finally {
      setLoading(false)
    }
  }

  function resetToCredentials() {
    setStep('credentials')
    setError('')
    setMfaCode('')
    setEnableCode('')
    setEnrollmentToken('')
    setQrCode('')
    setSecret('')
    setRecoveryCodes(null)
  }

  // Concluída a matrícula: vai pro desafio para o admin entrar com um código fresco.
  function finishEnrollment() {
    setRecoveryCodes(null)
    setEnableCode('')
    setError('')
    setStep('challenge')
  }

  const subtitle =
    step === 'enroll'
      ? 'Configurar verificação em duas etapas'
      : step === 'challenge'
        ? 'Verificação em duas etapas'
        : 'Painel de moderação'

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-gradient-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-900/40 mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Conectaí Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={submitCredentials} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400 font-medium uppercase tracking-wide">E-mail</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass} placeholder="admin@conectai.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400 font-medium uppercase tracking-wide">Senha</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputClass} placeholder="••••••••"
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
          )}

          {step === 'challenge' && (
            <form onSubmit={submitChallenge} className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <KeyRound size={15} className="text-violet-400" />
                Digite o código do app autenticador.
              </div>
              <input
                inputMode="numeric" autoFocus required value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className={`${inputClass} text-center tracking-[0.3em] text-lg`}
                placeholder="000000"
              />
              <p className="text-xs text-zinc-500">
                Sem o aparelho? Use um dos seus códigos de recuperação.
              </p>
              <button
                type="submit" disabled={loading || mfaCode.trim().length < 6}
                className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60
                           text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Spinner /> : 'Verificar'}
              </button>
              <button
                type="button" onClick={resetToCredentials}
                className="w-full flex items-center justify-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
              >
                <ArrowLeft size={13} /> Voltar
              </button>
            </form>
          )}

          {step === 'enroll' && recoveryCodes && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <ShieldCheck size={16} /> MFA ativado.
              </div>
              <p className="text-xs text-zinc-400">
                Guarde os <strong className="text-zinc-200">códigos de recuperação</strong> abaixo
                num lugar seguro. Cada um funciona uma única vez e é a sua única forma de entrar
                se perder o aparelho. <strong className="text-zinc-200">Não serão exibidos de novo.</strong>
              </p>
              <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-950 border border-zinc-800 p-3 font-mono text-sm text-zinc-200">
                {recoveryCodes.map((c) => (
                  <span key={c} className="text-center py-0.5">{c}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n'))}
                className="w-full h-9 rounded-lg border border-zinc-700 text-zinc-300 text-xs hover:bg-zinc-800
                           transition-colors flex items-center justify-center gap-1.5"
              >
                <Copy size={13} /> Copiar códigos
              </button>
              <button
                type="button" onClick={finishEnrollment}
                className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold
                           transition-colors"
              >
                Guardei — continuar para o login
              </button>
            </div>
          )}

          {step === 'enroll' && !recoveryCodes && (
            <form onSubmit={submitEnable} className="space-y-4">
              <div className="flex items-start gap-2 text-zinc-300 text-sm">
                <ShieldCheck size={16} className="text-violet-400 mt-0.5 shrink-0" />
                <span>Esta conta exige verificação em duas etapas. Escaneie o QR no Google/Microsoft
                  Authenticator (ou similar) e digite o código gerado.</span>
              </div>
              {qrCode && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode} alt="QR Code para configurar o MFA"
                    className="w-44 h-44 rounded-lg bg-white p-2"
                  />
                </div>
              )}
              {secret && (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Ou digite a chave manualmente</p>
                  <button
                    type="button" onClick={() => navigator.clipboard?.writeText(secret)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg bg-zinc-950 border border-zinc-800
                               px-3 py-2 font-mono text-xs text-zinc-300 hover:bg-zinc-900 transition-colors break-all text-left"
                  >
                    <span>{secret}</span>
                    <Copy size={13} className="shrink-0 text-zinc-500" />
                  </button>
                </div>
              )}
              <input
                inputMode="numeric" autoFocus required value={enableCode}
                onChange={(e) => setEnableCode(e.target.value)}
                className={`${inputClass} text-center tracking-[0.3em] text-lg`}
                placeholder="000000"
              />
              <button
                type="submit" disabled={loading || enableCode.trim().length < 6}
                className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60
                           text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Spinner /> : 'Ativar e continuar'}
              </button>
              <button
                type="button" onClick={resetToCredentials}
                className="w-full flex items-center justify-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
              >
                <ArrowLeft size={13} /> Cancelar
              </button>
            </form>
          )}
        </div>
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
  const [newStatus, setNewStatus] = useState<ReportStatus | ''>('')
  const [note, setNote] = useState('')
  const [modal, setModal] = useState<'remove' | 'delete' | null>(null)

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

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Atualizar status</p>
        <Select
          value={newStatus}
          onChange={(v) => setNewStatus(v as ReportStatus)}
          options={STATUS_OPTIONS.filter((o) => o.value !== '')}
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

      <div className="flex gap-3">
        <button
          onClick={() => setModal('remove')}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-amber-500/30 text-amber-400
                     hover:bg-amber-500/10 text-sm transition-colors"
        >
          <X size={14} /> Remover alvo
        </button>
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
        <span className="text-white font-semibold">Conectaí Admin</span>
        <nav className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center h-7 px-3 rounded-md text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Moderação
          </button>
          <button
            onClick={() => setView('lgpd')}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-sm font-medium transition-colors ${
              view === 'lgpd' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield size={13} /> Auditoria LGPD
          </button>
        </nav>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors">
          <LogOut size={15} /> Sair
        </button>
      </header>

      {view === 'lgpd' ? (
        <ConsentAuditView token={token} />
      ) : (
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
      )}
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
