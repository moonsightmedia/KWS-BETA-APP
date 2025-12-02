import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './styles/tailwind.css';
import './styles/globals.css';
import { AppLayout } from './components/layout/AppLayout';
import { SystemView } from './features/admin/routes/System';
import { UploadView } from './features/setter/routes/Upload';
import { GenericView } from './features/shared/GenericView';
import { DashboardView } from './features/user/routes/Dashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/system" replace /> },
      {
        path: 'user',
        children: [
          { path: 'dashboard', element: <DashboardView /> },
          { path: 'boulder', element: <GenericView /> },
          { path: 'sektoren', element: <GenericView /> },
        ],
      },
      {
        path: 'setter',
        children: [
          { path: 'boulder', element: <GenericView /> },
          { path: 'upload', element: <UploadView /> },
          { path: 'planung', element: <GenericView /> },
        ],
      },
      {
        path: 'admin',
        children: [
          { path: 'settings', element: <GenericView /> },
          { path: 'users', element: <GenericView /> },
          { path: 'system', element: <SystemView /> },
        ],
      },
      { path: '*', element: <GenericView /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
