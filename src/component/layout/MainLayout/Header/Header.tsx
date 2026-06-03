import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  subscribe,
  UserDto
} from '@services/AuthService';
import UserProfileModal from './UserProfileModal/UserProfileModal';
import styles from './Header.module.css';

const Header = () => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getCurrentUser());

    const unsubscribe = subscribe(() => {
      setUser(getCurrentUser());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleUserClick = () => {
    setIsProfileModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsProfileModalOpen(false);
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <a
            href="/"
            className={styles.logo}
            onClick={(e) => {
              // Ctrl+Click / Cmd+Click — позволяем браузеру открыть в новой вкладке
              if (e.ctrlKey || e.metaKey) return;
              e.preventDefault();
              navigate('/');
            }}
          >
            Учётный стол
          </a>

          {user && (
            <div
              className={styles.userMenu}
              onClick={handleUserClick}
            >
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.lastName} {user.firstName}
                </div>
                <div className={styles.userPosition}>{user.positionPreview}</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default Header;