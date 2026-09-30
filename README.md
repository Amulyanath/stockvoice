# StockVoice

StockVoice is a voice-assisted inventory management MVP for keeping a small store's stock up to date without navigating forms for every change. Users can speak or type common inventory commands, review proposed changes, and confirm them before stock is updated. The app combines deterministic inventory rules with optional Gemini transcription and command extraction.

## Features

- Account signup, login, and logout with per-user inventory.
- Product creation, editing, and deletion through a review-and-confirm flow.
- Stock additions and removals with confirmation, quantity checks, and stale-preview protection.
- Text command entry and optional browser microphone recording.
- Optional Gemini transcription and structured command extraction.
- Inventory search, low-stock status, estimated value at current unit prices, and recent activity.
- Optional English or Telugu browser speech replies, depending on installed browser voices.
- A local in-memory demo mode that does not require MongoDB or Gemini credentials.
- Common English, Telugu, and Telugu-English mixed inventory commands, with a limited deterministic parser in demo mode.

## Technology

- React 19, Vite 7, Tailwind CSS 4
- Express 5 on Node.js 22.12 or newer
- MongoDB Node.js driver, with MongoDB transactions in live mode
- Zod validation, bcryptjs password hashing, and JSON Web Tokens
- Google GenAI SDK for optional audio transcription; Gemini API for command extraction
- Node.js built-in test runner and Supertest

## Architecture

The React app communicates with the Express API through Vite's `/api` development proxy. The Express routes validate requests and require authentication for inventory operations. Inventory mutations first create a server-held pending confirmation; a later confirmation applies the change and writes its activity record. In live mode, MongoDB transactions commit these records together. In demo mode, the same API uses an in-memory store that resets when the server restarts.

For spoken input, the browser records audio and sends it to the server. When configured, the server asks Gemini to transcribe it. The resulting text is reviewed as a command. Demo mode uses a narrow deterministic parser for supported English, Telugu, and mixed-language patterns. In live mode, recognized Telugu-script patterns use that parser; other commands use Gemini structured output. Server rules validate product, unit, quantity, and stock limits before a change can be previewed or confirmed.

## Project structure

```text
src/
  auth.jsx                 Signup/login UI
  main.jsx                 Inventory dashboard and interaction flows
  speech.js                Browser speech replies and language preference
  style.css                Application styles
server/
  app.js                   Express routes and confirmation flow
  auth.js                  Authentication and session handling
  rules.js                 Schemas and inventory command rules
  store.js                 In-memory and MongoDB storage adapters
  index.js                 Configuration and server startup
  services/
    intent.js              Demo parser and Gemini command extraction
    retry.js               Provider retry policy
    stt.js                 Gemini audio transcription
  tests/                   Automated tests with in-memory storage/mocked providers
  check-gemini.js          Optional Gemini model-list diagnostic
  check-gemini-request.js  Optional synthetic command request diagnostic
  assign-legacy.js         Explicit MongoDB legacy-record ownership utility
```

## Setup

Install Node.js 22.12 or newer, then run these commands from the directory containing `package.json`:

```sh
npm install
```

Create a local environment file from the safe example. Do not overwrite an existing `.env` containing local settings; review it and set `DEMO_MODE=true` for the no-database demo.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```sh
cp .env.example .env
```

The example enables demo mode and contains no external service credentials. Replace the example JWT secret with a random local value of at least 32 characters before using the app. Demo inventory is in memory and is cleared when the backend restarts. The demo parser supports common patterns such as:

```text
add 5 kg Rice
remove 2 kg Rice
add 5 kg Rice at 65
check Rice
low stock
5 kg బియ్యం ప్యాకెట్లు యాడ్ చేయి
బియ్యం stock ఎంత ఉంది
```

Create an account, then create products in the dashboard. The parser recognizes a limited set of actions, units, and Telugu product aliases; it is not unrestricted Telugu language understanding. Audio transcription requires Gemini credentials even when demo mode is enabled; leave the key unset to use text commands only.

## Run the application

Start the Vite frontend and Express backend together:

```sh
npm run dev
```

Open <http://localhost:5173>. The frontend proxies API requests to the backend on port 3001.

