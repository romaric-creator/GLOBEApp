import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// En mode desktop Tauri client, récupérer l'URL serveur configurée avant de monter React
if (typeof (window as any).__TAURI_INTERNALS__ !== 'undefined') {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const serverUrl = await invoke<string | null>('get_server_url');
    if (serverUrl) {
      (window as any).__GLOBE_API_URL__ = `${serverUrl.replace(/\/$/, '')}/api`;
    }
  } catch {
    // Mode web ou invoke indisponible — utiliser VITE_API_BASE_URL
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
