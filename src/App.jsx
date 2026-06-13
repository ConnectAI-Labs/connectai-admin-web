import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Eye,
  FileWarning,
  Filter,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  ApiError,
  deleteReport,
  getMe,
  getReport,
  listReports,
  login,
  removeReportTarget,
  updateReport,
} from './api'
import './App.css'

const TOKEN_KEY = 'connectai_admin_token'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'REVIEWED', label: 'Revisadas' },
  { value: 'RESOLVED_REMOVED', label: 'Removidas' },
  { value: 'RESOLVED_INVALID', label: 'Improcedentes' },
]

const REASON_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'HATE_SPEECH', label: 'Discurso de odio' },
  { value: 'SPAM_OR_FRAUD', label: 'Spam ou fraude' },
  { value: 'HARASSMENT', label: 'Assedio' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Conteudo inapropriado' },
  { value: 'OTHER', label: 'Outro' },
]

const TARGET_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'EVENT', label: 'Evento' },
  { value: 'COMMENT', label: 'Comentario' },
  { value: 'MESSAGE', label: 'Mensagem' },
  { value: 'USER', label: 'Usuario' },
]

const STATUS_META = {
  PENDING: {
    label: 'Pendente',
    tone: 'warning',
    icon: Clock3,
  },
  REVIEWED: {
    label: 'Revisada',
    tone: 'info',
    icon: Eye,
  },
  RESOLVED_REMOVED: {
    label: 'Removida',
    tone: 'danger',
    icon: Trash2,
  },
  RESOLVED_INVALID: {
    label: 'Improcedente',
    tone: 'success',
    icon: CheckCircle2,
  },
}

const REASON_LABELS = Object.fromEntries(
  REASON_OPTIONS.filter((item) => item.value).map((item) => [
    item.value,
    item.label,
  ]),
)

const TARGET_LABELS = {
  EVENT: 'Evento',
  COMMENT: 'Comentario',
  MESSAGE: 'Mensagem',
  USER: 'Usuario',
}

function getTargetType(report) {
  if (report.eventId) return 'EVENT'
  if (report.commentId) return 'COMMENT'
  if (report.messageId) return 'MESSAGE'
  if (report.targetUserId) return 'USER'
  return 'UNKNOWN'
}

function getTargetSummary(report) {
  if (report.event) return report.event.title
  if (report.comment) return report.comment.content
  if (report.message) return report.message.content ?? 'Mensagem sem texto'
  if (report.targetUser) return `@${report.targetUser.username}`
  return 'Alvo removido ou indisponivel'
}

function formatName(user) {
  if (!user) return 'Nao informado'
  return `${user.name} ${user.lastname}`.trim()
}

function formatDate(value) {
  if (!value) return 'Nao informado'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function classNames(...items) {
  return items.filter(Boolean).join(' ')
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(Boolean(token))
  const [authError, setAuthError] = useState('')

  const handleLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setAuthError('')
  }, [])

  useEffect(() => {
    let ignore = false

    async function validateSession() {
      if (!token) return
      setAuthChecking(true)
      try {
        const me = await getMe(token)
        if (me.role !== 'ADMIN') {
          throw new Error('Este usuario nao tem permissao de admin.')
        }
        if (!ignore) {
          setUser(me)
          setAuthError('')
        }
      } catch (error) {
        if (!ignore) {
          setAuthError(error.message)
          handleLogout()
        }
      } finally {
        if (!ignore) setAuthChecking(false)
      }
    }

    validateSession()
    return () => {
      ignore = true
    }
  }, [handleLogout, token])

  async function handleLogin(email, password) {
    setAuthError('')
    const result = await login(email, password)
    const me = await getMe(result.token)

    if (me.role !== 'ADMIN') {
      throw new Error('Acesso bloqueado: usuario nao e admin.')
    }

    localStorage.setItem(TOKEN_KEY, result.token)
    setToken(result.token)
    setUser(me)
  }

  if (!token || !user) {
    return (
      <LoginScreen
        checking={authChecking}
        error={authError}
        onLogin={handleLogin}
      />
    )
  }

  return <AdminDashboard token={token} user={user} onLogout={handleLogout} />
}

