import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Database, Zap, BarChart3, Settings, ChevronRight } from 'lucide-react';

function Sidebar({ activeTab, setActiveTab, experiments, selectedExperiment, setSelectedExperiment }) {
  const tabs = [
    { id: 'papers', label: 'Paper Search', icon: FileText },
    { id: 'dataset', label: 'Data Lab', icon: Database },
    { id: 'train', label: 'Engine', icon: Zap },
    { id: 'results', label: 'Insights', icon: BarChart3 },
  ];

  return (
    <motion.div 
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className="sidebar"
    >
      <div className="sidebar-section">
        <div className="sidebar-title">Core Modules</div>
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="active-indicator"
                  style={{ 
                    marginLeft: 'auto',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary)'
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-title">Recent Workflows</div>
        <div className="experiments-list">
          {experiments.length === 0 ? (
            <div style={{ padding: '0 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
              No active runs
            </div>
          ) : (
            experiments.map((exp, index) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className={`experiment-item ${selectedExperiment?.id === exp.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedExperiment(exp);
                  setActiveTab('results');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{exp.name}</div>
                  <ChevronRight size={14} opacity={0.5} />
                </div>
                <div className="experiment-status">
                  <span style={{ 
                    display: 'inline-block', 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    backgroundColor: exp.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                    marginRight: 6
                  }} />
                  {exp.algorithm}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-section" style={{ marginBottom: 0 }}>
        <div 
          className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={18} />
          <span>System Config</span>
        </div>
      </div>
    </motion.div>
  );
}

export default Sidebar;
