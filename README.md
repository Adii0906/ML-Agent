# ML Engineer: Autonomous AI Agent 🚀

A complete, autonomous ML workflow automation tool.

## Quick Overview

ML Engineer is a futuristic AI assistant that automates the entire ML pipeline from research to deployment.

**Important**: No random fallbacks - strictly uses your Groq API key for all AI features.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  - Futuristic UI with animations                        │
│  - Paper Search, Data Lab, Model Engine, Insights      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP & WebSockets
┌──────────────────────▼──────────────────────────────────┐
│                  Backend (FastAPI)                      │
│  - File Uploads, WebSocket Streaming, Experiment Storage│
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                              │
┌───────▼───────┐             ┌──────▼───────┐
│   LLM Engine  │             │  ML Pipeline  │
│ - Groq Llama  │             │ - Scikit-learn│
│ - Local Ollama│             │ - Preprocessing│
└───────────────┘             └──────────────┘
```

---

## What It Does

1. **Research Papers**: Search arXiv and get AI-ranked results
2. **Data Lab**: Auto-analyze your dataset (statistics, missing values, etc.)
3. **AI Recommendation**: Get the best algorithm for your data with reasoning
4. **Auto-Train**: One-click training with real-time updates
5. **Insights**: Professional ML reports with charts and recommendations

---

## Get Started

### 1. Add Your API Key

Create a `.env` file in the **root directory**:

```env
GROQ_API_KEY=gsk_your_actual_key_here
```

### 2. Start the App

```bash
# Backend (Terminal 1)
cd backend
python -u main.py

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

### 3. Open the App

Visit: **http://localhost:5173**

---

## Quick Test

Use the sample dataset at `data/sample.csv` to experience the full workflow.

---

## Tech Stack

- **Frontend**: React + Vite + Framer Motion
- **Backend**: FastAPI + SQLite
- **AI**: Groq Llama 3.3-70B / Local Ollama
- **ML**: Scikit-learn + Pandas + NumPy

---

Built for ML Engineers who want to focus on ideas, not boilerplate.
