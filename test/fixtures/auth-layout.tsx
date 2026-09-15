import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Auth from '@/pages/Auth';
import '@/index.css';

// Auth operations are stubbed by the e2e runner. No real account operations.
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/auth']}><Auth /></MemoryRouter>);
