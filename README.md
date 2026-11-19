# IQ Test

A set of web quizzes about how someone thinks, remembers and decides. One
General quiz covers everything in a single sitting; ten shorter quizzes go
deeper into one area each. No sign-up.

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

**`querySrv ECONNREFUSED` when connecting to Atlas?** A `mongodb+srv://` address
needs a DNS lookup that Node does with its own resolver, and on some machines
that resolver finds no DNS server. Set `DNS_SERVERS` in `server/.env` to the
DNS server your network uses, usually the router (for example
`DNS_SERVERS=192.168.1.1`); several can be listed, separated by commas.

| Run in | Command | What it does |
| --- | --- | --- |
| `server` | `npm run dev` | API, restarting when a file changes |
| `server` | `npm start` | API without the watcher; also serves `client/dist` when it exists |
| `server` | `npm run seed` | Upsert the authored questions and build indexes; safe to re-run, and needed after new questions are added |
| `server` | `npm test` | Unit tests + API tests against a throwaway database (`iqtest_test`) |
| `client` | `npm run dev` | Web client with hot reload |
| `client` | `npm run build` | Production build into `client/dist` |

## The quizzes

| Group | Quiz | Questions | Result |
| --- | --- | --- | --- |
| General | General quiz | 47, a mix of everything below | IQ estimate, profile, what to take next |
| Thinking skills | Logic & Reasoning | patterns, number series, shapes, deduction | score + percentile |
| | Memory & Focus | words and number sequences to recall | score + percentile |
| | Strategic Thinking | scenarios with one best plan | score + percentile |
| | Root Cause Analysis | scenarios: symptom, cause, fix | score + percentile |
| Your style | Decision-Making Style | "what would you do" | bold/careful, quick/deliberate, head/heart |
| | Problem-Solving Style | "what would you do" | experimenter, researcher, collaborator, planner |
| Student mindset | Confidence & Self-Belief | agree / disagree | level, what is behind it, tips |
| | Procrastination & Discipline | agree / disagree | level, what is behind it, tips |
| | Academic Stress | agree / disagree | level, what is behind it, tips |
| | Career Confusion | agree / disagree | level, what is behind it, tips |

A quiz is a recipe in `server/src/config/quizzes.js`: how many questions of
each kind, which memory tasks, and where the in-between screens go.
`server/src/services/layout.js` turns a recipe into the steps of one attempt,
mixed so that no two attempts have the same order.

**Kinds of step**

| Step | What the visitor sees | Where it comes from |
| --- | --- | --- |
| `question` | A right/wrong question | The question bank (MongoDB) |
| `statement` | Agree/disagree, or "what would you do" | `server/src/content/statements.js` |
| `memorize` | A word, or digits shown for a few seconds | Generated per attempt (`services/memory.js`) |
| `recall` | A right/wrong question about what was memorized | Generated with its `memorize` step |
| `info` | Pace so far, profile so far, or questions left | Worked out from the attempt when it is shown |

**Difficulty.** Quizzes with right/wrong steps open with three or four
self-rating statements; the answers set the starting level (1-5). From then on
two correct answers in a row raise the level and one wrong answer lowers it
(`services/difficulty.js`). Each question is picked when it is shown, as close
to the current level as the bank allows. After the General quiz, the other
thinking-skill quizzes start at the level reached there and skip the self-rating.

**Memory.** A word is shown once and asked about many questions later, among
look-alike words. A number sequence is on screen for 5-7 seconds; the question
is about one position, the whole sequence, or the sequence reversed, depending
on the level. Some sequences are asked about only after one or two other
questions. The time on screen is counted on the server, so reloading the page
does not give a second look.

**In-between screens.** The pace screen compares the time taken to reach it
with everyone else who took the same quiz, and shows a percentage only once
`PACE_MIN_SAMPLE` people (default 30) have reached it; before that it shows a
neutral message. Nothing on these screens is a fixed number.

## How an attempt works

1. `POST /api/v1/attempts` with `{ "quizId": "general" }` lays out the steps
   and returns the first one plus a secret token.
2. The browser shows one step at a time. Each answer goes to
   `POST /api/v1/attempts/:id/answers` as `{ index, choice }` (`choice` is left
   out on memorize and in-between screens). The server stores it, gets the next
   step ready and returns it.
3. After the last step the server builds the result.
   `GET /api/v1/attempts/:id/result` returns it.

