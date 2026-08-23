# Whist (Danish house rules)

An online, real-time multiplayer version of the trick-taking card game a
particular Danish card club plays — a 55-card-deck relative of
Whist/Bridge, with its own bidding ladder, a rotating (not fixed)
partnership found through a named card each hand, and zero-sum scoring.
Built so the club can play together over the browser, including remote
members.

**Full rules:** [`docs/RULES.md`](docs/RULES.md)
**Architecture and design decisions:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Quick start

Requires Node.js 20+ and [pnpm](https://pnpm.io/).

```sh
pnpm install
cp .env.example .env   # set a real JWT_SECRET
pnpm --filter @whist/shared build
pnpm migrate            # creates the SQLite DB
pnpm seed                # optional: 4 test accounts (alice/bob/carol/dave, password123)
pnpm dev                 # starts the server with hot reload on :3000
```

In another terminal, for the client dev server with hot reload (proxies
`/api` and `/socket.io` to `:3000`):

```sh
pnpm --filter @whist/client dev
```

Or build everything and run it as the server would in production:

```sh
pnpm build
pnpm --filter @whist/server start
```

### Running the test suite

```sh
pnpm test
```

Runs the rules-engine test suite (`packages/server/test/`) — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#testing) for what is and
isn't covered by automated tests.

## Running with Docker

```sh
docker build -t whist-game .
docker run -d --name whist-game \
  --restart unless-stopped \
  -p 3210:3000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -v whist-game-data:/data \
  whist-game
```

The app is then at `http://<host>:3210`. `DB_PATH` defaults to
`/data/whist.db` inside the container, so the named volume is where
accounts and hand history persist across restarts/rebuilds.

## Project layout

```
packages/
  shared/   contract ladder + card model + wire protocol (used by both server and client)
  server/   Fastify + Socket.IO + SQLite — the rules engine and realtime layer
  client/   React + Vite frontend
docs/
  RULES.md         the game's rules, in plain English
  ARCHITECTURE.md  stack, repo layout, and the design decisions behind them
```