To serve a production build locally from the Express process:

```sh
npm run build
npm start
```

Then open <http://localhost:3001>.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DEMO_MODE` | Set to `true` to use in-memory storage and the limited deterministic English/Telugu parser. |
| `HOST` | Backend bind address; defaults to `127.0.0.1`. |
| `PORT` | Backend port; defaults to `3001`. Keep this aligned with the Vite proxy when developing. |
| `JWT_SECRET` | Required signing secret, at least 32 characters. Use a private random value. |
| `MONGODB_URI` | Required when `DEMO_MODE=false`; MongoDB must support transactions (for example, Atlas or a replica set). |
| `MONGODB_DB` | MongoDB database name; defaults to `stockvoice`. |
| `GEMINI_API_KEY` | Optional server-only key for Gemini transcription and command extraction. |
| `GEMINI_MODEL` | Gemini command-extraction model name; the current default is `gemini-3.6-flash`. |
| `STT_MODEL` | Gemini transcription model name; the current default is `gemini-3.5-transcribe`. |

## Demo mode and live mode

**Demo mode** uses in-memory storage and a narrow deterministic parser for supported English, Telugu, and mixed-language commands. It needs a JWT secret but does not need MongoDB or Gemini credentials. Data disappears when the backend restarts. If `GEMINI_API_KEY` is configured, audio transcription can still call Gemini; omit it for a no-provider text-command demo.

**Live mode** (`DEMO_MODE=false`) requires `MONGODB_URI`. MongoDB must support transactions. Configure `GEMINI_API_KEY` to enable Gemini command extraction and audio transcription. Provider credentials and model access are not included or verified by this repository. Recognized Telugu-script commands use the deterministic parser; other live command interpretation requires Gemini.

## Tests

Run the automated tests with:

```sh
npm test
```

The suite exercises API validation, confirmation behavior, ownership, authentication, storage rules, and mocked AI integrations. Mocked provider tests do not measure real transcription or command-recognition accuracy and do not verify live MongoDB connectivity.

## Known limitations

- Demo storage is temporary and command understanding is limited to supported deterministic patterns.
- Telugu/mixed command handling uses a limited grammar and a small set of product aliases; other command forms may need rephrasing or live Gemini configuration.
- Live mode depends on correctly configured MongoDB and Gemini accounts, credentials, model access, and quota.
- Recognition quality for English, Telugu, and mixed speech has not been measured here.
- Telugu speech replies rely on browser/OS speech synthesis voices; availability varies by device.
- Audio recording requires browser microphone support and a secure context such as localhost or HTTPS.
- Inventory history stores the submitted transcript for successful changes.
- MongoDB storage reads a user's small collection into memory for each mutation; it is intended for this MVP's scale.
- There is no undo flow, sales accounting, unit conversion, or email verification.
- No deployment, Docker, or production-hardening configuration is included.

## Future improvements

- Expand command coverage while keeping ambiguous stock changes behind confirmation.
- Add a privacy-conscious evaluation set for English, Telugu, and mixed-language transcripts.
- Make allowed origins configurable for deployment and add repeatable CI checks.

## Security and configuration notes

- Keep `.env` private. It is ignored by `.gitignore`; `.env.example` contains placeholders only.
- Rotate any credential that may have been exposed. Do not put API keys, database credentials, or real JWT secrets in source files, screenshots, logs, or commits.
- Gemini credentials are read by the backend and should never be added to frontend code.
- The default host is loopback. A public deployment needs HTTPS, deployment-specific allowed-origin configuration, and additional security review; this project is not represented as production-ready.
- Accounts are not email-verified. A successful signup does not establish ownership of the supplied email address.

## Development and administration utilities

`npm run check:gemini` lists models available to the configured Google project. `node server/check-gemini-request.js` sends a synthetic command request to the configured model. Both require a Gemini key and make external requests.

`node server/assign-legacy.js ACCOUNT_EMAIL --confirm` is an explicit MongoDB administration utility for assigning records without an owner to an existing account. It can change database ownership and should only be run intentionally against the intended database. It is not part of normal startup or signup.
