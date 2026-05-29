# Fullstack Challenge — Crash Game Solution

> **Nota de escopo:** Este projeto usa créditos fictícios e foi criado exclusivamente como desafio técnico local. Não processa dinheiro real e não deve ser usado como produto de apostas.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Bun (latest) |
| Backend | NestJS 11 + TypeScript strict |
| Banco | PostgreSQL 18 via Prisma ORM |
| Mensageria | RabbitMQ 4.2 |
| API Gateway | Kong 3.9 (DB-less) |
| IdP | Keycloak 26.5 (OIDC, PKCE S256) |
| WebSocket | `@nestjs/websockets` + socket.io |
| Frontend | Next.js 15 + Tailwind CSS v4 + TanStack Query + Zustand |
| Infra | Docker Compose |

---

## Como rodar

```bash
git clone https://github.com/<seu-usuario>/fullstack-challenge
cd fullstack-challenge
bun install
bun run docker:up
```

Aguarde todos os healthchecks passarem (~60s na primeira vez). Depois:

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:8000 |
| Game Service (direto) | http://localhost:4001 |
| Wallet Service (direto) | http://localhost:4002 |
| Swagger — Games | http://localhost:4001/docs |
| Swagger — Wallets | http://localhost:4002/docs |
| RabbitMQ UI | http://localhost:15672 (admin/admin) |
| Keycloak Admin | http://localhost:8080 (admin/admin) |

### Parar os containers

```bash
docker compose down
# ou para remover volumes também:
docker compose down -v
```

### Usuário de teste

| Campo | Valor |
|---|---|
| Username | `player` |
| Password | `player123` |
| Realm | `crash-game` |
| Saldo inicial | 1000.00 créditos fictícios |

---

## Arquitetura

```
Frontend (Next.js :3000)
      │  HTTP REST          │  WebSocket
      ▼                     ▼
  Kong (:8000)           Game Service (:4001)
  /games/* ──────────►  NestJS + Prisma
  /wallets/* ─────────►  Wallet Service (:4002)
                              │ RabbitMQ
                         ┌────▼────┐
                         │ Wallet  │
                         │ Service │
                         └─────────┘

     ┌─────────────┐  ┌──────────┐  ┌───────────┐
     │  PostgreSQL  │  │ RabbitMQ │  │ Keycloak  │
     │  games DB    │  │          │  │ OIDC/JWT  │
     │  wallets DB  │  │          │  │           │
     └─────────────┘  └──────────┘  └───────────┘
```

---

## Serviços

### Game Service (porta 4001)

Responsabilidades:
- Ciclo de vida da rodada (BETTING_OPEN → RUNNING → CRASHED → SETTLED)
- Aceitar/rejeitar apostas conforme fase
- Calcular multiplicador (curva exponencial e^0.06t)
- Permitir cashout durante rodada ativa
- Publicar comandos de débito/crédito para Wallet via RabbitMQ
- Emitir eventos WebSocket para sincronização em tempo real
- Expor endpoint de verificação determinística (Provably Fair)

### Wallet Service (porta 4002)

Responsabilidades:
- Criar carteira por jogador (saldo inicial: 1000.00 créditos fictícios)
- Consultar saldo
- Processar débitos e créditos via mensageria (nunca REST direto)
- Manter ledger de transações
- Impedir saldo negativo
- Garantir idempotência (unique constraint em `idempotency_key`)

---

## Modelo de domínio

### Game Service

**`Round` (agregado raiz)**

Máquina de estados explícita: `BETTING_OPEN → RUNNING → CRASHED → SETTLED`

- Aceita apostas apenas em `BETTING_OPEN`; rejeita qualquer segunda aposta do mesmo jogador na mesma rodada
- `crashPoint` é calculado deterministicamente antes da rodada iniciar (Provably Fair), mas não revelado até o crash
- `bettingClosesAt` define o deadline da fase de apostas; o scheduler encerra automaticamente ao expirar

**`Bet` (entidade)**

