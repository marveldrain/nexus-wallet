import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useOnboarding } from './store';
import './index.css';

// Dev-only escape hatch for manual/automated QA (e.g. forcing auto-lock
// timers). Tree-shaken out of production builds since import.meta.env.DEV
// is statically false there.
if (import.meta.env.DEV) {
  (window as unknown as { __store: typeof useOnboarding }).__store = useOnboarding;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
