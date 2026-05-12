from fastapi import FastAPI, HTTPException, WebSocket, BackgroundTasks, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
from datetime import datetime
from typing import Optional
import os
from dotenv import load_dotenv
import logging
import shutil
from pathlib import Path

# Import our modules
from ml_engine import MLEngine
from models import (
    DatasetRequest, AlgorithmRecommendation, 
    TrainingRequest, ExperimentResult
)

# Load environment variables from root directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ML-Agent", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML Engine
ml_engine = MLEngine()

# UPLOAD DIRECTORY
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount static files (Frontend)
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

# WebSocket connections for real-time updates
active_connections = []

class ConnectionManager:
    def __init__(self):
        self.active_connections = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")

manager = ConnectionManager()

# ============ ROUTES ============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a dataset file to the server"""
    try:
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "status": "success",
            "file_path": str(file_path.absolute()),
            "filename": file.filename
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search-papers")
async def search_papers(query: str, limit: int = 5):
    """Search for papers using Groq/arXiv"""
    try:
        papers = await ml_engine.search_papers(query, limit)
        return {
            "status": "success",
            "papers": papers,
            "count": len(papers)
        }
    except Exception as e:
        logger.error(f"Error searching papers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-dataset-preview")
async def get_dataset_preview(file_path: str, rows: int = 20):
    """Get dataset preview as a table for display"""
    import pandas as pd
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        encodings = ['utf-8', 'latin1', 'utf-16']
        df = None
        
        for encoding in encodings:
            try:
                if file_path.endswith('.csv'):
                    df = pd.read_csv(file_path, encoding=encoding, nrows=rows * 2)
                elif file_path.endswith('.parquet'):
                    df = pd.read_parquet(file_path)
                    df = df.head(rows * 2)
                break
            except:
                continue
        
        if df is None:
            raise HTTPException(status_code=400, detail="Could not read file with any supported encoding")
        
        # Get first N rows and convert to JSON
        preview = df.head(rows).to_dict(orient='records')
        columns = list(df.columns)
        dtypes = {col: str(df[col].dtype) for col in columns}
        
        return {
            "status": "success",
            "columns": columns,
            "dtypes": dtypes,
            "data": preview,
            "total_rows": len(df)
        }
    except Exception as e:
        logger.error(f"Error getting dataset preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-dataset")
