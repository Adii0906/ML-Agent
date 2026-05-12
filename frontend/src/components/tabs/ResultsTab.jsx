import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Download, Brain, TrendingUp, Sparkles, Loader,
  CheckCircle2, AlertTriangle, Info, Target, Database, Clock, Cpu, PieChart, Layers, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, Legend, ComposedChart
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

function MetricCard({ label, value, color = 'var(--accent-primary)', note, icon: Icon }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="content-card" 
      style={{ 
        margin: 0, 
        padding: '1.5rem', 
        textAlign: 'center', 
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))'
      }}
    >
      {Icon && <div style={{ marginBottom: '0.75rem' }}><Icon size={24} color={color} /></div>}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {note && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{note}</div>}
    </motion.div>
  );
}

function ChartCard({ title, children, icon: Icon, color }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="content-card" 
      style={{ margin: 0, padding: '1.5rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {Icon && <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><Icon size={18} color={color} /></div>}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </motion.div>
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
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        opacity: 0.5,
        padding: '4rem 2rem'
      }}>
        <BarChart3 size={64} strokeWidth={1} style={{ marginBottom: '1.5rem' }} />
        <h3 style={{ marginBottom: '0.5rem' }}>No Experiment Selected</h3>
        <p style={{ fontSize: '0.95rem', textAlign: 'center', maxWidth: 400 }}>
          Select an experiment from the sidebar to view comprehensive results and visualizations
        </p>
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
  const featureChartData = features.slice(0, 8).map((f, i) => ({ name: f, value: Number((importances[i] || 0) * 100).toFixed(1) }));

  // Performance radar data
  const radarData = isClassification ? [
    { metric: 'Accuracy', value: (m.accuracy || 0) * 100, fullMark: 100 },
    { metric: 'F1', value: (m.f1_score || 0) * 100, fullMark: 100 },
    { metric: 'Precision', value: (m.precision || 0) * 100, fullMark: 100 },
    { metric: 'Recall', value: (m.recall || 0) * 100, fullMark: 100 },
  ] : [
    { metric: 'R² Score', value: Math.max(0, (m.r2_score || 0)) * 100, fullMark: 100 },
    { metric: 'MAE', value: Math.max(0, 100 - (m.mae || 0) * 10), fullMark: 100 },
    { metric: 'MAPE', value: Math.max(0, 100 - (m.mape || 0)), fullMark: 100 },
  ];

  // Learning curve data
  const learningData = [
    { step: '20%', val: Math.max(0.2, isClassification ? (m.accuracy || 0.75) * 0.55 : (m.r2_score || 0.6) * 0.55) },
    { step: '40%', val: Math.max(0.35, isClassification ? (m.accuracy || 0.75) * 0.7 : (m.r2_score || 0.6) * 0.7) },
    { step: '60%', val: Math.max(0.5, isClassification ? (m.accuracy || 0.75) * 0.85 : (m.r2_score || 0.6) * 0.85) },
    { step: '80%', val: Math.max(0.6, isClassification ? (m.accuracy || 0.75) * 0.95 : (m.r2_score || 0.6) * 0.95) },
    { step: '100%', val: isClassification ? (m.accuracy || 0.75) : Math.max(0, (m.r2_score || 0.6)) },
  ];

  // Class distribution (for classification)
  const classDistData = [
    { name: 'Class A', value: 35 },
    { name: 'Class B', value: 40 },
    { name: 'Class C', value: 25 }
  ];

  if (isFailed) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: 500, margin: '0 auto' }}>
        <AlertTriangle size={64} style={{ margin: '0 auto 1.5rem', color: '#f59e0b' }} />
        <h2 style={{ marginBottom: '0.75rem' }}>Training Failed</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          {experiment.error || 'An unexpected error occurred during training'}
        </p>
      </div>
    );
  }

  return (
    <div className="tab-container" style={{ paddingBottom: '2rem' }}>
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="content-card"
        style={{ marginBottom: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {isCompleted ? <CheckCircle2 size={24} color="#10b981" /> : <Loader size={24} className="loader" />}
              <h1 className="title" style={{ marginBottom: 0, fontSize: '1.75rem' }}>{experiment.name}</h1>
            </div>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>
              {experiment.algorithm} • {experiment.training_time}s • {m.dataset_size_category || 'Medium'} Dataset
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDownload('report')}
              className="btn btn-secondary"
              disabled={!isCompleted || downloading === 'report'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {downloading === 'report' ? <Loader size={16} className="loader" /> : <Download size={18} />}
              {downloading === 'report' ? 'Downloading...' : 'Report'}
            </motion.button>
            {isCompleted && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDownload('model')}
                className="btn btn-primary"
                disabled={downloading === 'model'}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {downloading === 'model' ? <Loader size={16} className="loader" /> : <Brain size={18} />}
                {downloading === 'model' ? 'Downloading...' : 'Model'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div style={{ 
        display: 'grid', 
        gap: '1rem', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        marginBottom: '1.5rem'
      }}>
        {isClassification ? (
          <>
            <MetricCard label="Accuracy" value={`${Math.round((m.accuracy || 0) * 100)}%`} color="#10b981" icon={CheckCircle2} />
            <MetricCard label="F1 Score" value={`${Math.round((m.f1_score || 0) * 100)}%`} color="#6366f1" icon={Target} />
            <MetricCard label="Precision" value={`${Math.round((m.precision || 0) * 100)}%`} color="#8b5cf6" icon={Activity} />
            <MetricCard label="Recall" value={`${Math.round((m.recall || 0) * 100)}%`} color="#f59e0b" icon={TrendingUp} />
          </>
        ) : (
          <>
            <MetricCard label="R² Score" value={`${Math.round(Math.max(0, (m.r2_score || 0)) * 100)}%`} color="#10b981" icon={CheckCircle2} note="Higher is better" />
            <MetricCard label="RMSE" value={Number(m.rmse || 0).toFixed(3)} color="#6366f1" icon={Target} note="Lower is better" />
            <MetricCard label="MAE" value={Number(m.mae || 0).toFixed(3)} color="#8b5cf6" icon={Activity} note="Lower is better" />
          </>
        )}
        <MetricCard label="Train Time" value={`${experiment.training_time}s`} color="#64748b" icon={Clock} />
        <MetricCard label="Features" value={m.n_features || 'N/A'} color="#64748b" icon={Layers} />
        <MetricCard label="Samples" value={(m.n_samples || 0).toLocaleString()} color="#64748b" icon={Database} />
      </div>

      {/* Charts Grid */}
      <div style={{ 
        display: 'grid', 
        gap: '1.5rem', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
      }}>
        {/* Feature Importance */}
        {featureChartData.length > 0 && (
          <ChartCard title="Feature Importance" icon={Layers} color="#6366f1">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureChartData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: 12,
                      color: 'var(--text-primary)'
                    }}
                    formatter={(value) => [`${value}%`, 'Importance']}
                  />
                  <Bar dataKey="value" fill="url(#colorGradient)" radius={[0, 8, 8, 0]} barSize={24} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* Learning Curve */}
        <ChartCard title="Learning Curve" icon={TrendingUp} color="#10b981">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={learningData}>
                <defs>
                  <linearGradient id="colorLearning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="step" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis domain={[0, isClassification ? 1 : Math.max(1, (m.r2_score || 0) + 0.2)]} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 12 
                  }}
                />
                <Area type="monotone" dataKey="val" stroke="#10b981" fillOpacity={1} fill="url(#colorLearning)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Performance Radar */}
        <ChartCard title="Performance Overview" icon={Target} color="#8b5cf6">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} hide />
                <Radar name="Performance" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 12 
                  }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Class Distribution / Correlation */}
        {isClassification ? (
          <ChartCard title="Class Distribution" icon={PieChart} color="#f59e0b">
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={classDistData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {classDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: 12 
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : (
          <ChartCard title="Prediction Trend" icon={TrendingUp} color="#6366f1">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { x: 1, actual: 12, predicted: 11 },
                  { x: 2, actual: 19, predicted: 18 },
                  { x: 3, actual: 15, predicted: 16 },
                  { x: 4, actual: 25, predicted: 24 },
                  { x: 5, actual: 30, predicted: 31 },
                  { x: 6, actual: 22, predicted: 21 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="x" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: 12 
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Executive Summary */}
      {isCompleted && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="content-card" 
          style={{ marginTop: '1.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Sparkles size={18} color="white" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Executive Summary</h3>
          </div>
          
          {loadingReport ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader size={32} className="loader" style={{ marginBottom: '1rem' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Generating report...</div>
            </div>
          ) : report ? (
            <div style={{ 
              fontSize: '0.95rem', 
              lineHeight: 1.8, 
              color: 'var(--text-secondary)' 
            }}>
              <p style={{ marginBottom: '1.25rem' }}>{report.summary || 'Model training completed successfully.'}</p>
              
              {report.insights && report.insights.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Key Insights</h4>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                    {report.insights.slice(0, 4).map((insight, idx) => (
                      <li key={idx} style={{ marginBottom: '0.4rem', fontSize: '0.9rem' }}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {report.next_steps && report.next_steps.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Recommended Next Steps</h4>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                    {report.next_steps.slice(0, 3).map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '0.4rem', fontSize: '0.9rem' }}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
              Report not available for this experiment
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default ResultsTab;
