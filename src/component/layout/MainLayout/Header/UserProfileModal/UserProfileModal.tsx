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
import {
  updateUser,
  changePassword,
  UserApiError,
  UpdateUserRequest
} from '@services/UserService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalMode = 'profile' | 'change-password';

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [initialUser, setInitialUser] = useState<UserDto | null>(null);

  const [mode, setMode] = useState<ModalMode>('profile');
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Сброс состояния при закрытии модалки
  useEffect(() => {
    if (!isOpen) {
      setMode('profile');
      setPasswords({ current: '', new: '', confirm: '' });
      setPasswordError(null);
      setSaveError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
    if (saveError) setSaveError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
    if (passwordError) setPasswordError(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    setSaveError(null);

    try {
      const request: UpdateUserRequest = {
        firstName: user.firstName,
        lastName: user.lastName,
        patronymic: user.patronymic,
        position: user.position,
        organization: user.organization,
      };

      const updatedUser = await updateUser(user.login, request);

      // Обновляем локальное состояние модалки
      setUser(updatedUser as UserDto);
      setInitialUser(updatedUser as UserDto);

      // TODO: Если в AuthService есть метод обновления текущего пользователя — вызвать его здесь.
      // Например: AuthService.setCurrentUser(updatedUser);
      // Это нужно, чтобы в хедере и других местах отображались актуальные ФИО/должность.

    } catch (error) {
      if (error instanceof UserApiError) {
        setSaveError(error.message);
      } else {
        setSaveError('Произошла неизвестная ошибка при сохранении профиля');
        console.error('[handleSaveProfile]', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!user) return;

    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setPasswordError('Все поля должны быть заполнены');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordError('Новые пароли не совпадают');
      return;
    }
    if (passwords.new.length < 6) {
      setPasswordError('Новый пароль должен содержать не менее 6 символов');
      return;
    }

    setIsLoading(true);
    setPasswordError(null);

    try {
      await changePassword(user.login, passwords.current, passwords.new);

      // Успешно — сбрасываем и возвращаемся в режим профиля
      setPasswords({ current: '', new: '', confirm: '' });
      setMode('profile');
    } catch (error) {
      if (error instanceof UserApiError) {
        // Бэкенд вернёт SecurityException("Неверный старый пароль") → 500 или 400
        setPasswordError(error.message);
      } else {
        setPasswordError('Произошла неизвестная ошибка при смене пароля');
        console.error('[handleSavePassword]', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (mode === 'profile') {
      handleSaveProfile();
    } else {
      handleSavePassword();
    }
  };

  const toggleMode = () => {
    if (mode === 'profile') {
      setMode('change-password');
      setSaveError(null);
    } else {
      setMode('profile');
      setPasswords({ current: '', new: '', confirm: '' });
      setPasswordError(null);
      setSaveError(null);
    }
  };

  const handleLogout = () => {
    onClose();
    logout().finally(() => {
      navigate('/login');
    });
  };

  const handleBackdropClick = () => {
    if (!isLoading) onClose();
  };

  const isProfileChanged = initialUser && user
    ? initialUser.firstName !== user.firstName ||
      initialUser.lastName !== user.lastName ||
      initialUser.patronymic !== user.patronymic ||
      initialUser.position !== user.position ||
      initialUser.organization !== user.organization
    : false;

  const isPasswordValid =
    passwords.current &&
    passwords.new &&
    passwords.confirm &&
    passwords.new === passwords.confirm;

  const isSaveDisabled = isLoading || (mode === 'profile' ? !isProfileChanged : !isPasswordValid);

  if (!isOpen || !user) return null;

  return ReactDOM.createPortal(
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.resetButton}
          onClick={handleBackdropClick}
          title="Закрыть"
          type="button"
          aria-label="Закрыть"
          disabled={isLoading}
        >
          <span className={styles.closeIcon}>✕</span>
        </button>

        <h2 className={styles.modalTitle}>
          {mode === 'profile' ? 'Ваш профиль' : 'Смена пароля'}
        </h2>

        {/* Общее сообщение об ошибке сохранения */}
        {saveError && (
          <div className={styles.errorMessage} style={{ marginBottom: '12px' }}>
            {saveError}
          </div>
        )}

        <div className={styles.formSection}>
          {mode === 'profile' ? (
            <>
              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.fullWidthField}`}>
                  <label className={styles.label}>Логин</label>
                  <div className={styles.staticValue}>{user.login}</div>
                  <div className={styles.hint}>Логин нельзя изменить</div>
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidthField}`}>
                  <label className={styles.label}>Роль</label>
                  <div className={styles.staticValue}>{user.role}</div>
                  <div className={styles.hint}>Для изменения роли обратитесь в техподдержку</div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.fioField}`}>
                  <label htmlFor="lastNameInput" className={styles.label}>Фамилия</label>
                  <input
                    id="lastNameInput"
                    type="text"
                    name="lastName"
                    value={user.lastName}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.fioField}`}>
                  <label htmlFor="firstNameInput" className={styles.label}>Имя</label>
                  <input
                    id="firstNameInput"
                    type="text"
                    name="firstName"
                    value={user.firstName}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.fioField}`}>
                  <label htmlFor="patronymicInput" className={styles.label}>Отчество</label>
                  <input
                    id="patronymicInput"
                    type="text"
                    name="patronymic"
                    value={user.patronymic ?? ''}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.wideField}`}>
                  <label htmlFor="organizationInput" className={styles.label}>Организация</label>
                  <input
                    id="organizationInput"
                    type="text"
                    name="organization"
                    value={user.organization ?? ''}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.wideField}`}>
                  <label htmlFor="positionPreviewInput" className={styles.label}>Предпросмотр должности</label>
                  <input
                    id="positionPreviewInput"
                    type="text"
                    name="positionPreview"
                    value={(user as any).positionPreview ?? ''}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="positionInput" className={styles.label}>Официальная должность</label>
                <input
                  id="positionInput"
                  type="text"
                  name="position"
                  value={user.position}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            /* РЕЖИМ СМЕНЫ ПАРОЛЯ */
            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.passwordField}`}>
                  <label htmlFor="currentPasswordInput" className={styles.label}>
                    Введите свой актуальный пароль
                  </label>
                  <input
                    id="currentPasswordInput"
                    type="password"
                    name="current"
                    value={passwords.current}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.passwordField}`}>
                  <label htmlFor="newPasswordInput" className={styles.label}>
                    Введите желаемый вами пароль
                  </label>
                  <input
                    id="newPasswordInput"
                    type="password"
                    name="new"
                    value={passwords.new}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.passwordField}`}>
                  <label htmlFor="confirmPasswordInput" className={styles.label}>
                    Введите повторно желаемый вами пароль
                  </label>
                  <input
                    id="confirmPasswordInput"
                    type="password"
                    name="confirm"
                    value={passwords.confirm}
                    onChange={handlePasswordChange}
                    className={styles.input}
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>
              </div>
              {passwordError && (
                <div className={styles.errorMessage}>{passwordError}</div>
              )}
            </div>
          )}
        </div>

        <div className={styles.buttonSection}>
          <div className={styles.mainActions}>
            <FilledColorButton
              onClick={handleSave}
              disabled={isSaveDisabled}
              mainColor="#ffffff"
              additionalColor="#f39c12"
              width="140px"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </FilledColorButton>

            <FilledColorButton
              onClick={toggleMode}
              width="140px"
              disabled={isLoading}
            >
              {mode === 'profile' ? 'Сменить пароль' : 'Профиль'}
            </FilledColorButton>

            <FilledColorButton
              onClick={handleLogout}
              width="140px"
              disabled={isLoading}
            >
              Выйти из системы
            </FilledColorButton>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default UserProfileModal;