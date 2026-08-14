import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// En mode desktop Electron client, récupérer l'URL serveur configurée avant de monter React
if ((window as any).electronAPI) {
  try {
    const serverUrl = await (window as any).electronAPI.getServerUrl();
    if (serverUrl) {
      (window as any).__GLOBE_API_URL__ = `${serverUrl.replace(/\/$/, '')}/api`;
    }
  } catch {
    // Mode web ou API indisponible — utiliser VITE_API_BASE_URL
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
