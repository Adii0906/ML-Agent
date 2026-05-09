# ML Engineer: Autonomous AI Agent 🚀

ML Engineer is a futuristic, autonomous assistant designed to automate the complete Machine Learning workflow. From researching SOTA papers to deploying trained models, it handles the heavy lifting so you can focus on high-level architecture.

## 🌟 Key Features

- **Autonomous Research**: Search arXiv for the latest ML papers and get AI-ranked relevance scores.
- **Data Lab**: Intelligent dataset ingestion with automatic statistical fingerprinting and analysis.
- **AI Recommendation Engine**: Groq Llama 3 or Local Ollama powered algorithm suggestions with detailed reasoning.
- **Automated Pipeline**: End-to-end preprocessing, training, tuning, and evaluation using `scikit-learn`.
- **Insights Engine**: Professional, executive-level reports with performance charts and key observations.
- **Hybrid LLM Support**: Choose between high-performance Groq Cloud or fully private Local Ollama.

## 🚀 Quick Start (Production)

The easiest way to run the full stack is using Docker Compose:

```bash
docker-compose up --build
```

Access the dashboard at `http://localhost`.

## 🛠️ Configuration

1. **API Keys**: Add your `GROQ_API_KEY` to `backend/.env`.
2. **Local AI**: To use Ollama, toggle "Offline Mode" in the **System Config** tab.
3. **Storage**: Experiments are persisted in a local SQLite database (`ml_engineer.db`).

## 🏗️ Tech Stack

- **Frontend**: React, Vite, Framer Motion, Lucide, Recharts.
- **Backend**: FastAPI, Uvicorn, SQLite, WebSockets.
- **AI/ML**: Groq Llama 3, Ollama, Scikit-learn, Pandas, NumPy.

## 📦 Deployment

The project is production-ready with:
- **Persistence**: SQLite database for experiment tracking.
- **Dockerization**: Multi-stage builds for optimized container sizes.
- **Nginx**: Production-grade frontend serving.
- **Environment Config**: Consistent API URL management via environment variables.

---
Built with ❤️ for ML Engineers.
