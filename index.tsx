import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const startApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    // This should not happen with the DOMContentLoaded listener, but as a safeguard:
    console.error("Fatal Error: Could not find root element. App cannot be mounted.");
    return;
  }
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  // The DOM is not yet ready. Wait for the DOMContentLoaded event.
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  // The DOM has already loaded. Let's go!
  startApp();
}
