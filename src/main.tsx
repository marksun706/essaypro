import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Standard for Vite + Tailwind

/**
 * EssayPro: High-quality AI Application Assistant
 * Designed for responsive access and human-like output.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  const msg = "CONFIG ERROR: Environment variables are missing. " +
              "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are in your .env file.";
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (root) root.innerHTML = `<div style="color:white;background:red;padding:20px;font-family:sans-serif;font-weight:bold;">${msg}</div>`;
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Failed to find the root element');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);