Ciclo de vida próprio: `PENDING_DEBIT → PENDING → CASHED_OUT | LOST | REJECTED`

- `PENDING_DEBIT`: aguardando confirmação de débito do Wallet Service
- `PENDING`: aposta ativa, pode receber cashout
- `CASHED_OUT`: cashout realizado com sucesso (não pode repetir)
- `LOST`: rodada terminou sem cashout
- `REJECTED`: débito falhou (saldo insuficiente ou erro)

**Value Objects:** `Money` (bigint centavos), `Multiplier` (bigint scaled 100×), `RoundId`, `BetId`, `PlayerId`

### Wallet Service

**`Wallet` (agregado raiz)**

- Criada na primeira requisição autenticada com saldo de 1000.00
- Débitos são atômicos e validam disponibilidade antes de alterar saldo
- Cada operação gera uma `WalletTransaction` imutável (ledger)

**`WalletTransaction` (entidade)**

- `idempotency_key` único: `{operationType}:{roundId}:{betId}:{playerId}`
- Unique constraint no banco garante que reprocessamentos de mensagens RabbitMQ não duplicam saldo

---

## Fluxo principal

1. Usuário autentica via Keycloak (OIDC authorization code + PKCE)
2. Frontend consulta rodada atual e saldo da carteira
3. Fase de apostas abre (BETTING_OPEN, 10s por padrão)
4. WebSocket emite `round:betting-opened` → frontend mostra timer e hash da seed
5. Usuário aposta via `POST /games/bet`
6. Game Service publica `wallet.debit.requested` no RabbitMQ
7. Wallet Service debita saldo e publica `wallet.debit.succeeded`
8. Game Service confirma aposta (PENDING) e emite `bet:placed`
9. Rodada inicia (RUNNING) — Game Service emite `round:started`
10. Frontend calcula multiplicador localmente com base em `startedAt` + curva exponencial
11. Game Service emite snapshots via `round:snapshot` para correção
12. Usuário faz cashout via `POST /games/bet/cashout`
13. Game Service calcula payout, publica `wallet.credit.requested`
14. Wallet Service credita e publica `wallet.credit.succeeded`
15. Game Service emite `bet:cashed-out`
16. Quando multiplier >= crashPoint, Game Service finaliza rodada e emite `round:crashed`
17. Apostas pendentes viram LOST, nova fase começa após 3s

---

## Comunicação assíncrona

Todos os eventos trafegam via RabbitMQ com `persistent: true`.

| Evento | Direção | Roteamento |
|---|---|---|
| `wallet.debit.requested` | Game → Wallet | exchange `wallet.commands` |
| `wallet.credit.requested` | Game → Wallet | exchange `wallet.commands` |
| `wallet.debit.result.games` | Wallet → Game | exchange `wallet.events` |
| `wallet.credit.result.games` | Wallet → Game | exchange `wallet.events` |

**Idempotência:** cada evento monetário carrega um `idempotencyKey` derivado de `{operationType}:{roundId}:{betId}:{playerId}`. A tabela `wallet_transactions` tem `unique(idempotency_key)` — reprocessamentos não duplicam saldo.

**Consistência eventual:** a aposta fica em `PENDING_DEBIT` até receber confirmação do Wallet. Se o débito falhar, o bet fica `REJECTED`. O frontend mostra estado `Processing` enquanto aguarda.

---

## Dinheiro e precisão monetária

- Todos os valores são armazenados em **centavos como `bigint`** no domínio e `BIGINT` no banco
- R$1,00 = `100`, R$1.000,00 = `100000`
- Zero uso de `number`/`float` para valores monetários
- Payout = `floor(amountCents × multiplierScaled / 100)` — arredondamento para baixo, documentado
- UI apenas formata para exibição; backend é a fonte de verdade

---

## WebSocket

Conexão direta com o Game Service em `:4001` (não via Kong, pois Kong DB-less não roteia WebSocket nesta configuração).

