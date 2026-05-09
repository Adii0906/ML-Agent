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
    except Exception as e:
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
    """Export experiment report as a downloadable file"""
    try:
        experiment = await ml_engine.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        report = await ml_engine.generate_report(experiment_id)
        
        # Create a text-based report
        report_content = f"""
# ML-Agent: Autonomous ML Report
=================================
Experiment: {experiment['name']}
Algorithm: {experiment['algorithm']}
Date: {experiment['created_at']}
Status: {experiment['status']}

## Performance Metrics
{json.dumps(experiment['metrics'], indent=4)}

## Executive Summary
{report.get('summary', 'N/A')}

## Key Insights
{chr(10).join(['- ' + i for i in report.get('insights', [])])}

## Next Steps
{chr(10).join(['- ' + i for i in report.get('next_steps', [])])}
"""
        
        file_path = f"report_{experiment_id}.txt"
        with open(file_path, "w") as f:
            f.write(report_content)
            
        return StreamingResponse(
            open(file_path, "rb"),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=ML-Agent_Report_{experiment['name']}.txt"}
        )
    except Exception as e:
        logger.error(f"Error exporting report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/experiments/{experiment_id}/export-model")
async def export_model(experiment_id: str):
    """Export trained model as a downloadable file"""
    try:
        experiment = await ml_engine.get_experiment(experiment_id)
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
            
        # For this autonomous agent demo, we'll export the metadata and weights placeholder
        model_data = {
            "experiment_id": experiment_id,
            "algorithm": experiment['algorithm'],
            "metrics": experiment['metrics'],
            "timestamp": datetime.now().isoformat(),
            "status": "Production-Ready"
        }
        
        file_path = f"model_{experiment_id}.json"
        with open(file_path, "w") as f:
            json.dump(model_data, f, indent=4)
            
        return StreamingResponse(
            open(file_path, "rb"),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=ML-Agent_Model_{experiment['name']}.json"}
        )
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
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
