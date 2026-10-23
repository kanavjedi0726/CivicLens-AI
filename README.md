# CivicLens AI 🏙️

> **PromptWars Hackathon — Societal Benefit Track**

AI-powered civic operations dashboard that converts messy, unstructured community issue reports into structured, actionable intelligence using the Google Gemini API.

---

## ✨ Features

| Feature | Details |
|---|---|
| **AI Analysis** | Gemini classifies, titles, summarises, and prioritises every report |
| **Structured Output** | Category, urgency (low/medium/high/critical), department routing, extracted location, key evidence |
| **Report Lifecycle** | new → acknowledged → in progress → resolved |
| **Dashboard Stats** | Total / Unresolved / High-Priority / Resolved counts |
| **Search & Filter** | Full-text search + category, urgency, status filters |
| **Duplicate Detection** | Best-effort token-overlap similarity flags potential duplicates |
| **Local Persistence** | Reports survive page refresh via localStorage |
| **Demo Data** | 4 labelled sample reports loaded on first visit |
| **Graceful Degradation** | If Gemini is unavailable, report is saved as "unanalysed" with a clear error message |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone https://github.com/kanavjedi0726/CivicLens-AI.git
cd CivicLens-AI
npm install
```

### 2. Configure Gemini API key

```bash
cp .env.example .env
# Edit .env and add your key:
# GEMINI_API_KEY=AIza...
```

Get a free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Your Google Gemini API key |
| `GEMINI_MODEL` | No | Model name (default: `gemini-2.5-flash`) |

The API key is read exclusively on the server (`src/app/api/reports/route.ts`) and is never sent to the browser.

---

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI**: `@google/genai` — official Google Gen AI SDK
- **Styling**: Vanilla CSS (design system in `src/app/globals.css`)
- **Language**: TypeScript

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/reports/route.ts   # Server-side Gemini API endpoint
│   ├── globals.css            # Full design system (tokens, components)
│   ├── layout.tsx
│   └── page.tsx               # Dashboard (all UI components)
└── lib/
    ├── types.ts               # Shared TypeScript types
    ├── gemini.ts              # Gemini integration with structured output
    ├── duplicates.ts          # Token-overlap duplicate detection
    └── sampleReports.ts       # Demo data
```

---

## 🎬 Demo Walkthrough

1. **Open the dashboard** — 4 labelled sample reports appear automatically.
2. **Click a report card** to see full AI analysis, key evidence, and routing advice.
3. **Update status** using the buttons in the detail modal (Acknowledged → In Progress → Resolved).
4. **Submit a new report** — click **+ New Report** or use **⚡ Sample Report** in the form for a one-click demo.
5. **Filter** by category, urgency, or status; **search** by free text.
6. If a similar report already exists, a **🔁 Possible Duplicates** warning appears.

---

## 🧪 Type Check & Lint

```bash
npm run build     # Full type check + production build
npm run lint      # ESLint
```

---

## ⚠️ Known Limitations

- Reports are stored in browser `localStorage` (client-side only; no shared database).
- Duplicate detection uses token overlap — not semantic embeddings — so it may miss paraphrases.
- Rate limits from the Gemini free tier may occasionally suppress analysis; reports are saved regardless.

---

## 📄 License

MIT
