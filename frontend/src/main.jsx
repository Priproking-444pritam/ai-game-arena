import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d0d1f',
              color: '#e8eaf6',
              border: '1px solid rgba(0,245,255,0.2)',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '14px',
              letterSpacing: '0.03em'
            },
            success: {
              iconTheme: { primary: '#00ff88', secondary: '#000' }
            },
            error: {
              iconTheme: { primary: '#ff0066', secondary: '#fff' }
            }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
