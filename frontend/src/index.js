import './styles/resell-responsive-repair.css';
import './styles/resell-ui-system-fix.css';
import './styles/resell-operations.css';
import './styles/resell-polish.css';
import './styles/resell-marketplace-final.css';
import './styles/resell-admin-performance.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthProvider from './Context/AuthProvider/AuthProvider';
import './index.css';
import './styles/resell-modern.css';
import './styles/resell-signup.css';
import reportWebVitals from './reportWebVitals';
const queryClient = new QueryClient();
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
