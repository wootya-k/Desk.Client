import React, { useState, useEffect } from 'react';
import styles from './UserProfilePage.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import { 
  getCurrentUser, 
  subscribe,
  UserDto 
} from '@services/AuthService';
import { useNavigate } from 'react-router-dom';

const UserProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [initialUser, setInitialUser] = useState<UserDto | null>(null); // Для сброса изменений
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
    
    // Реальный вызов API для сохранения:
    // AuthService.updateProfile(user).then(...)
    
    // Обновляем начальное состояние после сохранения
    setInitialUser(user);
  };

  const handleReset = () => {
    if (initialUser) {
      setUser(initialUser);
    }
  };

  // Вычисляем, были ли изменения
  const isChanged = initialUser && user 
    ? initialUser.firstName !== user.firstName ||
      initialUser.lastName !== user.lastName ||
      initialUser.patronymic !== user.patronymic ||
      initialUser.position !== user.position
    : false;

  if (!user) {
    return <div className={styles.container}>
      <div className={styles.loader}>Пользователь не загружен...</div>
    </div>;
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Редактирование профиля</h1>
      
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

      <div className={styles.buttonGroup}>
        <FilledColorButton
          onClick={handleSave}
          disabled={!isChanged}
          mainColor="#ffffff"
          additionalColor="#f39c12"
        >
          Сохранить
        </FilledColorButton>
        
      </div>
    </main>
  );
};

export default UserProfilePage;