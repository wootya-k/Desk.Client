import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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
          element: <HomePage />,
        },
        {
          path: '/import',
          element: <ImportPage/>,
        },
        {
          path: '/admin',
          element: <AdminPage/>,
        },
        {
          path: '/report-template-editor/:templateId?',
          element: <ReportTemplateEditorPage/>,
        },
        {
          path: '/schema-editor/:schemaId?',
          element: <SchemaEditorPage />,
        },
        {
          path: '/detail-object/:type/:id',
          element: <DetailPage />,
        },
        {
          path: '/new-object/:type',
          element: <DetailPage />,
        },
        {
          path: '/view-objects/:type',
          element: <ObjectsTablePage />,
        },
        {
          path: '/corporation-stats/:type',
          element: <CorporationStatsPage />,
        },
        {
          path: '/user-profile',
          element: <UserProfilePage />,
        },
        {
          path: '/checkpoint',
          element: <CheckpointPage />,
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