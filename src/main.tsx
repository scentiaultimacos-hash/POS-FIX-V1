import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { POSProvider } from './context/POSContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <POSProvider>
      <App />
    </POSProvider>
  </React.StrictMode>
);
