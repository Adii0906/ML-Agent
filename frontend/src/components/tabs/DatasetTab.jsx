import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Database, Table, AlertCircle, CheckCircle2, ArrowRight, Sparkles, Loader, RefreshCw } from 'lucide-react';

function DatasetTab() {
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState('');
  const [datasetType, setDatasetType] = useState('tabular');
  const [taskType, setTaskType] = useState('classification');
  const [analysis, setAnalysis] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [datasetPreview, setDatasetPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setUploading(true);
    setError('');
    setAnalysis(null);
    setRecommendation(null);
    setDatasetPreview(null);
    
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
        // Automatically load preview and analyze
        await loadDatasetPreview(data.file_path);
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

  const loadDatasetPreview = async (path) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`${API_URL}/get-dataset-preview?file_path=${encodeURIComponent(path)}&rows=30`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setDatasetPreview(data);
      }
    } catch (err) {
      console.error('Failed to load dataset preview:', err);
    } finally {
      setPreviewLoading(false);
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

  const proceedToTraining = () => {
    window.dispatchEvent(new CustomEvent('changeTab', {
      detail: {
        tab: 'train',
        dataset_path: filePath,
        dataset_name: file?.name,
        analysis: analysis,
        recommendation: recommendation
      }
    }));
  };

  return (
    <div className="tab-container" style={{ paddingBottom: '2rem' }}>
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="content-card"
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            padding: '0.75rem',
            borderRadius: '16px',
            color: 'white'
          }}>
            <Database size={28} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 className="title" style={{ marginBottom: '0.25rem', fontSize: '1.75rem' }}>Data Laboratory</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>Upload, explore, and analyze your dataset before modeling</p>
          </div>
        </div>

        {/* Upload Area */}
        <div style={{
          border: '2px dashed var(--border-color)',
          borderRadius: '20px',
          padding: '2.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: file ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
          borderColor: file ? 'var(--accent-primary)' : 'var(--border-color)',
          transition: 'all 0.3s ease'
        }} onClick={() => fileInputRef.current?.click()}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv,.parquet"
            style={{ display: 'none' }}
          />
          
          {uploading ? (
            <div>
              <Loader size={48} style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Uploading...</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Please wait while we process your file</div>
            </div>
          ) : file ? (
            <div>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: '#10b981' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{file.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click to upload a different file</div>
            </div>
          ) : (
            <div>
              <Upload size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Drop your dataset here</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Supports CSV and Parquet files</div>
            </div>
          )}
        </div>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} color="#ef4444" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.2rem' }}>Oops!</div>
            <div style={{ fontSize: '0.9rem' }}>{error}</div>
          </div>
        </motion.div>
      )}

      {/* Dataset Preview Table */}
      {datasetPreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="content-card"
          style={{ marginBottom: '1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Table size={20} color="var(--accent-primary)" />
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Dataset Preview</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  {datasetPreview.columns.length} features • {datasetPreview.total_rows}+ samples
                </p>
              </div>
            </div>
            {previewLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} className="loader" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Refreshing...</span>
              </div>
            )}
          </div>

          <div style={{ 
            overflowX: 'auto',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: '800px'
            }}>
              <thead style={{ 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                borderBottom: '2px solid var(--border-color)'
              }}>
                <tr>
                  {datasetPreview.columns.map((col) => (
                    <th key={col} style={{
                      padding: '0.85rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      borderRight: '1px solid var(--border-color)',
                      whiteSpace: 'nowrap'
                    }}>
                      <div>{col}</div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: 'var(--text-tertiary)',
                        fontWeight: 400,
                        marginTop: '0.15rem'
                      }}>
                        {datasetPreview.dtypes[col]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datasetPreview.data.map((row, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                  }}>
                    {datasetPreview.columns.map((col) => (
                      <td key={col} style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.03)',
                        whiteSpace: 'nowrap'
                      }}>
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                          <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {datasetPreview.total_rows > 30 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '0.75rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-tertiary)' 
            }}>
              Showing first 30 rows of {datasetPreview.total_rows.toLocaleString()} total samples
            </div>
          )}
        </motion.div>
      )}

      {/* Analysis & Recommendation */}
      {(analysis || recommendation) && (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Analysis Card */}
          {analysis && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="content-card"
              style={{ margin: 0 }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} color="var(--accent-primary)" />
                Quick Stats
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem', 
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Samples</span>
                  <span style={{ fontWeight: 700 }}>{analysis.n_samples?.toLocaleString() || 'N/A'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem', 
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Features</span>
                  <span style={{ fontWeight: 700 }}>{analysis.n_features || 'N/A'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem', 
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Numeric Cols</span>
                  <span style={{ fontWeight: 700 }}>{analysis.numeric_columns || 'N/A'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem', 
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.03)'
                }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Missing Values</span>
                  <span style={{ 
                    fontWeight: 700, 
                    color: (analysis.missing_values || 0) > 0 ? '#f59e0b' : '#10b981'
                  }}>
                    {analysis.missing_values || 0}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recommendation Card */}
          {recommendation && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="content-card"
              style={{ 
                margin: 0, 
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.02))'
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#f59e0b" />
                AI Recommendation
              </h2>
              
              {recommending ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader size={32} className="loader" style={{ marginBottom: '0.75rem' }} />
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Thinking...</div>
                </div>
              ) : (
                <>
                  <div style={{ 
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    color: 'white',
                    marginBottom: '1rem',
                    fontWeight: 700
                  }}>
                    {recommendation.algorithm || 'Random Forest'}
                  </div>
                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-secondary)', 
                    lineHeight: 1.6,
                    marginBottom: '1.25rem'
                  }}>
                    {recommendation.reasoning || 'This algorithm is well-suited for your dataset characteristics.'}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={proceedToTraining}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    Proceed to Model Engine
                    <ArrowRight size={18} />
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

export default DatasetTab;
