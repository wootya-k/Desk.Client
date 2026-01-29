// src/components/App.tsx
import React, { useEffect, useState } from 'react';
import AppRouter from './Router/AppRouter';
import { initializeConfig } from 'config';
import NotificationHandler from './common/NotificationHandler/NotificationHandler';
import HotkeysModal from '@shared/HotkeysModal/HotkeysModal';

const App: React.FC = () => {
  initializeConfig();
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const modalRoot = document.getElementById('modal-root');
    const hasOpenModal = modalRoot && modalRoot.children.length > 0;

    if (e.ctrlKey && e.code === 'Slash') {
      e.preventDefault();
      
      // Если HotkeysModal открыто - закрываем его в любом случае
      if (isHotkeysOpen) {
        setIsHotkeysOpen(false);
      } 
      // Если других модальных окон нет - открываем
      else if (!hasOpenModal) {
        setIsHotkeysOpen(true);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [isHotkeysOpen]); // Добавляем зависимость

  return (
    <>
      <NotificationHandler />
      <AppRouter />
      <HotkeysModal
        isOpen={isHotkeysOpen}
        onClose={() => setIsHotkeysOpen(false)}
      />
    </>
  );
};

export default App;