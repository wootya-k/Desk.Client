import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './UserProfileModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import { 
  getCurrentUser, 
  logout,
  subscribe,
  UserDto 
} from '@services/AuthService';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [initialUser, setInitialUser] = useState<UserDto | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setInitialUser(currentUser);
    
    const unsubscribe = subscribe(() => {
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
      setInitialUser(updatedUser);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser(prev => {
      if (!prev) return prev;
      return { 
        ...prev, 
        [name]: value 
      };
    });
  };

  const handleSave = () => {
    if (!user) return;
    setInitialUser(user);
  };

  const handleLogout = () => {
    onClose();
    logout().finally(() => {
      navigate('/login');
    });
  };

  // Вычисляем, были ли изменения
  const isChanged = initialUser && user 
    ? initialUser.firstName !== user.firstName ||
      initialUser.lastName !== user.lastName ||
      initialUser.patronymic !== user.patronymic ||
      initialUser.position !== user.position
    : false;

  if (!isOpen || !user) return null;

  return ReactDOM.createPortal(
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>Профиль пользователя</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Логин</label>
            <div className={styles.staticValue}>{user.login}</div>
            <div className={styles.hint}>Логин нельзя изменить</div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="lastNameInput" className={styles.label}>Фамилия</label>
            <input
              id="lastNameInput"
              type="text"
              name="lastName"
              value={user.lastName}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="firstNameInput" className={styles.label}>Имя</label>
            <input
              id="firstNameInput"
              type="text"
              name="firstName"
              value={user.firstName}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Отчество</label>
            <input
              type="text"
              name="patronymic"
              value={user.patronymic}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Должность</label>
            <input
              type="text"
              name="position"
              value={user.position}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Роль</label>
            <div className={styles.staticValue}>{user.role}</div>
          </div>
        </div>

        <div className={styles.buttonSection}>
          <div className={styles.mainActions}>
            <FilledColorButton
              onClick={handleSave}
              disabled={!isChanged}
              mainColor="#ffffff"
               additionalColor="#f39c12"
              width="140px"
            >
              Сохранить
            </FilledColorButton>
            
            <FilledColorButton
              onClick={handleLogout}
              mainColor="#ffffff"
              additionalColor="#e74c3c"
              width="140px"
            >
              Выйти
            </FilledColorButton>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default UserProfileModal;