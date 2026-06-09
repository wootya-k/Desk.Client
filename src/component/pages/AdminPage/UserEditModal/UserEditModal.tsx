// components/UserEditModal/UserEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './UserEditModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import { User, UserRole } from '@services/UserService';

interface UserFormData extends Omit<User, 'role'> {
  role: UserRole;
  password: string;
}

interface Props {
  user: User | null;
  isOpen: boolean;
  onSave: (user: UserFormData) => void;
  onCancel: () => void;
  onGeneratePassword?: () => string;
}

const ROLES: UserRole[] = ['Master', 'Admin', 'Editor', 'Viewer'];

const UserEditModal: React.FC<Props> = ({
  user,
  isOpen,
  onSave,
  onCancel,
  onGeneratePassword
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    login: '',
    firstName: '',
    lastName: '',
    patronymic: '',
    position: '',
    role: 'Viewer',
    organization: '',
    telephone: '',
    city: '',
    isSuspended: false,
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        password: ''
      });
    } else {
      setFormData({
        login: '',
        firstName: '',
        lastName: '',
        patronymic: '',
        position: '',
        role: 'Viewer',
        organization: '',
        telephone: '',
        city: '',
        isSuspended: false,
        password: ''
      });
    }
    setErrors({});
    setShowPassword(false);
  }, [user, isOpen]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.login.trim()) {
      newErrors.login = 'Логин обязателен';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.login)) {
      newErrors.login = 'Логин может содержать только латинские буквы, цифры и _';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Имя обязательно';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Фамилия обязательна';
    }

    if (!formData.organization.trim()) {
      newErrors.organization = 'Организация обязательна';
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = 'Пароль обязателен для нового пользователя';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleGeneratePassword = () => {
    if (onGeneratePassword) {
      const newPassword = onGeneratePassword();
      setFormData(prev => ({ ...prev, password: newPassword }));
      setErrors(prev => ({ ...prev, password: '' }));
      // Пароль остаётся скрытым после генерации
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      if (validate()) {
        onSave(formData);
      }
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <dialog
      className={styles.modalBackdrop}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <article className={styles.modalContent}>
        <button
          className={styles.resetButton}
          onClick={onCancel}
          title="Закрыть"
          type="button"
          aria-label="Закрыть"
        >
          <span className={styles.closeIcon}>✕</span>
        </button>

        <h2 className={styles.modalTitle}>
          {user ? 'Редактирование пользователя' : 'Добавление пользователя'}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Логин <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                className={`${styles.input} ${errors.login ? styles.error : ''}`}
                disabled={!!user}
                placeholder="login123"
              />
              {errors.login && <span className={styles.errorMessage}>{errors.login}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Роль <span className={styles.required}>*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={styles.select}
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Фамилия <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`${styles.input} ${errors.lastName ? styles.error : ''}`}
                placeholder="Иванов"
              />
              {errors.lastName && <span className={styles.errorMessage}>{errors.lastName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Имя <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`${styles.input} ${errors.firstName ? styles.error : ''}`}
                placeholder="Иван"
              />
              {errors.firstName && <span className={styles.errorMessage}>{errors.firstName}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Отчество</label>
              <input
                type="text"
                name="patronymic"
                value={formData.patronymic}
                onChange={handleChange}
                className={styles.input}
                placeholder="Иванович"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Организация <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                className={`${styles.input} ${errors.organization ? styles.error : ''}`}
                placeholder="ООО «Рога и копыта»"
              />
              {errors.organization && <span className={styles.errorMessage}>{errors.organization}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Город</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={styles.input}
                placeholder="Гиперборея"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Официальная должность</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ведущий специалист по великим делам"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Предпросмотр должности</label>
              <input
                type="text"
                name="position"
                value={(formData as any).positionPreview}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ведущий специалист по великим делам"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Телефон</label>
              <input
                type="text"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className={styles.input}
                placeholder="+7 (84235) 6-41-78"
              />
            </div>
          </div>

          {/* === Пароль + галочка заморозки в одном ряду === */}
          <div className={`${styles.formRow} ${styles.passwordRow}`}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Пароль {!user && <span className={styles.required}>*</span>}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`${styles.input} ${errors.password ? styles.error : ''}`}
                placeholder={user ? 'Оставьте пустым, чтобы не менять' : 'Введите пароль'}
                autoComplete={user ? 'new-password' : 'password'}
              />
              {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
              <div className={styles.passwordActions}>
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={handleGeneratePassword}
                >
                  Сгенерировать
                </button>
                {formData.password && (
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? 'Скрыть' : 'Раскрыть'}
                  </button>
                )}
              </div>
            </div>

            {user && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Статус аккаунта</label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isSuspended}
                    onChange={() =>
                      setFormData(prev => ({ ...prev, isSuspended: !prev.isSuspended }))
                    }
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>Заморозить</span>
                </label>
                <div className={styles.statusHint}>
                  <span
                    className={
                      formData.isSuspended ? styles.suspendedLabel : styles.activeLabel
                    }
                  >
                    {formData.isSuspended ? '(Заморожен)' : '(Активен)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <FilledColorButton
              onClick={() => handleSubmit(new Event('submit') as any)}
              mainColor="#ffffff"
              additionalColor="#f39c12"
            >
              {user ? 'Сохранить' : 'Создать'}
            </FilledColorButton>

            <FilledColorButton onClick={onCancel}>Отмена</FilledColorButton>
          </div>
        </form>
      </article>
    </dialog>,
    document.getElementById('modal-root')!
  );
};

export default UserEditModal;