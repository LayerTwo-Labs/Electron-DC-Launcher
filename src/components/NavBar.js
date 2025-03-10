import React, { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
// import ThemeToggle from './ThemeToggle';
import ToolsDropdown from './ToolsDropdown';
import { showSettingsModal } from '../store/settingsModalSlice';
import styles from './NavBar.module.css';
import buttonStyles from './Button.module.css';

const L1_CHAINS = ['bitcoin', 'enforcer', 'bitwindow'];
const L2_CHAINS = ['thunder', 'bitnames'];

const NavBar = () => {
  const dispatch = useDispatch();
  const chains = useSelector(state => state.chains);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStoppingSequence, setIsStoppingSequence] = useState(false);
  const runningNodes = chains.filter(chain => chain.status === 'running' || chain.status === 'ready').map(chain => chain.id);

  const areAllChainsRunning = useCallback(() => {
    return L1_CHAINS.every(chain => runningNodes.includes(chain));
  }, [runningNodes]);

  const isAnyL1ChainDownloading = useCallback(() => {
    return L1_CHAINS.some(chainId => {
      const chain = chains.find(c => c.id === chainId);
      return chain && (chain.status === 'downloading' || chain.status === 'extracting');
    });
  }, [chains]);

  const areAllL1ChainsDownloaded = useCallback(() => {
    return L1_CHAINS.every(chainId => {
      const chain = chains.find(c => c.id === chainId);
      return chain && chain.status !== 'not_downloaded';
    });
  }, [chains]);

  const downloadMissingL1Chains = useCallback(async () => {
    try {
      for (const chainId of L1_CHAINS) {
        const chain = chains.find(c => c.id === chainId);
        if (chain && chain.status === 'not_downloaded') {
          await window.electronAPI.downloadChain(chainId);
        }
      }
    } catch (error) {
      console.error('Failed to download L1 chains:', error);
    }
  }, [chains]);

  const handleStartSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(false);
      
      if (!runningNodes.includes('bitcoin')) {
        await window.electronAPI.startChain('bitcoin');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!runningNodes.includes('enforcer')) {
        await window.electronAPI.startChain('enforcer');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!runningNodes.includes('bitwindow')) {
        await window.electronAPI.startChain('bitwindow');
      }
    } catch (error) {
      console.error('Start sequence failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [runningNodes]);

  const handleStopSequence = useCallback(async () => {
    try {
      setIsProcessing(true);
      setIsStoppingSequence(true);
      
      for (const chainId of L2_CHAINS) {
        if (runningNodes.includes(chainId)) {
          await window.electronAPI.stopChain(chainId);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      if (runningNodes.includes('bitwindow')) {
        await window.electronAPI.stopChain('bitwindow');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      if (runningNodes.includes('enforcer')) {
        await window.electronAPI.stopChain('enforcer');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      if (runningNodes.includes('bitcoin')) {
        await window.electronAPI.stopChain('bitcoin');
      }
    } catch (error) {
      console.error('Stop sequence failed:', error);
      setIsProcessing(false);
      setIsStoppingSequence(false);
    }
  }, [runningNodes]);

  const handleQuickStartStop = useCallback(async () => {
    try {
      if (!areAllL1ChainsDownloaded()) {
        await downloadMissingL1Chains();
      } else if (!areAllChainsRunning()) {
        await handleStartSequence();
      } else {
        await handleStopSequence();
      }
    } catch (error) {
      console.error('Quick start/stop failed:', error);
    }
  }, [areAllL1ChainsDownloaded, areAllChainsRunning, downloadMissingL1Chains, handleStartSequence, handleStopSequence]);

  return (
    <nav className={styles.nav}>
      <div className={styles.leftSection}>
        <button
          onClick={handleQuickStartStop}
          disabled={isProcessing || isAnyL1ChainDownloading()}
          className={`${buttonStyles.quickStartBtn} ${
            !isProcessing && !isAnyL1ChainDownloading() && 
            (!areAllL1ChainsDownloaded() || (!areAllChainsRunning() && areAllL1ChainsDownloaded())) 
              ? buttonStyles.shimmer 
              : ''
          } ${
            isProcessing || isAnyL1ChainDownloading()
              ? buttonStyles.downloading
              : !areAllL1ChainsDownloaded()
                ? buttonStyles.download
                : areAllChainsRunning()
                  ? buttonStyles.stop
                  : buttonStyles.run
          }`}
          data-state={!isProcessing && !isAnyL1ChainDownloading() && (!areAllL1ChainsDownloaded() ? 'download' : !areAllChainsRunning() ? 'start' : '')}
        >
          {isProcessing
            ? (isStoppingSequence ? 'Stopping...' : 'Starting...')
            : isAnyL1ChainDownloading()
              ? 'Downloading...'
              : !areAllL1ChainsDownloaded() 
                ? 'Download L1' 
                : !areAllChainsRunning() 
                  ? 'Quick Start' 
                  : 'Safe Stop'}
        </button>
        {/* <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          Nodes
        </NavLink> */}
      </div>
      <div className={styles.iconContainer}>
        <ToolsDropdown />
        {/* <ThemeToggle /> */}
        <button 
          className={styles.settingsButton}
          onClick={() => dispatch(showSettingsModal())}
        >
          Settings
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
