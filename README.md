# Conectaí — Painel Administrativo Web

Painel de moderação e administração da plataforma **Conectaí**, desenvolvido como parte do TCC de Engenharia de Software / Engenharia da Computação da **Universidade Positivo** (2025).

## Contexto no TCC

Este repositório implementa os seguintes requisitos do documento de especificação técnica:

| Requisito | Descrição | Status |
|-----------|-----------|--------|
| UC004 | Gerenciar Conteúdo Denunciado (Moderador) | ✅ Implementado |
| UC005 | Denunciar Conteúdo (consumido via backend) | ✅ Suportado |
| RF — Painel Admin | Login com role ADMIN, fila de denúncias, ações de moderação | ✅ Implementado |
| UC004 A-1 | Remover Conteúdo e Suspender Conta | 🔜 Aguarda endpoint backend |
| UC004 A-2 | Remover Conteúdo e Banir Permanentemente | 🔜 Aguarda endpoint backend |
| Sidebar Usuários | Listagem e gestão de usuários | 🔜 Próxima fase |
| Sidebar Eventos | Listagem e remoção forçada de eventos | 🔜 Próxima fase |
| Sidebar Auditoria | Histórico de ações LGPD (`/consent/audit`) | 🔜 Próxima fase |

## Stack

- **React 19** + **Vite 8**
- **Lucide React** — ícones
- **CSS puro** — sem framework de UI (design próprio)
- Sem dependências de estado externo (hooks nativos: `useState`, `useEffect`, `useMemo`, `useCallback`)

## Estrutura

```
src/
├── api.js          # Camada de requisições HTTP (fetch + ApiError)
├── App.jsx         # Componente raiz + todas as telas (arquivo único por simplicidade)
├── App.css         # Estilos do painel
├── index.css       # Reset e variáveis globais
└── main.jsx        # Entry point React
```

## Funcionalidades implementadas

### Login
- Autenticação via `/auth/login` do backend
- Validação de `role === 'ADMIN'` após login (via `/users/me`)
- Sessão persistida em `localStorage`
- Logout limpa token e redireciona para login

### Módulo de Denúncias (UC004 / UC005)
- **Métricas**: cards de contagem por status (Pendente, Revisada, Removida, Improcedente)
- **Fila paginada**: tabela com status, motivo, tipo do alvo, denunciante e data
- **Filtros**: por status, motivo da denúncia, tipo do alvo e limite por página
- **Detalhe**: painel lateral com alvo completo (evento, comentário, mensagem ou usuário)
- **Ações de moderação**:
  - Marcar como Revisada → `PATCH /reports/:id` `{ status: "REVIEWED" }`
  - Resolver como Improcedente → `PATCH /reports/:id` `{ status: "RESOLVED_INVALID" }`
  - Resolver como Removida → `PATCH /reports/:id` `{ status: "RESOLVED_REMOVED" }`
  - Remover conteúdo denunciado → `DELETE /reports/:id/target`
  - Excluir denúncia → `DELETE /reports/:id`
- **Modal de confirmação** para ações destrutivas

### Sidebar
| Seção | Status | Notas |
|-------|--------|-------|
| Denúncias | ✅ Ativo | Implementado |
| Usuários | 🔒 Fase futura | Requer `PATCH /admin/users/:id/suspend` no backend |
| Eventos | 🔒 Fase futura | Requer `GET /admin/events` e `DELETE /admin/events/:id` |
| Auditoria | 🔒 Fase futura | Consome `GET /consent/audit` (endpoint existe, precisa de acesso admin) |

## Configuração

### Variáveis de ambiente

```env
# .env.local
VITE_API_URL=http://localhost:3333
```

Por padrão aponta para `http://localhost:3333` (backend local).

### Instalação e execução

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` e faça login com uma conta que tenha `role: ADMIN` no banco.

### Build de produção

```bash
npm run build
# Saída em dist/
```

## Endpoints consumidos

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Autenticação |
| GET | `/users/me` | Validação de role ADMIN |
| GET | `/reports` | Listagem com filtros e paginação |
| GET | `/reports/:id` | Detalhe com relações (evento, comentário, etc.) |
| PATCH | `/reports/:id` | Atualizar status e nota de resolução |
| DELETE | `/reports/:id/target` | Remover conteúdo denunciado |
| DELETE | `/reports/:id` | Excluir denúncia |

## Relação com outros repositórios

| Repositório | Branch relevante |
|-------------|-----------------|
| `connectai-backend` | `main` — fornece todos os endpoints consumidos |
| `connectai-mobile` | `main` — app mobile que gera as denúncias |

## Próximos passos (pendentes no backend)

Para habilitar as seções Usuários e Auditoria completa, o backend precisa de:

```
PATCH /admin/users/:id/suspend   → { type: "suspend"|"ban", durationDays?: number }
GET   /admin/events              → listagem admin (sem filtro de autor)
DELETE /admin/events/:id         → remoção forçada por admin
GET   /admin/consent/audit       → audit LGPD com filtro por userId (acesso admin)
```

## Autores

Gabriel Dias Peixoto · Gabriel Leineker Wolff · Hendrew Gustavo Carvalho dos Santos  
João Adolfo Bonato Maldonado · Vinicius Stadler Ferreira · **Vitor Henrique Camillo**

Orientador: Prof. Josemar Luís Felix — Universidade Positivo, 2025