async def analyze_dataset(request: DatasetRequest):
    """Analyze dataset and get basic statistics"""
    try:
        logger.info(f"Analyzing dataset at path: {request.file_path}")
        if not os.path.exists(request.file_path):
            logger.error(f"File not found: {request.file_path}")
            raise HTTPException(status_code=404, detail=f"Dataset file not found at {request.file_path}")
            
        analysis = await ml_engine.analyze_dataset(
            request.file_path,
            request.dataset_type
        )
        return {
            "status": "success",
            "analysis": analysis
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error analyzing dataset: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend-algorithm")
async def recommend_algorithm(request: DatasetRequest):
    """Use Claude API to recommend best algorithm based on dataset"""
    try:
        analysis = await ml_engine.analyze_dataset(
            request.file_path,
            request.dataset_type
        )
        
        # Get Claude's recommendation
        recommendation = await ml_engine.get_algorithm_recommendation(
            analysis=analysis,
            dataset_type=request.dataset_type,
            task_type=request.task_type
        )
        
        return {
            "status": "success",
            "recommendation": recommendation
        }
    except Exception as e:
        logger.error(f"Error recommending algorithm: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train-model")
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start model training with user-approved algorithm"""
    try:
        experiment_id = await ml_engine.create_experiment(
            name=request.experiment_name,
            algorithm=request.algorithm,
            dataset_path=request.dataset_path,
            config=request.config
        )
        
        # Start training in background
        background_tasks.add_task(
            train_model_task,
            experiment_id,
            request
        )
        
        return {
            "status": "success",
            "experiment_id": experiment_id,
            "message": "Training started"
        }
    except Exception as e:
        logger.error(f"Error starting training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/experiments")
async def get_experiments():
    """Get all experiments"""
    try:
        experiments = await ml_engine.get_all_experiments()
        return {
            "status": "success",
            "experiments": experiments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Get specific experiment details"""
    try:
        experiment = await ml_engine.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return {
            "status": "success",
            "experiment": experiment
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str):
    """Delete an experiment permanently"""
    try:
        deleted = await ml_engine.delete_experiment(experiment_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Experiment not found")
        return {
            "status": "success",
            "message": "Experiment deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/experiments/{experiment_id}/report")
async def get_report(experiment_id: str):
    """Generate professional report for an experiment"""
    try:
        report = await ml_engine.generate_report(experiment_id)
        return {
            "status": "success",
            "report": report
        }
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/experiments/{experiment_id}/export-report")
async def export_report(experiment_id: str):
    """Export experiment report as a downloadable text file"""
    try:
        experiment = await ml_engine.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")

        report = await ml_engine.generate_report(experiment_id)
        m = experiment['metrics']
        feat_imp = m.get('feature_importance', {})
        feat_lines = ""
        for f, imp in zip(feat_imp.get('features', [])[:10], feat_imp.get('importances', [])[:10]):
            feat_lines += f"  {f}: {imp:.4f}\n"

        report_content = f"""ML-AGENT: AUTONOMOUS ML REPORT
{'='*60}
Experiment : {experiment['name']}
Algorithm  : {experiment['algorithm']}
Date       : {experiment['created_at']}
Status     : {experiment['status']}
Train Time : {experiment['training_time']}s

{'='*60}
DATASET SUMMARY
{'='*60}
Samples    : {m.get('n_samples','N/A')}
Features   : {m.get('n_features','N/A')}
Target     : {m.get('target_column','N/A')}
Task Type  : {m.get('task_type','N/A')}
Dataset Sz : {m.get('dataset_size_category','N/A')}
Validation : {m.get('validation_strategy','N/A')}
{('NOTE: ' + m['note']) if m.get('note') else ''}

{'='*60}
PERFORMANCE METRICS
{'='*60}
{json.dumps({k:v for k,v in m.items() if k not in ['feature_importance']}, indent=2)}

{'='*60}
FEATURE IMPORTANCE (Top 10)
{'='*60}
{feat_lines or 'Not available for this model type.'}

{'='*60}
EXECUTIVE SUMMARY
{'='*60}
{report.get('summary', 'N/A')}

{'='*60}
PREPROCESSING PIPELINE
{'='*60}
{report.get('preprocessing_summary', 'N/A')}

{'='*60}
KEY INSIGHTS
{'='*60}
{chr(10).join(['• ' + i for i in report.get('insights', [])])}

{'='*60}
AI RECOMMENDATION
{'='*60}
{report.get('recommendation', 'N/A')}

{'='*60}
NEXT STEPS
{'='*60}
{chr(10).join(['• ' + s for s in report.get('next_steps', [])])}
"""
        file_path = f"report_{experiment_id}.txt"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report_content)

        safe_name = "".join(c if c.isalnum() or c in ('-','_') else '_' for c in experiment['name'])
        return StreamingResponse(
            open(file_path, "rb"),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=ML-Agent_Report_{safe_name}.txt"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/experiments/{experiment_id}/export-model")
async def export_model(experiment_id: str):
    """Export trained model as a downloadable joblib file"""
    try:
        experiment = await ml_engine.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        if experiment['status'] != 'completed':
            raise HTTPException(status_code=400, detail=f"Experiment is not completed (status: {experiment['status']})")

        file_path = f"model_{experiment_id}.joblib"
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Model file not found. The model may not have been saved correctly.")

        safe_name = "".join(c if c.isalnum() or c in ('-','_') else '_' for c in experiment['name'])
        return StreamingResponse(
            open(file_path, "rb"),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=ML-Agent_{safe_name}.joblib"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/train/{experiment_id}")
async def websocket_train(websocket: WebSocket, experiment_id: str):
    """WebSocket for real-time training updates"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket)

# ============ BACKGROUND TASKS ============

async def train_model_task(experiment_id: str, request: TrainingRequest):
    """Background task for training"""
    try:
        # Notify start
        await manager.broadcast({
            "type": "training_started",
            "experiment_id": experiment_id,
            "timestamp": datetime.now().isoformat()
        })
        
        # Run training with streaming updates
        async for update in ml_engine.train_model_streaming(
            experiment_id,
            request.algorithm,
            request.dataset_path,
            request.config
        ):
            await manager.broadcast({
                "type": "training_update",
                "experiment_id": experiment_id,
                "update": update,
                "timestamp": datetime.now().isoformat()
            })
        
        # Notify completion
        result = await ml_engine.get_experiment(experiment_id)
        await manager.broadcast({
            "type": "training_completed",
            "experiment_id": experiment_id,
            "result": result,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        await manager.broadcast({
            "type": "training_error",
            "experiment_id": experiment_id,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
