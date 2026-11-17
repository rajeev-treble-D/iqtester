# IQ Test

A web-based reasoning test: the visitor answers a set of pattern, number, shape and
logic questions and receives an estimated IQ score with a per-skill breakdown.

MERN stack in plain JavaScript. The client and the server are two independent
projects, each with its own `package.json`, dependencies and commands:

| Part | Tech | Path |
| --- | --- | --- |
| Web client | React 19 (JSX), Vite, React Router | `client` |
| API | Node, Express 5, Mongoose | `server` |
| Database | MongoDB 7 | local install, Atlas, or `docker-compose.yml` |

## Run it locally

Needs Node 20.12+ and a MongoDB to point at. By default the server uses
`mongodb://127.0.0.1:27017/iqtest`; to use another one, copy
`server/.env.example` to `server/.env` and set `MONGODB_URI`.

Server, in one terminal:

```bash
cd server
npm install
npm run seed     # load the question bank, build indexes
npm run dev      # API on :4000, restarts when a file changes
```

Client, in a second terminal:

```bash
cd client
npm install
npm run dev      # web on :5173, forwards /api to the server on :4000
```

Open http://localhost:5173.

| Run in | Command | What it does |
| --- | --- | --- |
| `server` | `npm run dev` | API, restarting when a file changes |
| `server` | `npm start` | API without the watcher; also serves `client/dist` when it exists |
| `server` | `npm run seed` | Upsert the authored questions; safe to re-run |
| `server` | `npm test` | Unit tests + API tests against a throwaway database (`iqtest_test`) |
| `client` | `npm run dev` | Web client with hot reload |
| `client` | `npm run build` | Production build into `client/dist` |

## How a test works

1. `POST /api/v1/attempts` picks the questions for this attempt, shuffles each
   question's options, and returns the first question plus a secret token.
2. The browser shows one question at a time. Each answer goes to
   `POST /api/v1/attempts/:id/answers`, which stores it and returns the next question.
3. After the last answer the server scores the attempt.
   `GET /api/v1/attempts/:id/result` returns the IQ estimate and breakdown.

`GET /api/v1/attempts/:id` returns the current state, which is how a refresh or a
reopened tab resumes the same test. `GET /api/v1/test` gives the question count
for the landing page. `GET /healthz` and `/readyz` are for the load balancer.

The request and response shapes, and the format of a question, are defined in
`server/src/schemas`. The client keeps no copy of them apart from the list of
categories in `client/src/lib/brand.js`.

## Questions

Five categories, five difficulty levels:

| Category | What the visitor sees |
| --- | --- |
| `pattern` | A continuous pattern with a piece cut out; pick the piece that fits |
| `matrix` | A 2x2 or 3x3 grid of figures with one missing |
| `series` | A number sequence with a gap |
| `spatial` | Shapes to turn or compare in your head |
| `logic` | Short verbal reasoning: analogies, ordering, syllogisms |

**The blueprint** (`server/src/config/blueprint.js`) defines one test: 40
slots, each a category + difficulty, easiest first. Every attempt fills each slot
with a random active question of that kind, so with several questions per slot no
two tests are alike. Slots the bank can't fill yet are skipped - the 17 starter
questions therefore give a 17-question test.

**Visual questions are data, not image files.** A figure is a small JSON
description (circles, polygons, lines...) that the client renders as SVG. Figures
are crisp at any size, follow light/dark theme, weigh a few hundred bytes, and can
be generated in code.

**Adding questions:** write them in `server/src/seed/questions.js` using the
helpers in `seed/shapes.js` (the first option listed is the correct one), then
`npm run seed`. Every question is validated against the schema in
`server/src/schemas/question.js`, and `npm test` checks the whole bank. Each
question must have exactly one defensible answer - if a second reading of the
rule leads to a different option, fix it.

## Scoring

`server/src/services/scoring.js` uses item response theory (3-parameter
logistic model). Each question has a difficulty, a discrimination and a guessing
chance; the pattern of right and wrong answers gives an ability estimate, which
maps to the IQ scale (mean 100, SD 15, reported between 55 and 145). Harder
questions count for more, and scores stay comparable when people get different
questions.

The item parameters are currently derived from the authored difficulty level.
They have not been calibrated on real test takers, so the score is an estimate.
Each question keeps `stats.shown` / `stats.correct` counters so difficulty can be
re-estimated from real answers once there is enough data.

## Security

- **Answers never leave the server.** The browser receives only what to draw.
  Questions carry no ids or keys, and options are answered by position in a
  per-attempt shuffled order, so an answer key can't be scraped or shared.
- **Scoring and timing are server-side.** The client can't submit a score, skip
  ahead, answer twice, or change an answer; each answer is one atomic
  compare-and-set in MongoDB.
- **Attempt tokens:** 256-bit random, sent as a bearer header, stored only as a
  SHA-256 hash, redacted from logs. Unknown id and wrong token both return 404.
- **Input:** every request body is validated with a strict zod schema; Mongoose
  `sanitizeFilter` blocks operator injection; JSON bodies are capped at 10 kB.
- **HTTP:** helmet headers, CORS allow-list (`CORS_ORIGINS`), `Cache-Control:
  no-store`, rate limits on the API and a tighter one on starting tests.
- **Rendering:** figure data is mapped to SVG attributes by React; no HTML or
  SVG markup from the database is ever injected into the page.
- **Data:** no personal data is collected. Unfinished attempts delete themselves
  after `ATTEMPT_PURGE_DAYS` (TTL index).

## Scaling

The API holds no session state - everything about an attempt is in MongoDB - so
instances can be added behind a load balancer freely. Each instance caches the
question bank in memory (60 s), leaving one small indexed read or write per
request. The server shuts down gracefully for rolling deploys. The client is a
static bundle that can be served from a CDN.

Before running more than one API instance, move the rate-limit counters to a
shared store (see the note in `server/src/middleware/security.js`) and set
`TRUST_PROXY` to the number of proxies in front of the API.

## Deploying

### As one service

When a client build exists (`client/dist`), the API process serves it as well,
so the whole app runs as a single Node service on one origin. There is no CORS
or `VITE_API_URL` to configure.

| Setting | Value |
| --- | --- |
| Build command | `cd client && npm ci && npm run build && cd ../server && npm ci && npm run seed` |
| Start command | `cd server && npm start` |
| Health check path | `/healthz` |
| Environment | `MONGODB_URI`, `TRUST_PROXY`, `NODE_ENV=production` at runtime |

`npm run seed` in the build step loads the questions and builds the indexes,
which the server does not do on boot in production. It needs `MONGODB_URI`
during the build. Don't set `NODE_ENV=production` for the build itself, or npm
skips the build tools.

### As separate API and client

- API: deploy the `server` folder (`npm ci`, `npm run seed`, `npm start`), or
  build it as a container with `docker build -t iq-api server` (the image holds
  the API only). Set `MONGODB_URI`, `CORS_ORIGINS`, `TRUST_PROXY`.
- Client: in `client`, run `npm ci && npm run build` and serve `client/dist` as
  static files with a fallback to `index.html`. Either proxy `/api` to the API
  on the same origin, or build with `VITE_API_URL` pointing at it. Serve it over
  HTTPS with a Content-Security-Policy header.
