# Copilot Instructions — Conectaí Admin Web

## Stack

- **Framework:** Next.js 15, App Router, `'use client'` em `app/page.tsx`
- **Linguagem:** TypeScript 5 (strict)
- **Estilização:** Tailwind CSS v3 — use sempre utilitários Tailwind, nunca `style={{}}` ou CSS inline
- **Ícones:** lucide-react
- **Gerenciador de pacotes:** npm

## Arquitetura obrigatória

```
Componente (app/) → callback/hook → service (lib/api.ts) → fetch → backend
```

- **`lib/api.ts`** é a única camada que faz `fetch`. Todo endpoint novo vai aqui, tipado.
- **`app/page.tsx`** contém os componentes React. Nunca chame `fetch` diretamente num componente.
- **`app/layout.tsx`** só tem metadata e import do `globals.css`. Sem lógica.
- **`app/globals.css`** só tem diretivas `@tailwind` e overrides em `@layer base`/`utilities`.

## Regras de código

- Sem `any` explícito — sempre tipar com tipos concretos ou inferidos de `lib/api.ts`
- Sem `as` casting forçado sem comentário justificando
- Componentes em PascalCase, funções utilitárias em camelCase
- Arquivos novos em `app/` ou `lib/`, nunca em `src/` (foi removido)
- Variáveis de ambiente do lado cliente **precisam** do prefixo `NEXT_PUBLIC_`
- Token JWT fica em `localStorage` com chave `admin_token` — não expor em log ou prop
- `useEffect` com todas as dependências listadas no array
- Ações assíncronas sempre com loading state e tratamento de erro via `ApiError`

## Variáveis de ambiente

```env
NEXT_PUBLIC_API_URL=http://localhost:3333
```

## Endpoints do backend (Fastify, porta 3333)

Todos já tipados em `lib/api.ts`:

| Método | Rota | Função |
|---|---|---|
| POST | `/auth/login` | Login admin |
| GET | `/users/me` | Identidade do token |
| GET | `/reports` | Lista denúncias (filtros + cursor) |
| GET | `/reports/:id` | Detalhe |
| PATCH | `/reports/:id` | Atualiza status/nota |
| DELETE | `/reports/:id/target` | Remove conteúdo denunciado |
| DELETE | `/reports/:id` | Exclui denúncia |

Endpoints pendentes no backend (não implementar no frontend ainda):
- `PATCH /admin/users/:id/suspend`
- `PATCH /admin/users/:id/ban`
- `GET /admin/events`, `DELETE /admin/events/:id`
- `GET /admin/consent/audit`

## Paleta de cores (Tailwind)

| Papel | Classe |
|---|---|
| Fundo principal | `bg-black` / gradiente em `globals.css` |
| Superfície card | `bg-zinc-900` |
| Borda | `border-zinc-800` |
| Texto principal | `text-white` |
| Texto secundário | `text-zinc-400` |
| Brand/primary | `bg-violet-600`, `text-violet-400`, `border-violet-500` |
| Perigo | `bg-red-600`, `text-red-400` |
| Aviso | `text-amber-400` |

## Referência ao TCC

- **UC004** — Moderação (RF10/RF11): suspensão, banimento, revisão de denúncias
- **UC005** — Denúncia de conteúdo (RF09): iniciado no mobile, painel exibe resultado
- Não adicionar funcionalidades fora do escopo do TCC
