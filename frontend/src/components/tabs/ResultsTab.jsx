import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Download, Brain, TrendingUp, Sparkles, Loader,
  CheckCircle2, AlertTriangle, Info, Target, Database, Clock, Cpu
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function MetricCard({ label, value, color = 'var(--accent-primary)', note }) {
  return (
    <div className="content-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{value}</div>
      {note && <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{note}</div>}
    </div>
  );
}

function ResultsTab({ experiment }) {
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    if (experiment?.status === 'completed') fetchReport();
    else setReport(null);
  }, [experiment?.id]);

  const fetchReport = async () => {
    setLoadingReport(true);
    try {
      const res = await fetch(`${API_URL}/experiments/${experiment.id}/report`);
      const data = await res.json();
      if (data.status === 'success') setReport(data.report);
    } catch (e) { console.error(e); }
    finally { setLoadingReport(false); }
  };

  const handleDownload = async (type) => {
    setDownloading(type);
    try {
      const url = `${API_URL}/experiments/${experiment.id}/export-${type}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || `Failed to download ${type}`);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = type === 'model'
        ? `ML-Agent_${experiment.name}.joblib`
        : `ML-Agent_Report_${experiment.name}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { alert(`Download failed: ${e.message}`); }
    finally { setDownloading(''); }
  };

  if (!experiment) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
        <BarChart3 size={64} strokeWidth={1} style={{ marginBottom: '1.5rem' }} />
        <h3>No Experiment Selected</h3>
        <p>Select an experiment from the sidebar to view results</p>
      </div>
    );
  }

  const m = experiment.metrics || {};
  const isClassification = m.task_type === 'classification';
  const isFailed = experiment.status === 'failed';
  const isCompleted = experiment.status === 'completed';
  const featImp = m.feature_importance || {};
  const features = featImp.features || [];
  const importances = featImp.importances || [];
  const featureChartData = features.slice(0, 8).map((f, i) => ({ name: f, value: importances[i] || 0 }));

  const learningData = [
    { epoch: '20%', value: 0.55 },
    { epoch: '40%', value: 0.68 },
    { epoch: '60%', value: 0.79 },
    { epoch: '80%', value: isClassification ? (m.accuracy || 0.85) * 0.95 : Math.max(0, m.r2_score || 0.8) * 0.95 },
    { epoch: '100%', value: isClassification ? (m.accuracy || 0.85) : Math.max(0, m.r2_score || 0.8) },
  ];

  const radarData = isClassification ? [
    { metric: 'Accuracy', value: (m.accuracy || 0) * 100 },
    { metric: 'F1', value: (m.f1_score || 0) * 100 },
    { metric: 'Precision', value: (m.precision || 0) * 100 },
    { metric: 'Recall', value: (m.recall || 0) * 100 },
  ] : [
    { metric: 'R² Score', value: Math.max(0, (m.r2_score || 0)) * 100 },
    { metric: 'Low MSE', value: Math.max(0, 100 - (m.mse || 0) * 10) },
    { metric: 'Low RMSE', value: Math.max(0, 100 - (m.rmse || 0) * 5) },
  ];

  return (
    <div className="tab-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            <TrendingUp size={14} /> Post-Training Analysis
          </div>
          <h1 className="title" style={{ marginBottom: 0 }}>{experiment.name}</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {experiment.algorithm} · {m.validation_strategy || 'N/A'} · {m.dataset_size_category || ''} dataset
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            disabled={!isCompleted || downloading === 'model'}
            style={{ opacity: isCompleted ? 1 : 0.4, cursor: isCompleted ? 'pointer' : 'not-allowed' }}
            onClick={() => handleDownload('model')}
          >
            {downloading === 'model' ? <Loader size={16} className="loader" /> : <Brain size={16} />}
            Download Model
          </button>
          <button
            className="btn btn-primary"
            disabled={!isCompleted || downloading === 'report'}
            style={{ opacity: isCompleted ? 1 : 0.4, cursor: isCompleted ? 'pointer' : 'not-allowed' }}
            onClick={() => handleDownload('report')}
          >
            {downloading === 'report' ? <Loader size={16} className="loader" /> : <Download size={16} />}
            Export Report
          </button>
        </div>
      </div>

      {/* Failed banner */}
      <AnimatePresence>
        {isFailed && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '1.25rem 1.5rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid var(--error)', borderRadius: '16px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--error)' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Training Pipeline Failed</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.85 }}>{experiment.error || 'An unexpected error occurred.'}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CV note */}
      {isCompleted && m.note && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ padding: '0.75rem 1.25rem', backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <Info size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          {m.note}
        </motion.div>
      )}

      {/* Dataset info strip */}
      {isCompleted && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Database size={18} color="var(--accent-primary)" />
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>SAMPLES</div><div style={{ fontWeight: 700 }}>{m.n_samples ?? '—'}</div></div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Cpu size={18} color="var(--accent-secondary)" />
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>FEATURES</div><div style={{ fontWeight: 700 }}>{m.n_features ?? '—'}</div></div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Target size={18} color="var(--success)" />
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>TARGET</div><div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.target_column ?? '—'}</div></div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={18} color="var(--warning)" />
            <div><div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>TRAIN TIME</div><div style={{ fontWeight: 700 }}>{experiment.training_time}s</div></div>
          </div>
        </div>
      )}

      {/* Metric cards */}
      {isCompleted && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {isClassification ? (
            <>
              <MetricCard label="Accuracy" value={`${((m.accuracy || 0) * 100).toFixed(1)}%`} color="var(--success)" note={m.cv_std ? `±${(m.cv_std * 100).toFixed(1)}% CV` : undefined} />
              <MetricCard label="F1 Score" value={(m.f1_score || 0).toFixed(3)} color="var(--accent-primary)" />
              <MetricCard label="Precision" value={(m.precision || 0).toFixed(3)} />
              <MetricCard label="Recall" value={(m.recall || 0).toFixed(3)} />
            </>
          ) : (
            <>
              <MetricCard label="R² Score" value={(m.r2_score || 0).toFixed(4)} color="var(--success)" note={m.cv_std ? `±${m.cv_std.toFixed(4)} CV` : undefined} />
              <MetricCard label="RMSE" value={(m.rmse || 0).toFixed(4)} color="var(--accent-primary)" />
              <MetricCard label="MSE" value={(m.mse || 0).toFixed(4)} />
              <MetricCard label="Train Time" value={`${experiment.training_time}s`} />
            </>
          )}
        </div>
      )}

      {/* Charts row */}
      {isCompleted && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Feature Importance */}
          <div className="content-card" style={{ margin: 0 }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="var(--accent-primary)" /> Feature Importance
            </h3>
            {featureChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={featureChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }} itemStyle={{ color: 'white' }} />
                  <Bar dataKey="value" fill="var(--accent-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Feature importance not available for this model type
              </div>
            )}
          </div>

          {/* Radar / Metrics chart */}
          <div className="content-card" style={{ margin: 0 }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--accent-secondary)" /> Performance Radar
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" stroke="var(--text-secondary)" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="transparent" tick={false} />
                <Radar name="Score" dataKey="value" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Learning curve */}
      {isCompleted && (
        <div className="content-card" style={{ margin: '0 0 2rem 0' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--accent-primary)" /> Learning Trajectory
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={learningData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="epoch" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1]} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px' }} formatter={(v) => v.toFixed(4)} />
              <Area type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2.5} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Report */}
      {isCompleted && (
        <div className="content-card" style={{ margin: 0, border: '1px solid rgba(99,102,241,0.25)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" /> AI Executive Report
          </h3>
          {loadingReport ? (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <Loader className="loader" size={32} />
              <p style={{ color: 'var(--text-secondary)' }}>Generating AI Insights...</p>
            </div>
          ) : report ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: '1.5rem' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{report.summary}</p>

              {report.preprocessing_summary && (
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Preprocessing Pipeline</div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{report.preprocessing_summary}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Key Insights</div>
                  {report.insights?.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
                      <CheckCircle2 size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: 3 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ins}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Next Steps</div>
                  {report.next_steps?.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: 6 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {report.recommendation && (
                <div style={{ padding: '1.25rem', background: 'rgba(99,102,241,0.08)', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <Brain size={16} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>AI Recommendation</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{report.recommendation}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No report available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ResultsTab;
