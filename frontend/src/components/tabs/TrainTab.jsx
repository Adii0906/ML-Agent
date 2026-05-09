import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, XCircle, Loader, Play, Sparkles, Settings, BarChart3, ArrowRight, BrainCircuit, FileType } from 'lucide-react';

function TrainTab({ fetchExperiments, sharedData }) {
  const [step, setStep] = useState(1); // 1: Setup, 2: Recommendation, 3: Training
  const [filePath, setFilePath] = useState(sharedData?.filePath || '');
  const [datasetType, setDatasetType] = useState('tabular');
  const [taskType, setTaskType] = useState('classification');
  const [experimentName, setExperimentName] = useState('');
  const [recommendation, setRecommendation] = useState(sharedData?.recommendation || null);
  const [isManual, setIsManual] = useState(false);
  const [manualAlgorithm, setManualAlgorithm] = useState('Random Forest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trainingStatus, setTrainingStatus] = useState('idle'); // idle, training, completed, failed
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingMetrics, setTrainingMetrics] = useState({});
  const [currentStage, setCurrentStage] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const WS_URL = API_URL.replace('http', 'ws');

  useEffect(() => {
    if (sharedData?.filePath) setFilePath(sharedData.filePath);
    if (sharedData?.recommendation) {
        setRecommendation(sharedData.recommendation);
        setStep(2);
    }
  }, [sharedData]);

  const handleInitialize = async (e) => {
    e.preventDefault();
    if (!filePath.trim() || !experimentName.trim()) {
      setError('Experiment name and data path are required');
      return;
    }

    setLoading(true);
    setError('');
    
    if (isManual) {
      setRecommendation({
        algorithm: manualAlgorithm,
        reasoning: "User selected algorithm manually via System Control.",
        confidence: 1.0,
        hyperparameters: {},
        expected_performance: "Based on manual selection",
        pros: ["Direct control", "User preference"],
        cons: ["May not be optimal for data"]
      });
      setStep(2);
      setLoading(false);
    } else {
      try {
        const response = await fetch(`${API_URL}/recommend-algorithm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: filePath,
            dataset_type: datasetType,
            task_type: taskType
          })
        });
        const data = await response.json();
        if (data.status === 'success') {
          setRecommendation(data.recommendation);
          setStep(2);
        } else {
          setError('AI Engine failed to provide recommendation');
        }
      } catch (err) {
        setError('Connection error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const startTraining = async () => {
    setStep(3);
    setTrainingStatus('training');
    
    try {
      const response = await fetch(`${API_URL}/train-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment_name: experimentName,
          algorithm: recommendation.algorithm,
          dataset_path: filePath,
          config: {
            dataset_type: datasetType,
            task_type: taskType
          },
          hyperparameters: recommendation.hyperparameters
        })
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        const experimentId = data.experiment_id;
        
        // Connect to WebSocket for real-time updates
        const ws = new WebSocket(`${WS_URL}/ws/train/${experimentId}`);
        
        ws.onmessage = (event) => {
          const update = JSON.parse(event.data);
          if (update.type === 'training_update') {
            const info = update.update;
            setCurrentStage(info.message);
            if (info.progress !== undefined) setTrainingProgress(info.progress);
            if (info.metrics) setTrainingMetrics(info.metrics);
          } else if (update.type === 'training_completed') {
            setTrainingStatus('completed');
            setTrainingProgress(100);
            fetchExperiments();
            // In a real app, we might want to auto-navigate or show a success toast
          } else if (update.type === 'training_error') {
            setTrainingStatus('failed');
            setError(update.error);
            ws.close();
          }
        };
      }
    } catch (err) {
      setTrainingStatus('failed');
      setError('Training initialization failed: ' + err.message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <div className="tab-container">
      <AnimatePresence mode="wait">
        {/* Step 1: Configuration */}
        {step === 1 && (
          <motion.div 
            key="step1"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="content-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                padding: '0.75rem',
                borderRadius: '16px',
                color: 'white'
              }}>
                <Zap size={24} />
              </div>
              <div>
                <h1 className="title" style={{ marginBottom: 0 }}>Model Engine</h1>
                <p className="subtitle" style={{ marginBottom: 0 }}>Configure and initialize your neural architecture</p>
              </div>
            </div>

            <form onSubmit={handleInitialize} style={{ display: 'grid', gap: '1.5rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                  EXPERIMENT IDENTIFIER
                </label>
                <input
                  type="text"
                  className="btn-secondary"
                  style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'white', backgroundColor: 'var(--bg-tertiary)' }}
                  placeholder="e.g. NeuralNet-v1-Alpha"
                  value={experimentName}
                  onChange={(e) => setExperimentName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                  DATA SOURCE PATH
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        className="btn-secondary"
                        readOnly
                        style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', color: filePath ? 'white' : 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)', opacity: 0.8 }}
                        placeholder="Upload a dataset in the Data Lab first"
                        value={filePath}
                    />
                    {filePath && <div style={{ display: 'flex', alignItems: 'center', color: 'var(--success)' }}><CheckCircle2 size={20} /></div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                    <BrainCircuit size={14} />
                    Intelligence Protocol
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                    <button 
                      type="button"
                      onClick={() => setIsManual(false)}
                      style={{ 
                        flex: 1, 
                        padding: '0.6rem', 
                        borderRadius: '10px', 
                        border: 'none', 
                        backgroundColor: !isManual ? 'var(--accent-primary)' : 'transparent', 
                        color: 'white', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        cursor: 'pointer', 
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: !isManual ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                      }}
                    >
                      AI Recommended
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsManual(true)}
                      style={{ 
                        flex: 1, 
                        padding: '0.6rem', 
                        borderRadius: '10px', 
                        border: 'none', 
                        backgroundColor: isManual ? 'var(--accent-primary)' : 'transparent', 
                        color: 'white', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        cursor: 'pointer', 
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isManual ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                      }}
                    >
                      Manual Select
                    </button>
                  </div>
                </div>

                <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block', textTransform: 'uppercase' }}>
                      {isManual ? 'Target Algorithm' : 'Task Type'}
                    </label>
                    <select
                        className="btn-secondary"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'white', border: '1px solid var(--border-color)', outline: 'none' }}
                        value={isManual ? manualAlgorithm : taskType}
                        onChange={(e) => isManual ? setManualAlgorithm(e.target.value) : setTaskType(e.target.value)}
                    >
                        {isManual ? (
                          <>
                            <option>Random Forest</option>
                            <option>Gradient Boosting</option>
                            <option>Logistic Regression</option>
                            <option>XGBoost</option>
                            <option>Neural Network</option>
                          </>
                        ) : (
                          <>
                            <option value="classification">Classification</option>
                            <option value="regression">Regression</option>
                          </>
                        )}
                    </select>
                </div>
              </div>

              <motion.button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !filePath}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ width: '100%', justifyContent: 'center', padding: '1rem', marginTop: '1rem', opacity: !filePath ? 0.5 : 1 }}
              >
                {loading ? <Loader size={20} className="loader" /> : <Play size={20} />}
                {loading ? 'Consulting Neural Engine...' : 'Initialize Pipeline'}
              </motion.button>
              {!filePath && <p style={{ fontSize: '0.75rem', color: 'var(--error)', textAlign: 'center' }}>* Please upload a dataset in the Data Lab to begin</p>}
            </form>
          </motion.div>
        )}

        {/* Step 2: AI Recommendation Review */}
        {step === 2 && recommendation && (
          <motion.div 
            key="step2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="content-card"
            style={{ border: '1px solid var(--accent-primary)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <Sparkles size={16} />
                  Architectural Proposal
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{recommendation.algorithm}</h2>
              </div>
              <div style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '12px', fontWeight: 700 }}>
                {(recommendation.confidence * 100).toFixed(0)}% Confidence
              </div>
            </div>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              {recommendation.reasoning}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '1rem' }}>
                  <CheckCircle2 size={18} />
                  Advantages
                </h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {recommendation.pros?.map((pro, i) => (
                    <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--success)', marginTop: 8 }} />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', marginBottom: '1rem' }}>
                  <XCircle size={18} />
                  Limitations
                </h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {recommendation.cons?.map((con, i) => (
                    <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--error)', marginTop: 8 }} />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '1rem' }}
                onClick={() => setStep(1)}
              >
                Refigure Parameters
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '1rem' }}
                onClick={startTraining}
              >
                Execute Pipeline
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Training Progress */}
        {step === 3 && (
          <motion.div 
            key="step3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="content-card"
          >
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 1.5rem' }}>
                <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="8"
                    strokeDasharray="339.29"
                    animate={{ strokeDashoffset: 339.29 - (339.29 * trainingProgress) / 100 }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem', fontWeight: 800 }}>
                  {Math.floor(trainingProgress)}%
                </div>
              </div>
              <h2 className="title" style={{ marginBottom: '0.5rem' }}>
                {trainingStatus === 'completed' ? 'Neural Training Complete' : 'Optimizing Model'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                {currentStage || 'Initializing neural buffers...'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>METRIC A</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{trainingMetrics.accuracy ? (trainingMetrics.accuracy * 100).toFixed(1) + '%' : trainingMetrics.mse ? trainingMetrics.mse.toFixed(4) : '--'}</div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>METRIC B</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {trainingMetrics.f1_score ? trainingMetrics.f1_score.toFixed(3) : trainingMetrics.r2_score ? trainingMetrics.r2_score.toFixed(3) : '--'}
                </div>
              </div>
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>STATUS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: trainingStatus === 'completed' ? 'var(--success)' : 'var(--warning)', textTransform: 'uppercase' }}>
                  {trainingStatus}
                </div>
              </div>
            </div>

            {trainingStatus === 'completed' && (
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem' }}
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'results' }))}
              >
                View Professional Report
                <BarChart3 size={20} />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TrainTab;
