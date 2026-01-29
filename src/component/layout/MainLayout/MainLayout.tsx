// src/component/layout/Layout.tsx
import { Outlet } from 'react-router-dom';
import Header from './Header/Header';
import styles from './MainLayout.module.css';
import { startNotificationConnection } from '@services/NotificationService'
import { useEffect } from 'react';

const Layout = () => {

  useEffect(() => {
    startNotificationConnection();
  }, []);
  
  return (
    <div className={styles.appLayout}>
      <Header />
      
      <div className={styles.mainContainer}>
        
        <div className={styles.contentArea}>
          <Outlet /> 
        </div>
      </div>
    </div>
  );
};

export default Layout;