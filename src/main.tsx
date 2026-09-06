import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevenir carteles y alertas de 'Rechazo no gestionado' causados por el WebSocket de HMR de Vite
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (
      reasonStr.toLowerCase().includes('websocket') ||
      reasonStr.toLowerCase().includes('failed to connect to websocket') ||
      reasonStr.toLowerCase().includes('closed without being opened') ||
      reasonStr.toLowerCase().includes('sin abrirse')
    ) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
