import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PapersTab from './tabs/PapersTab';
import DatasetTab from './tabs/DatasetTab';
import TrainTab from './tabs/TrainTab';
import ResultsTab from './tabs/ResultsTab';
import ConfigTab from './tabs/ConfigTab';

function MainContent({ activeTab, experiments, selectedExperiment, fetchExperiments, sharedData }) {
  const tabVariants = {
    initial: { opacity: 0, y: 10, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.99 },
  };

  return (
    <div className="main-content">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%' }}
        >
          {activeTab === 'papers' && <PapersTab />}
          {activeTab === 'dataset' && <DatasetTab />}
          {activeTab === 'train' && <TrainTab fetchExperiments={fetchExperiments} sharedData={sharedData} />}
          {activeTab === 'results' && <ResultsTab experiment={selectedExperiment} />}
          {activeTab === 'config' && <ConfigTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default MainContent;