`GET /api/v1/attempts/:id` returns the current state, which is how a refresh or a
reopened tab resumes the same quiz. `GET /api/v1/quizzes` lists the quizzes with
their length for the home page. `GET /healthz` and `/readyz` are for the load
balancer.

The request and response shapes, and the format of a question, are defined in
`server/src/schemas`. The client keeps no copy of them apart from the names of
the skills in `client/src/lib/brand.js`.

## Questions

Seven categories, five difficulty levels:

| Category | What the visitor sees |
| --- | --- |
| `pattern` | A continuous pattern with a piece cut out; pick the piece that fits |
| `matrix` | A 2x2 or 3x3 grid of figures with one missing |
| `series` | A number sequence with a gap |
| `spatial` | Shapes to turn or compare in your head |
| `logic` | Short verbal reasoning: analogies, odd one out, ordering, deduction |
| `strategy` | A situation and four plans, one of them clearly strongest |
| `rootcause` | A situation and four explanations or fixes, one of them right |

The starter bank has 65 questions: about three per level for `series`, `logic`,
`strategy` and `rootcause`, but only eight visual questions in total
(`pattern`, `matrix`, `spatial`). Until more are written, everyone sees the
same visual questions, and the same question can turn up in two different
quizzes. A quiz that asks for more questions of a category than the bank has
is simply shorter; `npm run seed` reports when that happens.

**Visual questions are data, not image files.** A figure is a small JSON
description (circles, polygons, lines...) that the client renders as SVG. Figures
are crisp at any size, follow light/dark theme, weigh a few hundred bytes, and can
be generated in code.

**Adding questions:** write them in `server/src/seed/questions.js` (or
`seed/scenarios.js` for strategy and root cause) using the helpers there - the
first option listed is the correct one - then `npm run seed`. Every question is
validated against the schema in `server/src/schemas/question.js`, and
`npm test` checks the whole bank. Each question must have exactly one
defensible answer - if a second reading leads to a different option, fix it.

**Adding statements:** add them to `server/src/content/statements.js`. They are
read from the code, so no seeding is needed. Never rename a key: attempts
store them.

## Results

Right/wrong steps are scored in `server/src/services/scoring.js` with item
response theory (3-parameter logistic model). Each question has a difficulty, a
discrimination and a guessing chance; the pattern of right and wrong answers
gives an ability estimate, which maps to the IQ scale (mean 100, SD 15,
reported between 55 and 145). Harder questions count for more, which is what
keeps scores comparable when the quiz adapts to each person. Memory questions
are scored the same way, with parameters set from their level.

The item parameters are currently derived from the authored difficulty level.
They have not been calibrated on real test takers, so the score is an estimate.
Each question keeps `stats.shown` / `stats.correct` counters so difficulty can be
re-estimated from real answers once there is enough data.

Style and mindset quizzes have no right answers
(`server/src/services/results.js`). A style result counts which option of each
dimension was picked most. A mindset result averages the agree/disagree
answers into a 0-100 level, overall and per facet; some statements are worded
the other way round and are reversed before averaging. These results are for
self-reflection and say so; a high Academic Stress result adds a line pointing
to a counsellor, teacher or trusted person.

## Security

- **Answers never leave the server.** The browser receives only what to draw.
  Steps carry no ids or keys, and options are answered by position in a
  per-attempt shuffled order, so an answer key can't be scraped or shared.
  Memory tasks are generated per attempt, so there is nothing to share at all.
- **Scoring and timing are server-side.** The client can't submit a score, skip
  ahead, answer twice, or change an answer; each answer is one atomic
  compare-and-set in MongoDB. How long a number sequence stays visible is
  counted from when the server first sent it.
- **Attempt tokens:** 256-bit random, sent as a bearer header, stored only as a
  SHA-256 hash, redacted from logs. Unknown id and wrong token both return 404.
- **Input:** every request body is validated with a strict zod schema; Mongoose
  `sanitizeFilter` blocks operator injection; JSON bodies are capped at 10 kB.
- **HTTP:** helmet headers, CORS allow-list (`CORS_ORIGINS`), `Cache-Control:
  no-store`, rate limits on the API and a tighter one on starting quizzes
  (`ATTEMPT_CREATE_LIMIT_PER_HOUR`, per IP - raise it if many people share one).
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