WebSocket é **exclusivamente server → client**. Todas as ações do jogador (apostar, sacar) são REST.

Eventos emitidos:
- `round:betting-opened` — nova fase de apostas, inclui hash da seed
- `round:started` — rodada iniciou, inclui `startedAt` para cálculo local do multiplicador
- `round:snapshot` — snapshot periódico do multiplicador (correção de drift)
- `round:crashed` — rodada encerrada, revela `serverSeed` para verificação
- `bet:placed` / `bet:rejected` / `bet:cashed-out` — atualizações de apostas
- `wallet:updated` — saldo atualizado após liquidação

**Múltiplas abas:** cada aba abre sua própria conexão WS. Como todos os eventos são broadcast, todas as abas recebem o mesmo estado. O `round:snapshot` periódico serve como mecanismo de correção — uma aba que abriu no meio de uma rodada recebe o snapshot e sincroniza o multiplicador. O `round:started` carrega `startedAt` para que o cliente calcule o multiplicador localmente sem depender de ticks do servidor.

**Reconexão:** socket.io faz reconnect automático com backoff. Após reconectar, o cliente chama `GET /games/rounds/current` via REST para reconstruir o estado — o WebSocket complementa, não é a única fonte de verdade.

---

## Auth

- Keycloak 26.5, realm `crash-game`, client `crash-game-client` (public, PKCE S256)
- Frontend usa `react-oidc-context` para authorization code flow
- Backend valida JWTs via JWKS (`/realms/crash-game/protocol/openid-connect/certs`)
- `playerId` = `sub` do JWT
- Rotas públicas: `GET /rounds/current`, `GET /rounds/history`, `GET /rounds/:id/verify`

---

## Provably Fair

Cada rodada antes de iniciar:
1. Gera `serverSeed` aleatório (32 bytes hex)
2. Calcula `serverSeedHash = SHA256(serverSeed)` e revela ao cliente
3. `clientSeed = roundIndex.toString()`
4. `crashPoint = computeCrashPoint(serverSeed, clientSeed)` via HMAC-SHA256

Após o crash, o `serverSeed` é revelado. Qualquer jogador pode verificar:
```
GET /games/rounds/:roundId/verify
```

Fórmula:
```
HMAC = HMAC-SHA256(serverSeed, clientSeed)
h = parseInt(HMAC[0:8], 16)
if h < 2^32 * 0.04 → crashPoint = 1.00x (house edge)
else → crashPoint = floor(100 * 2^32 / (2^32 - h)) / 100
```

---

## Testes

```bash
# Unitários — domínio do Game Service
cd services/games && bun test tests/unit

# Unitários — domínio do Wallet Service
cd services/wallets && bun test tests/unit

# E2E — Game Service (requer docker:up)
cd services/games && bun test tests/e2e

# E2E — Wallet Service (requer docker:up)
cd services/wallets && bun test tests/e2e
```

Cobertura dos testes unitários:
- Round: transições de estado, invariantes, rejeição de aposta duplicada, crash, cashout
- Bet: valor mínimo/máximo, cálculo de payout, cashout único
- Wallet: crédito, débito, saldo insuficiente, idempotência, precisão monetária
- ProvablyFair: determinismo, hash chains, verificação

---

## Decisões e trade-offs

| Decisão | Escolha | Justificativa |
|---|---|---|
| Frontend | Next.js | SSR + app router, boa DX, suporte nativo a TypeScript strict |
| ORM | Prisma | Migrations automáticas, type-safety, suporte a `BigInt` nativo |
| Mensageria | RabbitMQ | Já configurado, simples, suficiente para 1 serviço consumidor |
| Dinheiro | `bigint` centavos | Zero risco de drift de ponto flutuante, testável com exatidão |
| WebSocket | Socket.io direto | Kong DB-less não roteia WS sem plugin; direto é mais simples para desafio |
| Multiplier | Timestamp-based | Evita tick de alta frequência; cliente calcula localmente com snapshots de correção |
| Scheduler | `setTimeout` single-instance | Simples para desafio local; em produção usaria lock distribuído (Redlock) |

