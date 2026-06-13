# Conectaí Admin Web

Painel administrativo de moderação do aplicativo **Conectaí**, desenvolvido como parte do Trabalho de Conclusão de Curso (TCC).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript 5 |
| Estilização | Tailwind CSS v3 |
| Ícones | lucide-react |
| Runtime | Node.js 20+ |

> Stack definida pelo TCC: React + Next.js + TypeScript + Tailwind CSS (seção de requisitos de tecnologia).

---

## Estrutura

```
connectai-admin-web/
├── app/
│   ├── layout.tsx       # RootLayout com metadados e globals.css
│   ├── page.tsx         # Aplicação completa (SPA via 'use client')
│   └── globals.css      # Tailwind directives + gradiente de fundo
├── lib/
│   └── api.ts           # Cliente HTTP tipado (tipos + funções de API)
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

### Arquitetura de camadas

```
Tela (page.tsx) → hook/callback → service (lib/api.ts) → HTTP
```

Nenhuma chamada HTTP é feita diretamente em componentes — toda comunicação com o backend passa por `lib/api.ts`.

---

## Referência ao TCC

### UC004 — Moderação de conteúdo (RF10, RF11)
- **Tela de denúncias**: listagem com filtros por status, motivo e tipo de alvo ✅
- **Detalhe de denúncia**: visualização completa + atualização de status + nota de resolução ✅
- **Remoção de alvo**: `DELETE /reports/:id/target` ✅
- **Exclusão de denúncia**: `DELETE /reports/:id` ✅
- **A-1 Suspensão temporária**: aguarda endpoint `PATCH /admin/users/:id/suspend` no backend ⏳
- **A-2 Banimento permanente**: aguarda endpoint `PATCH /admin/users/:id/ban` no backend ⏳

### UC005 — Denúncia de conteúdo (RF09)
Fluxo iniciado pelo usuário no app mobile. O backend recebe e persiste (`POST /reports`). O painel exibe as denúncias resultantes via `GET /reports`.

---

## Endpoints consumidos

| Método | Rota | Função |
|---|---|---|
| POST | `/auth/login` | Autenticação do admin |
| GET | `/users/me` | Verifica identidade do token |
| GET | `/reports` | Lista denúncias (filtros + paginação por cursor) |
| GET | `/reports/:id` | Detalhe de uma denúncia |
| PATCH | `/reports/:id` | Atualiza status e nota de resolução |
| DELETE | `/reports/:id/target` | Remove o conteúdo denunciado |
| DELETE | `/reports/:id` | Exclui a denúncia |

---

## Endpoints pendentes no backend

Estes endpoints precisam ser criados na branch `feat/admin-moderation-actions` do backend:

| Método | Rota | Descrição |
|---|---|---|
| PATCH | `/admin/users/:id/suspend` | Suspensão temporária (UC004 A-1) |
| PATCH | `/admin/users/:id/ban` | Banimento permanente (UC004 A-2) |
| GET | `/admin/events` | Listagem de eventos para moderação |
| DELETE | `/admin/events/:id` | Remoção de evento por admin |
| GET | `/admin/consent/audit` | Auditoria global de consentimento (RF11) |

---

## Configuração

### Variáveis de ambiente

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

Em produção, aponte para a URL do backend implantado.

### Instalar e rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção
npm run start    # servir build de produção
```

---

## Credenciais de acesso

O login utiliza as credenciais de um usuário com role `ADMIN` cadastrado no banco do backend. Não há cadastro pelo painel — o admin é criado diretamente via seed ou migration no backend.

---

## Autenticação

O token JWT retornado pelo login é armazenado em `localStorage` (`admin_token`) e enviado como `Authorization: Bearer <token>` em todas as requisições. O `'use client'` no `page.tsx` permite o uso de `localStorage` dentro do Next.js App Router.
