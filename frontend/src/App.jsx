import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

function App() {
  const [activeTab, setActiveTab] = useState('papers');
  const [experiments, setExperiments] = useState([]);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sharedData, setSharedData] = useState({});
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Hide welcome screen after 3.5 seconds
    const timer = setTimeout(() => setShowWelcome(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchExperiments();

    const handleTabChange = (e) => {
      if (typeof e.detail === 'string') {
        setActiveTab(e.detail);
      } else {
        setActiveTab(e.detail.tab);
        setSharedData(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchExperiments = async () => {
    try {
      const response = await fetch(`${API_URL}/experiments`);
      const data = await response.json();
      setExperiments(data.experiments || []);
    } catch (error) {
      console.error('Error fetching experiments:', error);
    }
  };

  return (
    <div className="app">
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-primary)',
              gap: '1.5rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Cpu size={48} />
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{ textAlign: 'center' }}
            >
              <h1 style={{ 
                fontSize: '3.5rem', 
                fontWeight: 800, 
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem'
              }}>
                ML-Agent
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', letterSpacing: '0.05em', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                an autonomous ML engineer that analyzes data, trains models, and ships ML workflows
              </p>
            </motion.div>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 1.5, ease: "easeInOut" }}
              style={{
                width: 200,
                height: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
                transformOrigin: 'center'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Header />
      <div className="app-container">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          experiments={experiments}
          selectedExperiment={selectedExperiment}
          setSelectedExperiment={setSelectedExperiment}
        />
        <MainContent 
          activeTab={activeTab}
          experiments={experiments}
          selectedExperiment={selectedExperiment}
          fetchExperiments={fetchExperiments}
          sharedData={sharedData}
        />
      </div>
    </div>
  );
}

export default App;