import React from 'react';
import { createRoot } from 'react-dom/client';
import { LoadingScreen, type LoadingState } from '../../src/components/LoadingScreen';
import '../../src/index.css';

const states: LoadingState[] = ['app', 'route', 'session', 'signing-in', 'signing-up', 'signing-out', 'confirming-email'];
const query = new URLSearchParams(location.search);
const requested = query.get('state') as LoadingState;
createRoot(document.getElementById('root')!).render(<LoadingScreen state={states.includes(requested) ? requested : 'app'} />);