---

## Limitações conhecidas

- **Scheduler single-instance:** não funciona com múltiplas réplicas do Game Service sem lock distribuído
- **WebSocket não via Kong:** Kong DB-less requer plugin ws-proxy para rotear WebSocket
- **Sem Outbox/Inbox:** em caso de crash do serviço entre publicar evento e commit no DB, pode haver inconsistência. Em produção: transactional outbox
- **Sem DLQ:** mensagens com erro são recolocadas na fila (nack + requeue). Em produção: Dead Letter Queue
- **Frontend sem SSR para dados de jogo:** toda a sincronização é client-side via WebSocket, o que é adequado para um jogo real-time
- **Créditos fictícios:** saldo inicial hardcoded em 1000.00 — sem integração com gateway de pagamento real

---

## Bônus implementados

| Bônus | Descrição |
|---|---|
| **Auto cashout configurável** | Campo "Auto cashout at" nos controles de aposta — o frontend monitora o multiplicador e dispara o cashout automaticamente quando o target é alcançado. Presets rápidos (1.5x, 2x, 3x, 5x) + input livre |
| **Histórico de bets com P&L** | Aba "My Bets" com todas as apostas do jogador, mostrando multiplier do cashout, payout e lucro/prejuízo por rodada |
| **Provably Fair in-browser** | Aba "Provably Fair" com verificador em JavaScript puro usando Web Crypto API — o jogador cola serverSeed + clientSeed e o browser recalcula o crash point sem precisar confiar no servidor |
| **Rate Limiting via Kong** | Plugin `rate-limiting` nativo do Kong adicionado em ambos os serviços: 120 req/min no games, 60 req/min no wallets. `policy: local` para in-memory sem dependência de Redis. Headers de rate limit incluídos nas respostas (`X-RateLimit-*`) |
| **Storybook** | Stories para 6 componentes: `CrashChart`, `BetControls`, `BetsList`, `BetHistory`, `RoundHistory`, `AutoCashout`. Framework `@storybook/react-vite`. Mocks de Zustand, react-oidc-context e TanStack Query por história. Rodar com `npm run storybook` no diretório `frontend/` |

---

## Checklist de avaliação

### Critérios eliminatórios

| Critério | Status |
|---|---|
| `bun run docker:up` sobe tudo sem passos manuais | ✅ 7 containers healthy |
| Gameplay funciona end-to-end | ✅ aposta → multiplicador → cashout/crash → liquidação |
| Dois serviços separados comunicando via RabbitMQ | ✅ exchanges `wallet.commands` + `wallet.events` |
| Sincronização em tempo real | ✅ WebSocket com 7 eventos distintos |
| Precisão monetária — sem float | ✅ `bigint` centavos em todo o domínio + `BIGINT` no banco |
| Backend valida JWT | ✅ Keycloak JWKS, rotas protegidas rejeitam requests sem token |
| Testes existem | ✅ unitários + E2E em ambos os serviços |

### Requisitos de API

| Endpoint | Auth | Status |
|---|---|---|
| `POST /wallets` | Sim | ✅ |
| `GET /wallets/me` | Sim | ✅ |
| `GET /games/rounds/current` | Não | ✅ |
| `GET /games/rounds/history` | Não | ✅ |
| `GET /games/rounds/:roundId/verify` | Não | ✅ |
| `GET /games/bets/me` | Sim | ✅ |
| `POST /games/bet` | Sim | ✅ |
| `POST /games/bet/cashout` | Sim | ✅ |

### Eventos WebSocket

| Evento | Status |
|---|---|
| `round:betting-opened` | ✅ |
| `round:started` | ✅ |
| `round:snapshot` | ✅ |
| `round:crashed` | ✅ |
| `bet:placed` / `bet:rejected` / `bet:cashed-out` | ✅ |
| `wallet:updated` | ✅ |
