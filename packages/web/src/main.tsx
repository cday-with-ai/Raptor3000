import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App.js';
import { applyTheme, loadThemeMode } from './theme.js';

// Apply the saved theme before React mounts so we don't flash the wrong palette.
applyTheme(loadThemeMode());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
