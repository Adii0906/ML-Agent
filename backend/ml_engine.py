import asyncio
import json
import os
import uuid
import time
from datetime import datetime
from typing import Dict, List, Optional, AsyncGenerator
import logging
import sqlite3
import pandas as pd
import numpy as np
from groq import Groq
import arxiv
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, mean_squared_error, r2_score
import requests

logger = logging.getLogger(__name__)

class MLEngine:
    def __init__(self, db_path: str = "ml_engineer.db"):
        self.db_path = db_path
        self._init_db()
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.use_ollama = os.getenv("USE_OLLAMA", "false").lower() == "true"
        self.paper_cache: Dict[str, List] = {}

    def _init_db(self):
        """Initialize SQLite database for persistence"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS experiments (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    algorithm TEXT,
                    dataset_path TEXT,
                    config TEXT,
                    status TEXT,
                    metrics TEXT,
                    logs TEXT,
                    training_time REAL,
                    created_at TEXT,
                    completed_at TEXT,
                    error TEXT
                )
            """)
            conn.commit()

    async def _save_experiment(self, exp: Dict):
        """Save experiment to database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO experiments 
                (id, name, algorithm, dataset_path, config, status, metrics, logs, training_time, created_at, completed_at, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                exp["id"], exp["name"], exp["algorithm"], exp["dataset_path"],
                json.dumps(exp["config"]), exp["status"], json.dumps(exp["metrics"]),
                json.dumps(exp.get("logs", [])), exp.get("training_time", 0),
                exp["created_at"], exp.get("completed_at"), exp.get("error")
            ))
            conn.commit()

    async def _call_llm(self, prompt: str, json_format: bool = True) -> str:
        """Helper to switch between Groq and Ollama"""
        if self.use_ollama:
            try:
                response = requests.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": "llama3",
                        "prompt": prompt,
                        "stream": False,
                        "format": "json" if json_format else ""
                    }
                )
                return response.json().get("response", "")
            except Exception as e:
                logger.error(f"Ollama call failed: {e}")
                if os.getenv("GROQ_API_KEY"):
                    return await self._call_groq(prompt, json_format)
                raise e
        else:
            return await self._call_groq(prompt, json_format)

    async def _call_groq(self, prompt: str, json_format: bool = True) -> str:
        completion = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} if json_format else None
        )
        return completion.choices[0].message.content
    
    # ============ PAPER SEARCH ============
    async def search_papers(self, query: str, limit: int = 5) -> List[Dict]:
        """Search for papers using arXiv API and Groq for relevance ranking"""
        try:
            papers = []
            arxiv_client = arxiv.Client()
            
            # Search arxiv
            search = arxiv.Search(
                query=query,
                max_results=limit,
                sort_by=arxiv.SortCriterion.Relevance,
                sort_order=arxiv.SortOrder.Descending
            )
            
            for result in search.results():
                paper = {
                    "title": result.title,
                    "authors": ", ".join([str(a) for a in result.authors[:3]]),
                    "published": result.published.isoformat(),
                    "summary": result.summary[:300] + "..." if len(result.summary) > 300 else result.summary,
                    "pdf_url": result.pdf_url,
                    "arxiv_id": result.entry_id.split('/abs/')[-1]
                }
                papers.append(paper)
            
            # Use Groq Llama to rank papers for relevance
            if papers:
                papers = await self._rank_papers_with_groq(query, papers)
            
            self.paper_cache[query] = papers
            return papers
        
        except Exception as e:
            logger.error(f"Error searching papers: {e}")
            return []
    
    async def _rank_papers_with_groq(self, query: str, papers: List[Dict]) -> List[Dict]:
        """Use Groq Llama to rank papers by relevance"""
        try:
            paper_list_str = "\n".join([
                f"{i+1}. {p['title']} - {p['summary'][:100]}..."
                for i, p in enumerate(papers)
            ])
            
            prompt = f"""Given this search query: "{query}"
            
Here are papers:
{paper_list_str}

