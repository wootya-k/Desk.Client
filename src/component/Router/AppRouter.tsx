import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ObjectsTablePage from '@pages/ObjectsTablePage/ObjectsTablePage';
import DetailPage from '@pages/DetailPage/DetailPage';
import NotFoundPage from '@pages/NotFoundPage/NotFoundPage';
import HomePage from '@pages/HomePage/HomePage';
import LoginPage from '@pages/LoginPage/LoginPage';
import UserProfilePage from '@pages/UserProfilePage/UserProfilePage';
import AuthLayout from 'component/layout/AuthLayout/AuthLayout';
import MainLayout from 'component/layout/MainLayout/MainLayout';
import SchemaEditorPage from '@pages/SchemaEditorPage/SchemaEditorPage';
import ReportTemplateEditorPage from '@pages/ReportsEditorPage/ReportTemplateEditorPage';
import CorporationStatsPage from '@pages/CorporationStatsPage/CorporationStatsPage';

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
      ],
    }
  ]);

const AppRouter: React.FC = () => {
  return (
    <RouterProvider router={router} />
  );
};

export default AppRouter;