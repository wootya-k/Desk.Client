import React from 'react';
import styles from './NotFoundPage.module.css'; // Импорт модульных стилей

const NotFoundPage: React.FC = () => {
  return (
    <main className={styles.notFoundContainer}>
      <div className={styles.stars}></div>
      <div className={styles.twinkling}></div>
      
      <div className={styles.content}>
        <h1 className={styles.notFoundTitle}>404</h1>
        <h2 className={styles.notFoundSubtitle}>Ой, кажется, вы заблудились в космосе!</h2>
        <p className={styles.notFoundMessage}>
          Вы пытаетесь попасть на несуществующую страницу приложения
        </p>
        
        <button 
          className={styles.button} 
          onClick={() => window.location.href = '/'}
        >
          Вернуться на Землю
        </button>
      </div>
      
      <div className={styles.comet}></div>
    </main>
  );
};

export default NotFoundPage;