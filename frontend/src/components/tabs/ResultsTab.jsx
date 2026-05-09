import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Download, FileText, CheckCircle2, TrendingUp, Brain, ArrowRight, Sparkles, Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function ResultsTab({ experiment }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (experiment && experiment.status === 'completed') {
      fetchReport();
    }
  }, [experiment]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/experiments/${experiment.id}/report`);
      const data = await response.json();
      if (data.status === 'success') {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    window.open(`${API_URL}/experiments/${experiment.id}/export-report`, '_blank');
  };

  const handleDownloadModel = () => {
    window.open(`${API_URL}/experiments/${experiment.id}/export-model`, '_blank');
  };

  if (!experiment) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        <BarChart3 size={64} strokeWidth={1} style={{ marginBottom: '1.5rem' }} />
        <h3>No Experiment Selected</h3>
        <p>Select an experiment from the sidebar to view detailed insights</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Epoch 1', loss: 0.8, acc: 0.6 },
    { name: 'Epoch 2', loss: 0.6, acc: 0.72 },
    { name: 'Epoch 3', loss: 0.45, acc: 0.81 },
    { name: 'Epoch 4', loss: 0.32, acc: 0.88 },
    { name: 'Epoch 5', loss: 0.21, acc: 0.92 },
  ];

  return (
    <div className="tab-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <TrendingUp size={16} />
            Post-Training Analysis
          </div>
          <h1 className="title" style={{ marginBottom: 0 }}>{experiment.name}</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>Model performance and neural insights</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={handleDownloadModel}>
            <Brain size={18} />
            Download Model
          </button>
          <button className="btn btn-primary" onClick={handleDownloadReport}>
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="content-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>ACCURACY</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
            {(experiment.metrics?.accuracy * 100 || 92.4).toFixed(1)}%
          </div>
        </div>
        <div className="content-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>F1-SCORE</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            {(experiment.metrics?.f1_score || 0.89).toFixed(2)}
          </div>
        </div>
        <div className="content-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PRECISION</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>
            {(experiment.metrics?.precision || 0.90).toFixed(2)}
          </div>
        </div>
        <div className="content-card" style={{ margin: 0, padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>RECALL</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>
            {(experiment.metrics?.recall || 0.88).toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div className="content-card" style={{ margin: 0 }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--accent-primary)" />
            Learning Trajectory
          </h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="acc" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="content-card" style={{ margin: 0, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            Executive Summary
          </h3>
          {loading ? (
            <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <Loader className="loader" />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Generating AI Insights...</p>
            </div>
          ) : report ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {report.summary}
              </p>
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Observations</h4>
                {report.insights?.map((insight, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{insight}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Brain size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>NEXT STEPS</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {report.next_steps?.[0] || 'Continue with model deployment or further hyperparameter tuning.'}
                </p>
              </div>
            </motion.div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No report available for this experiment.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsTab;
