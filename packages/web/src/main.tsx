import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App.js';
import { installThemeSync } from './theme.js';
import { installLocale } from './i18n/index.js';
import { registerAlertPeer, unlockAlertAudio } from './alertSounds.js';

// Apply the saved theme before React mounts so we don't flash the wrong palette,
// and keep following it afterwards. Every window runs this bundle, so each popup
// subscribes for itself and picks up a mode change made in the main window.
installThemeSync();

// Same shape for the UI language: resolve it (browser detection, or the
// visitor's override) and set <html lang/dir> before the first paint, so
// a Hebrew visitor never sees an LTR frame flip to RTL.
installLocale();

// Alerts are synthesized through an AudioContext, and a browser only lets
// one start inside a user gesture. Arm every document to grab its own on
// the first click or keypress — and, from a popup, tell the opener we
// exist, so the main window can hand us a sound when it has never been
// clicked itself (auto-login). See alertSounds.ts for the full autopsy.
unlockAlertAudio();
if (window.opener && !window.opener.closed) {
  try {
    window.opener.raptorRegisterAlertPeer?.(window);
  } catch {
    // Cross-origin or half-dead opener: alerts just stay in main.
  }
}
declare global {
  interface Window {
    raptorRegisterAlertPeer?: (w: Window) => () => void;
  }
}
window.raptorRegisterAlertPeer = registerAlertPeer;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
