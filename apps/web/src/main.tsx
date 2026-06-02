import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BallsProvider } from './context/BallsContext';
import './index.css';
import { registerServiceWorker } from './utils/notifications';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BallsProvider>
            <App />
        </BallsProvider>
    </StrictMode>,
);
