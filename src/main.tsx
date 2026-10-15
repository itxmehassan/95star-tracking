import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BrandingProvider } from './lib/BrandingContext.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrandingProvider>
        <App />
      </BrandingProvider>
    </ErrorBoundary>
  </StrictMode>,
);
