import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/tokens.css';
import { registerServiceWorker } from './registerServiceWorker';
import NetworkProvider from './network/NetworkProvider';
import PushProvider from './push/PushProvider';
import { initPushNotifications } from './push/pushNotifications';
import NativeShell from './native/NativeShell';

registerServiceWorker();
// Listenery push od razu przy starcie – żeby złapać kliknięcie powiadomienia,
// które uruchomiło zamkniętą aplikację (w PWA nic nie robi)
initPushNotifications();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NativeShell />
      <NetworkProvider>
        <PushProvider>
          <App />
        </PushProvider>
      </NetworkProvider>
    </BrowserRouter>
  </React.StrictMode>
);
