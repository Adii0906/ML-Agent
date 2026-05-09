import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Cpu, Database, Globe, ShieldCheck, Save, RefreshCcw } from 'lucide-react';

function ConfigTab() {
  const [config, setConfig] = useState({
    groq_model: 'llama-3.3-70b-versatile',
    use_ollama: false,
    ollama_url: 'http://localhost:11434',
    max_workers: 4,
    gpu_enabled: false,
    auto_train: true,
    data_retention: '30 days',
    api_endpoint: 'http://localhost:8000'
  });

  const handleSave = () => {
    // In a real app, this would call an API
    const btn = document.getElementById('save-btn');
    btn.innerHTML = 'Saved!';
    setTimeout(() => btn.innerHTML = 'Save Changes', 2000);
  };

  return (
    <div className="tab-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="content-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            padding: '0.75rem',
            borderRadius: '16px',
            color: 'white'
          }}>
            <Settings size={24} />
          </div>
          <div>
            <h1 className="title" style={{ marginBottom: 0 }}>System Configuration</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>Manage environment variables and neural engine parameters</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="config-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1rem' }}>
              <Cpu size={18} color="var(--accent-primary)" />
              Neural Engine
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.9rem' }}>Enable Local Ollama (Offline Mode)</span>
                <input 
                  type="checkbox" 
                  checked={config.use_ollama}
                  onChange={(e) => setConfig({...config, use_ollama: e.target.checked})}
                />
              </div>
              
              {!config.use_ollama ? (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>GROQ LLM MODEL</label>
                  <select 
                    className="btn-secondary" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
                    value={config.groq_model}
                    onChange={(e) => setConfig({...config, groq_model: e.target.value})}
                  >
                    <option>llama-3.3-70b-versatile</option>
                    <option>llama3-70b-8192</option>
                    <option>llama3-8b-8192</option>
                    <option>mixtral-8x7b-32768</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>OLLAMA ENDPOINT</label>
                  <input 
                    type="text" 
                    className="btn-secondary" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
                    value={config.ollama_url}
                    onChange={(e) => setConfig({...config, ollama_url: e.target.value})}
                  />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.9rem' }}>Enable GPU Acceleration</span>
                <input 
                  type="checkbox" 
                  checked={config.gpu_enabled}
                  onChange={(e) => setConfig({...config, gpu_enabled: e.target.checked})}
                />
              </div>
            </div>
          </div>

          <div className="config-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1rem' }}>
              <Database size={18} color="var(--accent-primary)" />
              Data Pipeline
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>MAX CONCURRENT WORKERS</label>
                <input 
                  type="number" 
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
                  value={config.max_workers}
                  onChange={(e) => setConfig({...config, max_workers: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>DATA RETENTION POLICY</label>
                <select 
                  className="btn-secondary" 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'white' }}
                  value={config.data_retention}
                  onChange={(e) => setConfig({...config, data_retention: e.target.value})}
                >
                  <option>24 hours</option>
                  <option>7 days</option>
                  <option>30 days</option>
                  <option>Indefinite</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            <RefreshCcw size={18} />
            Reset to Defaults
          </button>
          <button id="save-btn" className="btn btn-primary" onClick={handleSave}>
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ConfigTab;
