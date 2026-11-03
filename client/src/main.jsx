import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import PublicForm from './pages/PublicForm.jsx';
import PublicApp from './pages/PublicApp.jsx';
import './styles.css';

const m = window.location.pathname.match(/^\/(f|embed|a)\/([\w-]+)/);
createRoot(document.getElementById('root')).render(
  !m ? <App /> : m[1] === 'a' ? <PublicApp appId={m[2]} /> : <PublicForm formId={m[2]} embed={m[1] === 'embed'} />,
);
