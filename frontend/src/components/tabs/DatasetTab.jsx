import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, BarChart3, Loader, Sparkles, AlertCircle, CheckCircle2, ArrowRight, Database } from 'lucide-react';

function DatasetTab() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState('');
  const [datasetType, setDatasetType] = useState('tabular');
  const [taskType, setTaskType] = useState('classification');
  const [analysis, setAnalysis] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch(`${API_URL}/upload-dataset`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFile(uploadedFile);
        setFilePath(data.file_path);
        // Automatically analyze after upload
        await performAnalysis(data.file_path);
      } else {
        setError('Upload failed');
      }
    } catch (err) {
      setError('System Error during upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const performAnalysis = async (path) => {
    setLoading(true);
    setError('');
    setRecommendation(null);
    
    try {
      const response = await fetch(`${API_URL}/analyze-dataset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: path,
          dataset_type: datasetType,
          task_type: taskType
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setAnalysis(data.analysis);
        handleGetRecommendation(path);
      } else {
        setError('Analysis engine failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (err) {
      setError('System Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendation = async (path) => {
    setRecommending(true);
    try {
      const response = await fetch(`${API_URL}/recommend-algorithm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: path,
          dataset_type: datasetType,
          task_type: taskType
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setRecommendation(data.recommendation);
      }
    } catch (err) {
      console.error('Recommendation failed:', err);
    } finally {
      setRecommending(false);
    }
  };

  return (
    <div className="tab-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="content-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            padding: '0.75rem',
            borderRadius: '16px',
            color: 'white'
          }}>
            <Database size={24} />
          </div>
          <div>
            <h1 className="title" style={{ marginBottom: 0 }}>Data Laboratory</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>Ingest and analyze datasets for autonomous modeling</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* Upload Zone */}
          <div 
            onClick={() => fileInputRef.current.click()}
            style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: '24px', 
              padding: '3rem', 
              textAlign: 'center', 
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.02)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
              accept=".csv,.parquet"
            />
            {uploading ? (
              <Loader size={48} className="loader" style={{ margin: '0 auto' }} />
            ) : file ? (
              <div style={{ color: 'var(--success)' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontWeight: 600 }}>{file.name}</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Click to replace dataset</p>
              </div>
            ) : (
              <div>
                <Upload size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Drop dataset here or click to browse</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Supports CSV and Parquet formats</p>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                DATASET TYPE
              </label>
              <select
                className="btn-secondary"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
                value={datasetType}
                onChange={(e) => setDatasetType(e.target.value)}
              >
                <option value="tabular">Tabular (CSV/Parquet)</option>
                <option value="text">Natural Language (TXT/JSON)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                TASK OBJECTIVE
              </label>
              <select
                className="btn-secondary"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
              >
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
              </select>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error)' }}
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ marginTop: '2rem' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Stats Card */}
              <div className="content-card" style={{ margin: 0 }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={20} color="var(--accent-primary)" />
                  Statistical Fingerprint
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL SAMPLES</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysis.rows?.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DIMENSIONS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysis.columns}</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>NUMERIC</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysis.numeric_features?.length || 0}</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CATEGORICAL</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysis.categorical_features?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Recommendation Card */}
              <div className="content-card" style={{ margin: 0, border: '1px solid rgba(99, 102, 241, 0.3)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem' }}>
                  <Sparkles size={24} color="var(--accent-primary)" opacity={0.3} />
                </div>
                
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={20} color="var(--accent-primary)" />
                  AI Recommendation
                </h3>

                {recommending ? (
                  <div style={{ height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <div className="loader" style={{ width: '40px', height: '40px' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Groq Llama is thinking...</p>
                  </div>
                ) : recommendation ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Algorithm</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{recommendation.algorithm}</div>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      {recommendation.reasoning}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ padding: '0.4rem 0.8rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                        Confidence: {(recommendation.confidence * 100).toFixed(0)}%
                      </div>
                      <div style={{ padding: '0.4rem 0.8rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                        Expected: {recommendation.expected_performance}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>No recommendation available</p>
                  </div>
                )}
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ marginTop: '2rem', textAlign: 'center' }}
            >
              <button 
                className="btn btn-primary" 
                style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
                onClick={() => {
                  // Transition to Train Tab
                  window.dispatchEvent(new CustomEvent('changeTab', { 
                    detail: { tab: 'train', filePath, recommendation } 
                  }));
                }}
              >
                Proceed to Model Engine
                <ArrowRight size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DatasetTab;