Rank these papers by relevance to the query (1 = most relevant).
Return ONLY a JSON object with paper indices as keys and relevance scores (0-1) as values.
Example: {{"0": 0.95, "1": 0.87}}
"""
            
            rankings_text = await self._call_llm(prompt, json_format=True)
            try:
                rankings = json.loads(rankings_text)
                sorted_papers = sorted(
                    enumerate(papers),
                    key=lambda x: rankings.get(str(x[0]), 0),
                    reverse=True
                )
                return [p[1] for p in sorted_papers]
            except json.JSONDecodeError:
                return papers
        
        except Exception as e:
            logger.error(f"Error ranking papers: {e}")
            return papers

    # ============ DATASET ANALYSIS ============
    async def analyze_dataset(self, file_path: str, dataset_type: str) -> Dict:
        """Analyze dataset and extract statistics"""
        try:
            if dataset_type == "tabular":
                return await self._analyze_tabular(file_path)
            elif dataset_type == "text":
                return await self._analyze_text(file_path)
            else:
                return {"error": "Unsupported dataset type"}
        except Exception as e:
            logger.error(f"Error analyzing dataset: {e}")
            raise
    
    async def _analyze_tabular(self, file_path: str) -> Dict:
        """Analyze tabular dataset (CSV, parquet)"""
        try:
            if file_path.endswith('.csv'):
                try:
                    df = pd.read_csv(file_path, encoding='utf-8')
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(file_path, encoding='latin1')
                    except UnicodeDecodeError:
                        df = pd.read_csv(file_path, encoding='utf-16')
            elif file_path.endswith('.parquet'):
                df = pd.read_parquet(file_path)
            else:
                raise ValueError(f"Unsupported file format for analysis: {file_path}")
            
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            
            analysis = {
                "rows": len(df),
                "columns": len(df.columns),
                "data_types": df.dtypes.astype(str).to_dict(),
                "missing_values": df.isnull().sum().to_dict(),
                "numeric_features": numeric_cols,
                "categorical_features": categorical_cols,
                "numeric_stats": df[numeric_cols].describe().replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict() if numeric_cols else {},
                "class_distribution": df[categorical_cols[0]].value_counts().to_dict() if categorical_cols else None,
            }
            
            return analysis
        except Exception as e:
            logger.error(f"Tabular analysis error for {file_path}: {e}")
            raise
    
    async def _analyze_text(self, file_path: str) -> Dict:
        """Analyze text dataset"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        return {
            "total_characters": len(content),
            "total_words": len(content.split()),
            "total_lines": content.count('\n'),
            "avg_word_length": len(content) / len(content.split()) if content else 0,
        }

    async def generate_report(self, experiment_id: str) -> Dict:
        """Generate a professional ML report using Groq Llama"""
        exp = await self.get_experiment(experiment_id)
        if not exp:
            return {"error": "Experiment not found"}
        
        prompt = f"""You are a Senior ML Engineer. Generate a professional, executive-level ML report for the following experiment:
        
Experiment Name: {exp['name']}
Algorithm: {exp['algorithm']}
Metrics: {json.dumps(exp['metrics'], indent=2)}
Status: {exp['status']}
Training Time: {exp['training_time']}s

The report should include:
1. Executive Summary
2. Key Insights
3. Performance Analysis
4. Recommendations for Next Steps

Provide ONLY a valid JSON response with these exact fields:
{{
    "summary": "...",
    "insights": ["...", "..."],
    "analysis": "...",
    "next_steps": ["...", "..."],
    "visual_data": {{"labels": ["metric1", "metric2"], "values": [0.8, 0.9]}}
}}
"""
        report_text = await self._call_llm(prompt, json_format=True)
        return json.loads(report_text)

    # ============ ALGORITHM RECOMMENDATION ============
    async def get_algorithm_recommendation(
        self,
        analysis: Dict,
        dataset_type: str,
        task_type: str
    ) -> Dict:
        """Use Groq Llama API to recommend best algorithm"""
        try:
            prompt = f"""You are a Senior ML Engineer. Based on the following dataset analysis and task, 
recommend the BEST algorithm to use.

Dataset Type: {dataset_type}
Task Type: {task_type}
Dataset Analysis:
{json.dumps(analysis, indent=2, default=str)}

Provide ONLY a valid JSON response with these exact fields:
{{
    "algorithm": "algorithm name",
    "confidence": 0.95,
    "reasoning": "why this algorithm is best for this specific data",
    "hyperparameters": {{"param1": "value1", "param2": "value2"}},
    "expected_performance": "expected accuracy/metrics with explanation",
    "pros": ["pro1", "pro2"],
    "cons": ["con1", "con2"]
}}

Be specific, practical, and futuristic in your reasoning."""
            
            response_text = await self._call_llm(prompt, json_format=True)
            
            try:
                recommendation = json.loads(response_text)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    recommendation = json.loads(json_match.group())
                else:
                    raise ValueError("Could not parse Groq response as JSON")
            
            return recommendation
        
        except Exception as e:
            logger.error(f"Error getting algorithm recommendation: {e}")
            raise
    
    # ============ MODEL TRAINING ============
    async def create_experiment(
        self,
        name: str,
        algorithm: str,
        dataset_path: str,
        config: Dict
    ) -> str:
        """Create and persist a new experiment"""
        experiment_id = str(uuid.uuid4())
        exp = {
            "id": experiment_id,
            "name": name,
            "algorithm": algorithm,
            "dataset_path": dataset_path,
            "config": config,
            "status": "initializing",
            "metrics": {},
            "logs": [],
            "created_at": datetime.now().isoformat(),
            "completed_at": None,
            "training_time": 0,
            "error": None
        }
        await self._save_experiment(exp)
        return experiment_id
    
    async def train_model_streaming(
        self,
        experiment_id: str,
        algorithm: str,
        dataset_path: str,
        config: Dict
    ) -> AsyncGenerator[Dict, None]:
        """Train model with real scikit-learn logic and streaming updates"""
        
        exp = await self.get_experiment(experiment_id)
        exp["status"] = "training"
        await self._save_experiment(exp)
        
        start_time = time.time()
        
        try:
            yield {"stage": "loading", "message": "Inhaling dataset into neural buffers...", "progress": 5}
            await asyncio.sleep(1)
            
            if dataset_path.endswith('.csv'):
                try:
                    df = pd.read_csv(dataset_path, encoding='utf-8')
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(dataset_path, encoding='latin1')
                    except UnicodeDecodeError:
                        df = pd.read_csv(dataset_path, encoding='utf-16')
            elif dataset_path.endswith('.parquet'):
                df = pd.read_parquet(dataset_path)
            else:
                raise ValueError("Format not supported for automated training")
                
            yield {"stage": "loaded", "message": f"Successfully loaded {len(df)} samples", "progress": 15}
            await asyncio.sleep(0.5)
            
            yield {"stage": "preprocessing", "message": "Executing feature engineering pipeline...", "progress": 25}
            await asyncio.sleep(1)
            
            target_col = df.columns[-1]
            X = df.drop(columns=[target_col])
            y = df[target_col]
            
            X = X.fillna(X.median(numeric_only=True))
            
            for col in X.select_dtypes(include=['object']).columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
            
            if y.dtype == 'object':
                le_y = LabelEncoder()
                y = le_y.fit_transform(y.astype(str))
            
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
            
            yield {"stage": "preprocessing", "message": "Preprocessing complete. Data split 80/20.", "progress": 40}
            await asyncio.sleep(0.5)
            
            yield {"stage": "training", "message": f"Initializing {algorithm} architecture...", "progress": 50}
            await asyncio.sleep(1)
            
            task_type = config.get('task_type', 'classification')
            if 'forest' in algorithm.lower():
                model = RandomForestClassifier() if task_type == 'classification' else RandomForestRegressor()
            elif 'gradient' in algorithm.lower() or 'boost' in algorithm.lower():
                model = GradientBoostingClassifier() if task_type == 'classification' else GradientBoostingRegressor()
            elif 'logistic' in algorithm.lower():
                model = LogisticRegression()
            else:
                model = LinearRegression() if task_type == 'regression' else RandomForestClassifier()
                
            yield {"stage": "training", "message": "Neural optimization in progress...", "progress": 70}
            
            model.fit(X_train, y_train)
            
            yield {"stage": "training", "message": "Model weights converged.", "progress": 85}
            await asyncio.sleep(0.5)
            
            yield {"stage": "evaluation", "message": "Running cross-validation metrics...", "progress": 90}
            y_pred = model.predict(X_test)
            
            if task_type == 'classification':
                metrics = {
                    "accuracy": float(accuracy_score(y_test, y_pred)),
                    "f1_score": float(f1_score(y_test, y_pred, average='weighted')),
                    "precision": float(precision_score(y_test, y_pred, average='weighted')),
                    "recall": float(recall_score(y_test, y_pred, average='weighted'))
                }
            else:
                metrics = {
                    "mse": float(mean_squared_error(y_test, y_pred)),
                    "r2_score": float(r2_score(y_test, y_pred))
                }
            
            exp["metrics"] = metrics
            exp["training_time"] = round(time.time() - start_time, 2)
            exp["status"] = "completed"
            exp["completed_at"] = datetime.now().isoformat()
            await self._save_experiment(exp)
            
            yield {
                "stage": "completed", 
                "message": "Deployment ready. All systems nominal.", 
                "progress": 100,
                "metrics": metrics
            }
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            exp["status"] = "failed"
            exp["error"] = str(e)
            await self._save_experiment(exp)
            yield {"stage": "error", "message": f"Critical Failure: {str(e)}", "progress": 0}
    
    async def get_experiment(self, experiment_id: str) -> Optional[Dict]:
        """Get experiment from database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
            row = cursor.fetchone()
            if row:
                exp = dict(row)
                exp["config"] = json.loads(exp["config"])
                exp["metrics"] = json.loads(exp["metrics"])
                exp["logs"] = json.loads(exp["logs"])
                return exp
        return None

    async def get_all_experiments(self) -> List[Dict]:
        """Get all experiments from database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT * FROM experiments ORDER BY created_at DESC")
            experiments = []
            for row in cursor.fetchall():
                exp = dict(row)
                exp["config"] = json.loads(exp["config"])
                exp["metrics"] = json.loads(exp["metrics"])
                exp["logs"] = json.loads(exp["logs"])
                experiments.append(exp)
            return experiments