function LoginScreen({ checking, error, onLogin }) {
  const [email, setEmail] = useState('admin@conectai.dev')
  const [password, setPassword] = useState('senha123')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setFormError('')
    try {
      await onLogin(email, password)
    } catch (err) {
      setFormError(err.message ?? 'Nao foi possivel entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-brand">
          <div className="brand-mark">C</div>
          <div>
            <p className="eyebrow">ConnectAI Admin</p>
            <h1>Central de moderacao</h1>
            <p>
              Controle a fila de denuncias, revise evidencias e execute acoes
              seguras usando o backend atual da main.
            </p>
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          <div className="login-card-header">
            <ShieldCheck size={28} />
            <div>
              <h2>Acesso administrativo</h2>
              <p>Use uma conta com role ADMIN.</p>
            </div>
          </div>

          <label className="field">
            <span>E-mail</span>
            <input
              autoComplete="email"
              disabled={checking || loading}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              autoComplete="current-password"
              disabled={checking || loading}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          {(formError || error) && (
            <div className="form-error">{formError || error}</div>
          )}

          <button className="primary-button login-button" disabled={loading}>
            {loading || checking ? (
              <>
                <Loader2 className="spin" size={18} />
                Validando
              </>
            ) : (
              <>
                Entrar no painel
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  )
}

function AdminDashboard({ token, user, onLogout }) {
  const [filters, setFilters] = useState({
    status: 'PENDING',
    reason: '',
    targetType: '',
    limit: 20,
  })
  const [reports, setReports] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState(null)

  const selectedType = selectedReport ? getTargetType(selectedReport) : null

  const metrics = useMemo(() => {
    const base = {
      PENDING: 0,
      REVIEWED: 0,
      RESOLVED_REMOVED: 0,
      RESOLVED_INVALID: 0,
    }
    reports.forEach((report) => {
      base[report.status] = (base[report.status] ?? 0) + 1
    })
    return base
  }, [reports])

  const loadReports = useCallback(
    async ({ cursor, append = false } = {}) => {
      setLoading(true)
      setError('')
      try {
        const payload = await listReports(token, {
          ...filters,
          cursor,
        })
        const nextData = append ? [...reports, ...payload.data] : payload.data
        setReports(nextData)
        setNextCursor(payload.nextCursor)

        const nextSelection =
          nextData.find((report) => report.id === selectedId) ?? nextData[0]
        setSelectedId(nextSelection?.id ?? null)
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Nao foi possivel carregar denuncias.',
        )
      } finally {
        setLoading(false)
      }
    },
    [filters, reports, selectedId, token],
  )

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.reason, filters.targetType, filters.limit, token])

  useEffect(() => {
    let ignore = false

    async function loadDetail() {
      if (!selectedId) {
        setSelectedReport(null)
        return
      }
      setDetailLoading(true)
      setError('')
      try {
        const detail = await getReport(token, selectedId)
        if (!ignore) setSelectedReport(detail)
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Nao foi possivel abrir a denuncia.',
          )
        }
      } finally {
        if (!ignore) setDetailLoading(false)
      }
    }

    loadDetail()
    return () => {
      ignore = true
    }
  }, [selectedId, token])

  function changeFilter(key, value) {
    setSelectedId(null)
    setSelectedReport(null)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  async function runAction(label, action) {
    if (!selectedReport) return
    setActionLoading(label)
    setNotice('')
    setError('')
    try {
      const updated = await action(selectedReport)
      setNotice('Acao concluida com sucesso.')
      if (updated) {
        setSelectedReport(updated)
        setSelectedId(updated.id)
      } else {
        setSelectedReport(null)
        setSelectedId(null)
      }
      await loadReports()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Nao foi possivel executar a acao.',
      )
    } finally {
      setActionLoading('')
      setConfirm(null)
    }
  }

  function confirmTargetRemoval() {
    if (!selectedReport) return
    setConfirm({
      title: 'Remover conteudo denunciado?',
      body:
        selectedType === 'USER'
          ? 'O backend atual nao possui fluxo de banimento ou suspensao de usuario por denuncia.'
          : 'Esta acao remove o alvo denunciado e marca a denuncia como conteudo removido.',
      danger: true,
      disabled: selectedType === 'USER',
      confirmLabel: selectedType === 'USER' ? 'Indisponivel' : 'Remover',
      onConfirm: () =>
        runAction('remove-target', (report) => removeReportTarget(token, report.id)),
    })
  }

  function confirmDeleteReport() {
    if (!selectedReport) return
    setConfirm({
      title: 'Excluir denuncia?',
      body:
        'A denuncia sera removida do banco, mas o conteudo alvo nao sera alterado.',
      danger: true,
      confirmLabel: 'Excluir denuncia',
      onConfirm: () =>
        runAction('delete-report', (report) => deleteReport(token, report.id)),
    })
  }

  const navigation = [
    { label: 'Denuncias', icon: FileWarning, active: true },
    { label: 'Usuarios', icon: Users, muted: true },
    { label: 'Eventos', icon: LayoutDashboard, muted: true },
    { label: 'Auditoria', icon: ShieldCheck, muted: true },
  ]

  return (
    <main className="admin-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>ConnectAI</strong>
            <span>Admin</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacao admin">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={classNames(
                  'nav-item',
                  item.active && 'active',
                  item.muted && 'muted',
                )}
                disabled={item.muted}
                key={item.label}
                title={item.muted ? 'Fase futura' : item.label}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span>{user.name?.[0] ?? 'A'}</span>
            <div>
              <strong>{formatName(user)}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button className="ghost-button full" onClick={onLogout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Fila de moderacao</p>
            <h1>Denuncias</h1>
          </div>
          <button className="ghost-button" onClick={() => loadReports()}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </header>

        <section className="metrics-grid" aria-label="Resumo das denuncias">
          <MetricCard
            icon={Clock3}
            label="Pendentes"
            tone="warning"
            value={metrics.PENDING}
          />
          <MetricCard
            icon={Eye}
            label="Revisadas"
            tone="info"
            value={metrics.REVIEWED}
          />
          <MetricCard
            icon={Trash2}
            label="Removidas"
            tone="danger"
            value={metrics.RESOLVED_REMOVED}
          />
          <MetricCard
            icon={CheckCircle2}
            label="Improcedentes"
            tone="success"
            value={metrics.RESOLVED_INVALID}
          />
        </section>

        <section className="workspace">
          <div className="queue-panel">
            <div className="panel-head">
              <div>
                <h2>Fila de denuncias</h2>
                <p>{reports.length} itens carregados do backend local</p>
              </div>
              <div className="search-shell">
                <Search size={15} />
                <span>Backend main</span>
              </div>
            </div>

            <div className="filters">
              <Filter size={16} />
              <Select
                label="Status"
                onChange={(value) => changeFilter('status', value)}
                options={STATUS_OPTIONS}
                value={filters.status}
              />
              <Select
                label="Motivo"
                onChange={(value) => changeFilter('reason', value)}
                options={REASON_OPTIONS}
                value={filters.reason}
              />
              <Select
                label="Tipo"
                onChange={(value) => changeFilter('targetType', value)}
                options={TARGET_OPTIONS}
                value={filters.targetType}
              />
              <Select
                label="Limite"
                onChange={(value) => changeFilter('limit', Number(value))}
                options={[
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                  { value: 50, label: '50' },
                ]}
                value={filters.limit}
              />
            </div>

            {error && (
              <div className="inline-alert danger">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            {notice && (
              <div className="inline-alert success">
                <CheckCircle2 size={16} />
                {notice}
              </div>
            )}

            <ReportList
              loading={loading}
              onSelect={setSelectedId}
              reports={reports}
              selectedId={selectedId}
            />

            <div className="pagination-row">
              <button
                className="secondary-button"
                disabled={!nextCursor || loading}
                onClick={() => loadReports({ cursor: nextCursor, append: true })}
              >
                {loading ? <Loader2 className="spin" size={16} /> : null}
                Carregar mais
              </button>
            </div>
          </div>

          <ReportDetail
            actionLoading={actionLoading}
            detailLoading={detailLoading}
            onDeleteReport={confirmDeleteReport}
            onRemoveTarget={confirmTargetRemoval}
            onResolveInvalid={() =>
              runAction('resolve-invalid', (report) =>
                updateReport(token, report.id, {
                  status: 'RESOLVED_INVALID',
                  resolutionNote: 'Denuncia improcedente apos revisao.',
                }),
              )
            }
            onResolveRemoved={() =>
              runAction('resolve-removed', (report) =>
                updateReport(token, report.id, {
                  status: 'RESOLVED_REMOVED',
                  resolutionNote: 'Conteudo removido ou indisponivel.',
                }),
              )
            }
            onReview={() =>
              runAction('review', (report) =>
                updateReport(token, report.id, {
                  status: 'REVIEWED',
                  resolutionNote: 'Analisado pela moderacao.',
                }),
              )
            }
            report={selectedReport}
          />
        </section>
      </section>

      {confirm && (
        <ConfirmModal
          confirm={confirm}
          loading={Boolean(actionLoading)}
          onClose={() => setConfirm(null)}
        />
      )}
    </main>
  )
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={classNames('metric-card', tone)}>
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function Select({ label, options, value, onChange }) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ReportList({ loading, reports, selectedId, onSelect }) {
  if (loading && reports.length === 0) {
    return (
      <div className="empty-state">
        <Loader2 className="spin" size={26} />
        <strong>Carregando denuncias</strong>
        <span>Consultando /reports no backend local.</span>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="empty-state">
        <ShieldCheck size={28} />
        <strong>Nenhuma denuncia encontrada</strong>
        <span>Ajuste os filtros ou atualize a fila.</span>
      </div>
    )
  }

  return (
    <div className="report-table">
      <div className="table-row table-header">
        <span>Status</span>
        <span>Motivo</span>
        <span>Alvo</span>
        <span>Denunciante</span>
        <span>Data</span>
      </div>
      {reports.map((report) => (
        <ReportRow
          active={report.id === selectedId}
          key={report.id}
          onSelect={() => onSelect(report.id)}
          report={report}
        />
      ))}
    </div>
  )
}

function ReportRow({ active, report, onSelect }) {
  const targetType = getTargetType(report)

  return (
    <button
      className={classNames('table-row report-row', active && 'selected')}
      onClick={onSelect}
    >
      <span>
        <StatusBadge status={report.status} />
      </span>
      <span className="strong-cell">{REASON_LABELS[report.reason]}</span>
      <span>
        <TargetBadge type={targetType} />
        <small>{getTargetSummary(report)}</small>
      </span>
      <span>
        <strong>{formatName(report.reporter)}</strong>
        <small>@{report.reporter?.username}</small>
      </span>
      <span>{formatDate(report.createdAt)}</span>
    </button>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    tone: 'neutral',
    icon: CircleDot,
  }
  const Icon = meta.icon
  return (
    <span className={classNames('status-badge', meta.tone)}>
      <Icon size={13} />
      {meta.label}
    </span>
  )
}

function TargetBadge({ type }) {
  const label = TARGET_LABELS[type] ?? 'Indisponivel'
  return <span className="target-badge">{label}</span>
}

function ReportDetail({
  actionLoading,
  detailLoading,
  onDeleteReport,
  onRemoveTarget,
  onResolveInvalid,
  onResolveRemoved,
  onReview,
  report,
}) {
  if (!report) {
    return (
      <aside className="detail-panel empty-detail">
        <FileWarning size={30} />
        <h2>Selecione uma denuncia</h2>
        <p>O detalhe mostra evidencias, alvo e acoes de moderacao.</p>
      </aside>
    )
  }

  const targetType = getTargetType(report)
  const targetIsUser = targetType === 'USER'

  return (
    <aside className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="eyebrow">Detalhe da denuncia</p>
          <h2>{TARGET_LABELS[targetType] ?? 'Alvo indisponivel'}</h2>
        </div>
        {detailLoading ? <Loader2 className="spin" size={20} /> : null}
      </div>

      <div className="detail-status-line">
        <StatusBadge status={report.status} />
        <span>{formatDate(report.createdAt)}</span>
      </div>

      <Section title="Motivo">
        <p className="reason-text">{REASON_LABELS[report.reason]}</p>
        <p className="muted-text">{report.details ?? 'Sem detalhes extras.'}</p>
      </Section>

      <Section title="Denunciante">
        <PersonLine user={report.reporter} />
      </Section>

      <Section title="Alvo">
        <TargetPreview report={report} />
      </Section>

      <Section title="Resolucao">
        <div className="resolution-box">
          <span>Revisor</span>
          <strong>{report.reviewer ? formatName(report.reviewer) : 'Ainda sem revisor'}</strong>
          <span>Nota</span>
          <p>{report.resolutionNote ?? 'Nenhuma nota registrada.'}</p>
          <span>Resolvido em</span>
          <p>{report.resolvedAt ? formatDate(report.resolvedAt) : 'Em aberto'}</p>
        </div>
      </Section>

      {targetIsUser && (
        <div className="inline-alert warning">
          <Ban size={16} />
          O backend atual ainda nao possui suspensao ou banimento de usuario.
        </div>
      )}

      <div className="action-stack">
        <button
          className="primary-button"
          disabled={Boolean(actionLoading)}
          onClick={onReview}
        >
          {actionLoading === 'review' ? <Loader2 className="spin" size={16} /> : null}
          Marcar como revisada
        </button>
        <button
          className="secondary-button"
          disabled={Boolean(actionLoading)}
          onClick={onResolveInvalid}
        >
          Resolver como improcedente
        </button>
        <button
          className="secondary-button danger-outline"
          disabled={Boolean(actionLoading)}
          onClick={onResolveRemoved}
        >
          Resolver como removida
        </button>
        <button
          className="danger-button"
          disabled={Boolean(actionLoading) || targetIsUser}
          onClick={onRemoveTarget}
        >
          <Trash2 size={16} />
          Remover conteudo
        </button>
        <button
          className="ghost-button danger-text"
          disabled={Boolean(actionLoading)}
          onClick={onDeleteReport}
        >
          Excluir denuncia
        </button>
      </div>
    </aside>
  )
}

function Section({ title, children }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function PersonLine({ user }) {
  return (
    <div className="person-line">
      <div className="avatar">{user?.name?.[0] ?? '?'}</div>
      <div>
        <strong>{formatName(user)}</strong>
        <span>@{user?.username ?? 'indisponivel'}</span>
        <small>{user?.email ?? 'sem email'}</small>
      </div>
    </div>
  )
}

function TargetPreview({ report }) {
  const targetType = getTargetType(report)

  if (targetType === 'EVENT') {
    return (
      <div className="target-preview">
        <TargetBadge type="EVENT" />
        <strong>{report.event?.title ?? 'Evento removido'}</strong>
        <span>{report.event?.isPublic ? 'Publico' : 'Privado'}</span>
        <small>{report.event ? formatDate(report.event.date) : 'Sem data'}</small>
      </div>
    )
  }

  if (targetType === 'COMMENT') {
    return (
      <div className="target-preview">
        <TargetBadge type="COMMENT" />
        <strong>{report.comment?.content ?? 'Comentario removido'}</strong>
        <small>Autor: {report.comment?.authorId ?? 'indisponivel'}</small>
      </div>
    )
  }

  if (targetType === 'MESSAGE') {
    return (
      <div className="target-preview">
        <TargetBadge type="MESSAGE" />
        <MessageSquare size={16} />
        <strong>{report.message?.content ?? 'Mensagem sem texto'}</strong>
        <small>Conversa: {report.message?.conversationId ?? 'indisponivel'}</small>
      </div>
    )
  }

  if (targetType === 'USER') {
    return <PersonLine user={report.targetUser} />
  }

  return (
    <div className="target-preview">
      <TargetBadge type="UNKNOWN" />
      <strong>Alvo indisponivel</strong>
    </div>
  )
}

function ConfirmModal({ confirm, loading, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        <div className={classNames('modal-icon', confirm.danger && 'danger')}>
          <AlertTriangle size={24} />
        </div>
        <h2>{confirm.title}</h2>
        <p>{confirm.body}</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={confirm.danger ? 'danger-button' : 'primary-button'}
            disabled={confirm.disabled || loading}
            onClick={confirm.onConfirm}
          >
            {loading ? <Loader2 className="spin" size={16} /> : null}
            {confirm.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default App
