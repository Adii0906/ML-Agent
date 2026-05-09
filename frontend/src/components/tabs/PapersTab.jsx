import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, ExternalLink, Sparkles, Loader, BookOpen } from 'lucide-react';

function PapersTab() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/search-papers?query=${encodeURIComponent(query)}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPapers(data.papers);
      } else {
        setError('Failed to fetch research papers');
      }
    } catch (err) {
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="content-card"
        style={{ marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            padding: '0.75rem',
            borderRadius: '16px',
            color: 'white'
          }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="title" style={{ marginBottom: 0 }}>Research Discovery</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>Explore SOTA papers to inform your model architecture</p>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <input
            type="text"
            className="btn-secondary"
            style={{ 
              width: '100%', 
              padding: '1.25rem 1rem 1.25rem 3.5rem', 
              borderRadius: '20px', 
              border: '1px solid var(--border-color)', 
              fontSize: '1.1rem',
              color: 'white',
              outline: 'none',
              backgroundColor: 'var(--bg-tertiary)'
            }}
            placeholder="Search arXiv for ML architectures, optimizers, or datasets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="btn btn-primary"
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', padding: '0.6rem 1.5rem' }}
            disabled={loading}
          >
            {loading ? <Loader size={18} className="loader" /> : 'Search'}
          </motion.button>
        </form>
      </motion.div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <AnimatePresence>
          {papers.map((paper, index) => (
            <motion.div
              key={paper.arxiv_id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="content-card"
              style={{ margin: 0, padding: '1.5rem' }}
              whileHover={{ borderColor: 'var(--accent-primary)', backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{paper.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '1rem', fontWeight: 600 }}>{paper.authors}</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {paper.summary}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <a 
                      href={paper.pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                    >
                      <FileText size={14} />
                      PDF Paper
                    </a>
                    <div style={{ 
                      marginLeft: 'auto', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px'
                    }}>
                      <Sparkles size={12} color="var(--accent-primary)" />
                      Highly Relevant
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && papers.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '5rem 0', opacity: 0.3 }}>
            <Search size={48} style={{ margin: '0 auto 1rem' }} />
            <p>Enter a query to discover state-of-the-art research</p>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--error)', textAlign: 'center', padding: '2rem' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default PapersTab;
