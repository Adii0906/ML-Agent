import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Github } from 'lucide-react';

function Header() {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <motion.div 
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.5 }}
          style={{ 
            width: 32, 
            height: 32, 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <Cpu size={20} />
        </motion.div>
        <div className="logo" style={{ letterSpacing: '0.1em', fontWeight: 800 }}>ML-AGENT</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          your autonomous machine learning engineer
        </div>
        
        <a 
          href="https://github.com/Adii0906/ML-Agent" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          className="btn btn-secondary"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <Github size={16} />
          <span>Star on GitHub</span>
        </a>
      </div>
    </header>
  );
}

export default Header;
