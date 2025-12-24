import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './App.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './config/queryClient';
import { info } from './utils/logger';

// Load diagnostic utilities in development
if (import.meta.env.DEV) {
  import('./utils/diagnostics/localStorageDebug').then(module => {
    (window as any).debugLocalStorage = module.debugLocalStorage;
    info('Dev Tools Loaded: Run debugLocalStorage() in console to inspect localStorage');
  });

  import('./utils/diagnostics/testApprove').then(module => {
    (window as any).testApproveRequest = module.testApproveRequest;
    info('Test Tools Loaded: Run testApproveRequest("uuid") to test approve endpoint');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        {/* React Query DevTools - only in development */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);