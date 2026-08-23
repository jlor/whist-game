# Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One shared type layer between client and server for the contract ladder and the whole wire protocol. |
| Server | Node.js + [Fastify](https://fastify.dev/) | Serves the built client as static files and the REST/auth API on the same port as the WebSocket. |
| Realtime | [Socket.IO](https://socket.io/) | Its rooms map directly onto "table"; built-in reconnect/ack handling matters for players on phones or flaky wifi resyncing mid-hand. |
| Database | SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/) | Zero external dependency, fine for a card club's data volume, trivial to run in one container. |
| Auth | Username/password, `bcrypt` hashing, JWT in an httpOnly cookie | App-native, no SSO. The cookie is sent automatically on both REST requests and the Socket.IO WebSocket upgrade, so the socket layer authenticates from the same cookie without the client ever handling the token directly. |
| Frontend | React + Vite | A 4-seat card UI doesn't need much more. |
| Frontend state | One React Context + reducer per table, driven directly by inbound socket events | The server is authoritative; the client mostly renders whatever it's just been told. No Redux/Zustand. |
| Tests | Vitest | Unit/integration coverage for the rules engine — see [Testing](#testing) below. |
| Monorepo | pnpm workspaces | `shared` / `server` / `client` packages, see [Repo layout](#repo-layout). |

## Repo layout

```
packages/
  shared/src/
    cards.ts             deck model: suits, ranks, jokers, encode/decode, shuffle
    contracts.config.ts  the 16-tier ladder + 4 sub-methods, AS DATA (see below)
    protocol.ts           zod schemas for the socket/REST wire format
  server/src/
    game/                the rules engine — see below
    db/                  Drizzle schema + hand-rolled idempotent migrations
    auth/                password hashing, JWT issuing/verifying, REST routes
    realtime/             Socket.IO wiring: socketServer.ts (auth + event routing),
                          tableRoom.ts (TableRuntime — one table's live state machine)
    lobby/               in-memory registry of live TableRuntimes, backed by the DB
    persistence/         repositories (users/tables/hands) + REST history routes
  client/src/
    state/               AuthContext, GameStateProvider (socket → reducer), gameReducer
    components/Table/    bidding, declaration, trump/kitty, trick, scoreboard UI
    components/History/  session/hand history browser
    pages/                LobbyPage, TablePage, HistoryPage
```

## The rules engine is data-driven

The single biggest design decision: `CONTRACT_LADDER` and `SUB_METHODS` in
`packages/shared/src/contracts.config.ts` are **data**, not branching
logic. Every contract's point value, win condition, trump mode, kitty
performer, and hand-exposure level is a field on an object; the engine
(`packages/server/src/game/handStateMachine.ts` and friends) dispatches
generically off those fields —

```ts
if (contract.trumpMode === "submethod_only") { ... }
```

— instead of a thirteen-way (now sixteen-way) `switch` on contract codes.
The rules for this game came from a card club's memory rather than a
rulebook, and several details turned out to be wrong or incomplete on
first pass (a sub-method's display name, an assumed fixed trump suit, the
whole bidding-ladder shape below `9+`). Every one of those corrections
turned out to be a data edit in `contracts.config.ts`, not a rewrite of
`handStateMachine.ts` — which is the point of the design, not a
coincidence.

Two assumptions that *aren't* fully confirmed are flagged directly in that
file's comments (Halv bordlægger/Bordlægger's win condition, and Halv's
solo-fallback behavior) so they stay easy to fix the same way if they turn
out to be wrong too.

### The rules engine modules

Each phase of a hand is its own small, independently-testable module under
`packages/server/src/game/`:

- **`deck.ts`** — deals the 55-card deck: 13 to each seat, 3 to the kitty.
- **`bidding.ts`** — the auction: ladder-rank comparison, the sub-method
  reuse-tracking rule, and permanent-passing turn rotation. Pure functions
  over a `BiddingState` value, no I/O.
- **`partnerCard.ts`** — resolves the named card against the as-dealt
  hands (partner found / self-held / kitty-stranded), and computes the
  Ace→King→Queen→Jack cascade eligibility.
- **`trumpSelection.ts`** — the sub-method-specific trump resolution
  (fixed suit, partner's free choice, or the sequential kitty reveal for
  Tip).
- **`kittyExchange.ts`** — the all-or-none 3-for-3 swap, used by every
  contract.
- **`trickEngine.ts`** — legal-play computation (follow-suit + the joker
  exemption) and trick-winner determination (trump > joker > plain, with
  jokers equal-rank so the first one played stands).
- **`scoring.ts`** — the zero-sum payout calculation for both partnered
  and solo outcomes.
- **`handStateMachine.ts`** — the orchestrator: a `HandStateMachine` class
  that walks one hand through `bidding → declaration → trump_resolution →
  kitty_exchange → play → complete`, calling into the modules above and
  holding the single source of truth for that hand's state.
- **`sessionManager.ts`** — dealer rotation across hands within a session,
  and detecting when a session completes (dealer cycles back to its
  starting seat).

None of these modules know anything about Socket.IO, Fastify, or the
database — they're driven entirely by direct method calls, which is what
makes them the fast, in-process part of the Vitest suite (see
[Testing](#testing)).

## Realtime layer

`TableRuntime` (`realtime/tableRoom.ts`) is the live, in-memory owner of
one table: its seats, its current `HandStateMachine`, and its
`SessionManager`. `socketServer.ts` is thin by comparison — it
authenticates each socket from the JWT cookie, and routes each inbound
event to a `TableRuntime` method, catching `IllegalActionError` /
`IllegalBidError` and turning them into an `error` event back to that one
socket.

A few things worth knowing if you're extending the protocol:

- **The server is authoritative.** The client never computes legal moves,
  trick winners, or scores itself — it only renders what it's told. Legal
  moves sent to the client are advisory UI hints, re-validated server-side
  regardless.
- **Privacy is enforced by *which* events fire, not by client-side
  filtering.** A player's hand, the kitty's contents, and a secret
  partner's identity are only ever sent via a private `io.to(socketId)`
  emit to the specific seat that's allowed to see them — never broadcast
  and filtered client-side. The kitty in particular is never sent to
  anyone before it's actually exchanged; the exchange-decision prompt only
  ever announces *who* must decide, never the cards.
- **Every phase transition needs a public broadcast, not just a private
  one to whoever's acting.** This was the source of a real bug during
  development: a private "your turn" event to the declarer alone meant
  every other player's client never left its previous phase, so the Tip
  reveal — despite being broadcast publicly — was never rendered because
  their UI's phase gate never opened. The fix pattern (`trump:awaiting`,
  `kitty:awaiting`, `play:turnChanged`) is: broadcast the phase-relevant
  public fact to everyone, then privately tell whoever's turn it is what
  their options are.
- **Reconnects get replayed private state.** `TableRuntime.attachSocket`
  re-sends a reconnecting player's current hand and any turn prompt
  currently waiting on them — a hand's private events otherwise only ever
  fire once, at the moment they happen.

## Data model

Drizzle schema in `db/schema.ts`; migrations are hand-written idempotent
`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF MISSING` SQL
in `db/migrate.ts` rather than a generated migration pipeline — simpler
for a single-container hobby app, at the cost of needing a manual
`addColumnIfMissing` call for each schema change instead of an
auto-generated migration file.

Key tables: `users`, `tables` / `table_seats`, `sessions` (one row per
session, i.e. one full dealer rotation), `hands` (one row per hand,
including redeals via `redealt_from_hand_id`), `bids` (full auction log,
including sub-method), `hand_contracts` (the resolved contract, trump,
partner, and a **snapshotted** point value/multiplier so history stays
accurate even if `contracts.config.ts` changes later), `kitty_exchanges` /
`kitty_reveals`, `tricks` / `plays`, and `score_ledger` (per-player,
per-hand point deltas — always summing to zero within a hand).

## Testing

The rules engine (`packages/server/src/game/`) has the project's real test
investment — 59 Vitest cases covering the contract ladder's shape, the
bidding auction's turn/pass/reuse rules, trick-winner edge cases
(joker-vs-trump, joker-vs-joker), the partner-card cascade, zero-sum
scoring for both outcomes, and a few full-hand integration tests that
drive a `HandStateMachine` through every phase on a deterministic deal.
Run them with `pnpm --filter @whist/server test`.

The realtime layer (`tableRoom.ts` / `socketServer.ts`) and the React
client don't have automated tests — they were instead verified with
scripted multi-client Socket.IO sessions against a real running server
during development (registering real users, playing full hands and
sessions end-to-end, and specifically checking that private events don't
leak to the wrong socket). That's a reasonable manual/scripted substitute
for a hobby project at this scale, but there's no regression safety net
for the realtime wiring the way there is for the rules engine — something
to know if you're refactoring `tableRoom.ts`.

## Deployment

Ships as a single Docker image (multi-stage `Dockerfile` at the repo
root): builds all three packages, then a runtime image running
`node packages/server/dist/index.js`, serving the built client as static
files and the API/WebSocket on one `PORT`. Configured entirely by three
env vars: `PORT`, `DB_PATH` (expects a mounted volume), `JWT_SECRET`. See
`.env.example`.

This was deliberately built deployment-agnostic — no Kubernetes manifests,
no reverse-proxy assumptions baked in. It currently runs as a plain
`docker run` on a home server's LAN; moving it into a proper
orchestrated deployment is future work, not something this repo commits
to one way.
