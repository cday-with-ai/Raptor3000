import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App.js';
import { installThemeSync } from './theme.js';

// Apply the saved theme before React mounts so we don't flash the wrong palette,
// and keep following it afterwards. Every window runs this bundle, so each popup
// subscribes for itself and picks up a mode change made in the main window.
installThemeSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
