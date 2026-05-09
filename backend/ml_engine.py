import asyncio
import json
import os
import uuid
import time
from datetime import datetime
from typing import Dict, List, Optional, AsyncGenerator, TypedDict, Annotated, Sequence
import logging
import sqlite3
import pandas as pd
import numpy as np
from groq import Groq
import arxiv
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold, KFold
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, mean_squared_error, r2_score
import requests
import joblib
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.svm import SVC, SVR
from sklearn.naive_bayes import GaussianNB
from dotenv import load_dotenv

try:
    from xgboost import XGBClassifier, XGBRegressor
except ImportError:
    XGBClassifier = XGBRegressor = None

# Load environment variables from root directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

logger = logging.getLogger(__name__)

class MLEngine:
    def __init__(self, db_path: str = "ml_engineer.db"):
        self.db_path = db_path
        self._init_db()
        self.groq_client = None
        if os.getenv("GROQ_API_KEY"):
            self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.use_ollama = os.getenv("USE_OLLAMA", "false").lower() == "true"
        self.paper_cache: Dict[str, List] = {}

    def _init_db(self):
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
        if self.use_ollama:
            try:
                response = requests.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": "llama3",
                        "prompt": prompt,
                        "stream": False,
                        "format": "json" if json_format else ""
                    },
                    timeout=60
                )
                return response.json().get("response", "")
            except Exception as e:
                logger.error(f"Ollama call failed: {e}")
                if self.groq_client:
                    return await self._call_groq(prompt, json_format)
                raise e
        else:
            return await self._call_groq(prompt, json_format)

    async def _call_groq(self, prompt: str, json_format: bool = True) -> str:
        if not self.groq_client:
            raise ValueError("Groq API key not configured. Please set GROQ_API_KEY in .env.")
        completion = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"} if json_format else None,
            temperature=0.7
        )
        return completion.choices[0].message.content
    
    async def search_papers(self, query: str, limit: int = 5) -> List[Dict]:
        try:
            papers = []
            client = arxiv.Client(page_size=limit)
            search = arxiv.Search(
                query=query,
                max_results=limit,
                sort_by=arxiv.SortCriterion.Relevance,
                sort_order=arxiv.SortOrder.Descending
            )
            
            for result in client.results(search):
                paper = {
                    "title": result.title,
                    "authors": ", ".join([str(a) for a in result.authors[:3]]),
                    "published": result.published.isoformat(),
                    "summary": result.summary[:300] + "..." if len(result.summary) > 300 else result.summary,
                    "pdf_url": result.pdf_url,
                    "arxiv_id": result.entry_id.split('/abs/')[-1]
                }
                papers.append(paper)
            
            if papers and self.groq_client:
                papers = await self._rank_papers_with_groq(query, papers)
            
            self.paper_cache[query] = papers
            return papers
        
        except Exception as e:
            logger.error(f"Error searching papers: {e}")
            return []
    
    async def _rank_papers_with_groq(self, query: str, papers: List[Dict]) -> List[Dict]:
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

    async def analyze_dataset(self, file_path: str, dataset_type: str) -> Dict:
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
        try:
            if file_path.endswith('.csv'):
                for enc in ['utf-8', 'latin1', 'utf-16']:
                    try:
                        df = pd.read_csv(file_path, encoding=enc)
                        break
                    except UnicodeDecodeError:
                        continue
            elif file_path.endswith('.parquet'):
                df = pd.read_parquet(file_path)
            else:
                raise ValueError(f"Unsupported file format for analysis: {file_path}")
            
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            
            analysis = {
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist(),
                "data_types": df.dtypes.astype(str).to_dict(),
                "missing_values": df.isnull().sum().to_dict(),
                "duplicate_rows": int(df.duplicated().sum()),
                "numeric_features": numeric_cols,
                "categorical_features": categorical_cols,
                "numeric_stats": df[numeric_cols].describe().replace({np.nan: None, np.inf: None, -np.inf: None}).to_dict() if numeric_cols else {},
                "class_distribution": df[categorical_cols[0]].value_counts().to_dict() if categorical_cols else None,
            }
            
            if self.groq_client:
                target_recommendation = await self._detect_target_and_type(analysis)
                analysis.update(target_recommendation)
            
            return analysis
        except Exception as e:
            logger.error(f"Tabular analysis error for {file_path}: {e}")
            raise
    
    async def _detect_target_and_type(self, analysis: Dict) -> Dict:
        try:
            prompt = f"""Given the following dataset analysis, identify:
1. The most likely 'target_column' for prediction.
2. The 'task_type' (classification or regression).
3. A brief 'explanation' why.

Dataset Summary:
Columns: {analysis['column_names']}
Types: {analysis['data_types']}
Numeric Stats: {json.dumps(analysis['numeric_stats'])}

Return ONLY a JSON object: {{"target_column": "name", "task_type": "classification/regression", "explanation": "..."}}
"""
            response_text = await self._call_llm(prompt, json_format=True)
            return json.loads(response_text)
        except Exception as e:
            logger.error(f"Error in target detection: {e}")
            return {
                "target_column": analysis['column_names'][-1],
                "task_type": "classification",
                "explanation": "Defaulted to last column."
            }

    async def _analyze_text(self, file_path: str) -> Dict:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        return {
            "total_characters": len(content),
            "total_words": len(content.split()),
            "total_lines": content.count('\n'),
            "avg_word_length": len(content) / len(content.split()) if content else 0,
        }

    async def generate_report(self, experiment_id: str) -> Dict:
        exp = await self.get_experiment(experiment_id)
        if not exp:
            return {"error": "Experiment not found"}

        m = exp['metrics']
        feat_imp = m.get('feature_importance', {})
        top_features = feat_imp.get('features', [])[:5]

        prompt = f"""You are a Senior ML Engineer writing a professional report.

Experiment: {exp['name']}
Algorithm: {exp['algorithm']}
Task: {m.get('task_type','N/A')}
Validation: {m.get('validation_strategy','N/A')}
Dataset: {m.get('n_samples','?')} samples, {m.get('n_features','?')} features
Dataset Size Category: {m.get('dataset_size_category','N/A')}
Target Column: {m.get('target_column','N/A')}
Top Features: {top_features}
Metrics: {json.dumps({k:v for k,v in m.items() if k not in ['feature_importance','note']}, indent=2)}
Training Time: {exp['training_time']}s
Note: {m.get('note','')}

Return ONLY valid JSON with these exact keys:
{{
  "summary": "2-3 sentence executive summary",
  "insights": ["insight1", "insight2", "insight3"],
  "analysis": "detailed performance analysis paragraph",
  "preprocessing_summary": "what preprocessing was done",
  "recommendation": "final AI recommendation for deployment or next steps",
  "next_steps": ["step1", "step2", "step3"],
  "visual_data": {{"labels": ["metric1", "metric2"], "values": [0.8, 0.9]}}
}}"""
        try:
            report_text = await self._call_llm(prompt, json_format=True)
            return json.loads(report_text)
        except Exception as e:
            logger.error(f"Report generation error: {e}")
            return {
                "summary": f"Experiment '{exp['name']}' completed using {exp['algorithm']}.",
                "insights": ["Model trained successfully.", f"Validation: {m.get('validation_strategy','N/A')}"],
                "analysis": "Report generation encountered an issue. Metrics are available above.",
                "preprocessing_summary": "Standard pipeline: missing value imputation, label encoding, StandardScaler.",
                "recommendation": "Review metrics and iterate with more data if needed.",
                "next_steps": ["Collect more training data.", "Tune hyperparameters.", "Deploy and monitor."],
                "visual_data": {"labels": list(m.keys())[:4], "values": [float(v) if isinstance(v, (int,float)) else 0 for v in list(m.values())[:4]]}
            }

    async def get_algorithm_recommendation(
        self,
        analysis: Dict,
        dataset_type: str,
        task_type: str
    ) -> Dict:
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
                    raise ValueError("Could not parse LLM response as JSON")
            
            return recommendation
        
        except Exception as e:
            logger.error(f"Error getting algorithm recommendation: {e}")
            raise
    
    async def create_experiment(
        self,
        name: str,
        algorithm: str,
        dataset_path: str,
        config: Dict
    ) -> str:
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
    
    def _select_model(self, algorithm: str, task_type: str):
        alg = algorithm.lower()
        is_clf = task_type == 'classification'
        if 'random forest' in alg:
            return RandomForestClassifier(n_estimators=100, random_state=42) if is_clf else RandomForestRegressor(n_estimators=100, random_state=42)
        elif 'gradient boosting' in alg:
            return GradientBoostingClassifier(random_state=42) if is_clf else GradientBoostingRegressor(random_state=42)
        elif 'logistic' in alg:
            return LogisticRegression(max_iter=1000, random_state=42)
        elif 'linear regression' in alg or ('linear' in alg and not is_clf):
            return LinearRegression()
        elif 'decision tree' in alg:
            return DecisionTreeClassifier(random_state=42) if is_clf else DecisionTreeRegressor(random_state=42)
        elif 'knn' in alg or 'neighbor' in alg:
            return KNeighborsClassifier() if is_clf else KNeighborsRegressor()
        elif 'svm' in alg:
            return SVC(probability=True, random_state=42) if is_clf else SVR()
        elif 'naive bayes' in alg:
            return GaussianNB()
        elif 'xgboost' in alg and XGBClassifier is not None:
            return XGBClassifier(random_state=42, eval_metric='logloss') if is_clf else XGBRegressor(random_state=42)
        else:
            return RandomForestClassifier(n_estimators=100, random_state=42) if is_clf else RandomForestRegressor(n_estimators=100, random_state=42)

    def _get_feature_importance(self, model, feature_names: List[str]) -> Dict:
        try:
            if hasattr(model, 'feature_importances_'):
                imp = model.feature_importances_
                ranked = sorted(zip(feature_names, imp.tolist()), key=lambda x: x[1], reverse=True)
                return {"features": [r[0] for r in ranked], "importances": [round(r[1], 4) for r in ranked]}
            elif hasattr(model, 'coef_'):
                coef = np.abs(model.coef_).flatten() if model.coef_.ndim > 1 else np.abs(model.coef_)
                ranked = sorted(zip(feature_names, coef.tolist()), key=lambda x: x[1], reverse=True)
                return {"features": [r[0] for r in ranked], "importances": [round(r[1], 4) for r in ranked]}
        except Exception:
            pass
        return {"features": feature_names, "importances": [0.0] * len(feature_names)}

    async def train_model_streaming(
        self,
        experiment_id: str,
        algorithm: str,
        dataset_path: str,
        config: Dict
    ) -> AsyncGenerator[Dict, None]:
        
        exp = await self.get_experiment(experiment_id)
        exp["status"] = "training"
        await self._save_experiment(exp)
        
        start_time = time.time()
        
        try:
            yield {"stage": "loading", "message": "Inhaling dataset into neural buffers...", "progress": 5}
            await asyncio.sleep(0.5)

            if dataset_path.endswith('.csv'):
                for enc in ['utf-8', 'latin1', 'utf-16']:
                    try:
                        df = pd.read_csv(dataset_path, encoding=enc)
                        break
                    except UnicodeDecodeError:
                        continue
            elif dataset_path.endswith('.parquet'):
                df = pd.read_parquet(dataset_path)
            else:
                raise ValueError("Unsupported format. Please upload a CSV or Parquet file.")

            n_raw = len(df)
            yield {"stage": "loaded", "message": f"Loaded {n_raw} samples × {len(df.columns)} features", "progress": 15}
            await asyncio.sleep(0.3)

            if n_raw < 2:
                raise ValueError(
                    f"Dataset has only {n_raw} row(s). Please upload a dataset with at least 2 samples."
                )

            yield {"stage": "preprocessing", "message": "Running intelligent preprocessing pipeline...", "progress": 22}
            await asyncio.sleep(0.3)

            df = df.drop_duplicates()
            removed = n_raw - len(df)
            if removed:
                yield {"stage": "preprocessing", "message": f"Removed {removed} duplicate rows", "progress": 28}

            target_col = config.get('target_column') or df.columns[-1]
            if target_col not in df.columns:
                target_col = df.columns[-1]

            X = df.drop(columns=[target_col]).copy()
            y = df[target_col].copy()
            feature_names = X.columns.tolist()

            task_type = config.get('task_type') or ''
            if not task_type:
                if y.dtype == 'object' or y.nunique() <= 20:
                    task_type = 'classification'
                else:
                    task_type = 'regression'

            for col in X.columns:
                if X[col].dtype.kind in 'iufcb':
                    X[col] = X[col].fillna(X[col].median())
                else:
                    X[col] = X[col].fillna(X[col].mode().iloc[0] if not X[col].mode().empty else 'Unknown')

            for col in X.select_dtypes(include=['object', 'category']).columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))

            if task_type == 'classification' and y.dtype == 'object':
                le_y = LabelEncoder()
                y = pd.Series(le_y.fit_transform(y.astype(str)))

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            n_samples = len(X_scaled)

            yield {"stage": "preprocessing", "message": f"Preprocessing done — {n_samples} clean samples, task={task_type}", "progress": 40}
            await asyncio.sleep(0.3)

            use_cv = n_samples < 50
            n_folds = min(n_samples, 5)

            if use_cv:
                strategy = f"{n_folds}-Fold Cross-Validation (small dataset mode)"
            else:
                test_pct = 0.1 if n_samples < 200 else 0.15 if n_samples < 1000 else 0.2
                strategy = f"Hold-out {int(test_pct*100)}% test split"

            yield {"stage": "training", "message": f"Strategy: {strategy}", "progress": 48}
            yield {"stage": "training", "message": f"Initializing {algorithm}...", "progress": 55}
            await asyncio.sleep(0.5)

            model = self._select_model(algorithm, task_type)

            yield {"stage": "training", "message": "Fitting model...", "progress": 65}

            if use_cv:
                cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42) \
                     if task_type == 'classification' else \
                     KFold(n_splits=n_folds, shuffle=True, random_state=42)

                scoring = 'accuracy' if task_type == 'classification' else 'r2'
                cv_scores = cross_val_score(model, X_scaled, y, cv=cv, scoring=scoring)

                model.fit(X_scaled, y)
                y_pred = model.predict(X_scaled)

                if task_type == 'classification':
                    metrics = {
                        "accuracy": float(np.mean(cv_scores)),
                        "f1_score": float(f1_score(y, y_pred, average='weighted', zero_division=0)),
                        "precision": float(precision_score(y, y_pred, average='weighted', zero_division=0)),
                        "recall": float(recall_score(y, y_pred, average='weighted', zero_division=0)),
                        "cv_mean": float(np.mean(cv_scores)),
                        "cv_std": float(np.std(cv_scores)),
                        "task_type": "classification",
                        "validation_strategy": strategy,
                        "note": "CV accuracy shown (small dataset — trained on full data for export)"
                    }
                else:
                    metrics = {
                        "mse": float(mean_squared_error(y, y_pred)),
                        "rmse": float(np.sqrt(mean_squared_error(y, y_pred))),
                        "r2_score": float(np.mean(cv_scores)),
                        "cv_mean": float(np.mean(cv_scores)),
                        "cv_std": float(np.std(cv_scores)),
                        "task_type": "regression",
                        "validation_strategy": strategy,
                        "note": "CV R² shown (small dataset — trained on full data for export)"
                    }
            else:
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=test_pct, random_state=42,
                    stratify=y if task_type == 'classification' and y.nunique() > 1 else None
                )
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)

                if task_type == 'classification':
                    metrics = {
                        "accuracy": float(accuracy_score(y_test, y_pred)),
                        "f1_score": float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
                        "precision": float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
                        "recall": float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
                        "task_type": "classification",
                        "validation_strategy": strategy
                    }
                else:
                    metrics = {
                        "mse": float(mean_squared_error(y_test, y_pred)),
                        "rmse": float(np.sqrt(mean_squared_error(y_test, y_pred))),
                        "r2_score": float(r2_score(y_test, y_pred)),
                        "task_type": "regression",
                        "validation_strategy": strategy
                    }

            yield {"stage": "evaluation", "message": "Computing evaluation metrics...", "progress": 82}
            await asyncio.sleep(0.3)

            feature_imp = self._get_feature_importance(model, feature_names)
            metrics["feature_importance"] = feature_imp
            metrics["n_samples"] = n_samples
            metrics["n_features"] = len(feature_names)
            metrics["target_column"] = target_col
            metrics["algorithm_used"] = algorithm
            metrics["dataset_size_category"] = (
                "tiny" if n_samples < 50 else
                "small" if n_samples < 500 else
                "medium" if n_samples < 5000 else "large"
            )

            model_path = f"model_{experiment_id}.joblib"
            joblib.dump({"model": model, "scaler": scaler, "feature_names": feature_names,
                         "task_type": task_type, "target_column": target_col}, model_path)

            yield {"stage": "saving", "message": "Model serialized and ready for export.", "progress": 92}
            await asyncio.sleep(0.3)

            exp["metrics"] = metrics
            exp["training_time"] = round(time.time() - start_time, 2)
            exp["status"] = "completed"
            exp["completed_at"] = datetime.now().isoformat()
            await self._save_experiment(exp)

            yield {"stage": "completed", "message": "All systems nominal. Model deployed.", "progress": 100, "metrics": metrics}

        except Exception as e:
            logger.error(f"Training error: {e}", exc_info=True)
            exp["status"] = "failed"
            exp["error"] = str(e)
            await self._save_experiment(exp)
            yield {"stage": "error", "message": str(e), "progress": 0}
    
    async def get_experiment(self, experiment_id: str) -> Optional[Dict]:
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
