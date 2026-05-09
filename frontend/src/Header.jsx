import React from 'react';
import { Zap } from 'lucide-react';

function Header() {
  return (
    <div className="header">
      <h1 className="header-title">
        <Zap size={24} style={{ marginRight: '0.5rem', display: 'inline' }} />
        ML ENGINEER
      </h1>
      <div className="header-status">
        <div className="status-badge">
          <div className="status-dot"></div>
          System Online
        </div>
      </div>
    </div>
  );
}

export default Header;