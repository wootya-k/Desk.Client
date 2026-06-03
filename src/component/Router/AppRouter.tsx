import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import ObjectsTablePage from '@pages/ObjectsTablePage/ObjectsTablePage';
import DetailPage from '@pages/DetailPage/DetailPage';
import NotFoundPage from '@pages/NotFoundPage/NotFoundPage';
import HomePage from '@pages/HomePage/HomePage';
import ImportPage from '@pages/ImportPage/ImportPage';
import AdminPage from '@pages/AdminPage/AdminPage';
import LoginPage from '@pages/LoginPage/LoginPage';
import UserProfilePage from '@pages/UserProfilePage/UserProfilePage';
import AuthLayout from 'component/layout/AuthLayout/AuthLayout';
import MainLayout from 'component/layout/MainLayout/MainLayout';
import SchemaEditorPage from '@pages/SchemaEditorPage/SchemaEditorPage';
import ReportTemplateEditorPage from '@pages/ReportsEditorPage/ReportTemplateEditorPage';
import CorporationStatsPage from '@pages/CorporationStatsPage/CorporationStatsPage';
import CheckpointPage from '@pages/CheckpointPage/CheckpointPage';
import { isAuthenticated } from '@services/AuthService';

// Компонент для защиты маршрутов
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    // Сохраняем путь, куда хотел попасть пользователь
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};

const router = createBrowserRouter(
  [
    {
      path: '*',
      element: <NotFoundPage />,
    },
    {
      element: <AuthLayout />,
      children: [
        {
          path: '/login',
          element: <LoginPage />,
        },
      ],
    },
    {
      element: <MainLayout />,
      children: [
        {
          path: '/',
          element: (
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/import',
          element: (
            <ProtectedRoute>
              <ImportPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/admin',
          element: (
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/report-template-editor/:templateId?',
          element: (
            <ProtectedRoute>
              <ReportTemplateEditorPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/schema-editor/:schemaId?',
          element: (
            <ProtectedRoute>
              <SchemaEditorPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/detail-object/:type/:id',
          element: (
            <ProtectedRoute>
              <DetailPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/new-object/:type',
          element: (
            <ProtectedRoute>
              <DetailPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/view-objects/:type',
          element: (
            <ProtectedRoute>
              <ObjectsTablePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/corporation-stats/:type',
          element: (
            <ProtectedRoute>
              <CorporationStatsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/user-profile',
          element: (
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          ),
        },
        {
          path: '/checkpoint',
          element: (
            <ProtectedRoute>
              <CheckpointPage />
            </ProtectedRoute>
          ),
        },
      ],
    }
  ]);

const AppRouter: React.FC = () => {
  return (
    <RouterProvider router={router} />
  );
};

export default AppRouter;