from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from enum import Enum

class DatasetType(str, Enum):
    TABULAR = "tabular"
    IMAGE = "image"
    TEXT = "text"
    TIMESERIES = "timeseries"

class TaskType(str, Enum):
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    ANOMALY_DETECTION = "anomaly_detection"

class DatasetRequest(BaseModel):
    file_path: str
    dataset_type: DatasetType
    task_type: TaskType
    target_column: Optional[str] = None

class AlgorithmRecommendation(BaseModel):
    algorithm: str
    confidence: float
    reasoning: str
    hyperparameters: Dict[str, Any]
    expected_performance: str
    pros: List[str]
    cons: List[str]

class TrainingRequest(BaseModel):
    experiment_name: str
    algorithm: str
    dataset_path: str
    config: Dict[str, Any]
    hyperparameters: Optional[Dict[str, Any]] = None
    validation_split: float = 0.2
    random_state: int = 42

class ExperimentResult(BaseModel):
    experiment_id: str
    name: str
    algorithm: str
    status: str
    metrics: Dict[str, float]
    training_time: float
    created_at: str
    completed_at: Optional[str] = None
    model_path: Optional[str] = None

class PaperSummary(BaseModel):
    title: str
    authors: str
    published: str
    summary: str
    pdf_url: str
    relevance_score: float

class DatasetAnalysis(BaseModel):
    rows: int
    columns: int
    data_types: Dict[str, str]
    missing_values: Dict[str, int]
    numeric_stats: Dict[str, Dict[str, float]]
    categorical_features: List[str]
    numeric_features: List[str]
    class_distribution: Optional[Dict[str, int]] = None
    recommendations: List[str]