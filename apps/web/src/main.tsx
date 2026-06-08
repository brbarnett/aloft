import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import LoginPage from './components/LoginPage';
import { FlightsProvider } from './context/FlightsContext';
import './index.css';
import { registerServiceWorker } from './utils/notifications';

registerServiceWorker();

const isLogin = window.location.pathname === '/login';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {isLogin ? (
            <LoginPage />
        ) : (
            <FlightsProvider>
                <App />
            </FlightsProvider>
        )}
    </StrictMode>,
);
