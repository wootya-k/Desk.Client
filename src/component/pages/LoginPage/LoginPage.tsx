import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { login } from '@services/AuthService';
import styles from './LoginPage.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

type FormValues = {
  username: string;
  password: string;
};

type ErrorType = 'generic' | 'suspended';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>('generic');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>();

  const formValues = watch();

  // Получаем URL, куда нужно вернуться после логина
  const getReturnUrl = (): string => {
    const returnUrlFromQuery = searchParams.get('returnUrl');
    if (returnUrlFromQuery) return returnUrlFromQuery;

    const state = location.state as { from?: string } | null;
    if (state?.from) return state.from;

    return '/';
  };

  const returnUrl = getReturnUrl();

  const usernameRegister = register('username', { required: 'Обязательное поле' });
  const passwordRegister = register('password', {
    required: 'Обязательное поле',
    minLength: {
      value: 6,
      message: 'Минимум 6 символов'
    }
  });

  const handleReset = useCallback(() => {
    reset();
    setError(null);
    setErrorType('generic');
    setLoading(false);
    usernameRef.current?.blur();
    passwordRef.current?.blur();
  }, [reset]);

  const findFirstEmptyField = useCallback((): 'username' | 'password' | null => {
    if (!formValues.username?.trim()) return 'username';
    if (!formValues.password?.trim()) return 'password';
    return null;
  }, [formValues.username, formValues.password]);

  const handleGlobalEnter = useCallback(() => {
    const emptyField = findFirstEmptyField();

    if (emptyField === 'username') {
      usernameRef.current?.focus();
    } else if (emptyField === 'password') {
      passwordRef.current?.focus();
    } else {
      handleSubmit(onSubmit)();
    }
  }, [findFirstEmptyField, handleSubmit]);

  // Обработчик ESC и Enter без фокуса
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleReset();
      }

      if (e.key === 'Enter' && !formRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        handleGlobalEnter();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleReset, handleGlobalEnter]);

  const handleEnterPress = (currentField: 'username' | 'password') => {
    if (currentField === 'username') {
      passwordRef.current?.focus();
    } else {
      const emptyField = findFirstEmptyField();
      if (emptyField === 'username') {
        usernameRef.current?.focus();
      } else {
        handleSubmit(onSubmit)();
      }
    }
  };

  // Классификация ошибки от бэкенда
  const classifyError = (err: unknown): { message: string; type: ErrorType } => {
    if (!(err instanceof Error)) {
      return { message: 'Ошибка авторизации', type: 'generic' };
    }

    const msg = err.message;

    // Заблокированный аккаунт — ключевые слова из AccountSuspendedException
    if (
      msg.includes('заблокирован') ||
      msg.includes('suspended') ||
      msg.includes('AccountSuspended')
    ) {
      return {
        message: 'Аккаунт заблокирован. Обратитесь к администратору.',
        type: 'suspended'
      };
    }

    if (msg.includes('Неверный пароль') || msg.includes('InvalidPassword')) {
      return { message: 'Неверный пароль', type: 'generic' };
    }

    if (msg.includes('Пользователь не найден') || msg.includes('not found')) {
      return { message: 'Пользователь не найден', type: 'generic' };
    }

    if (msg.includes('401') || msg.includes('403')) {
      return { message: 'Нет доступа. Проверьте учётные данные.', type: 'generic' };
    }

    return { message: msg || 'Ошибка авторизации', type: 'generic' };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true);
    setError(null);
    setErrorType('generic');

    try {
      await login(data.username, data.password);
      navigate(returnUrl, { replace: true });
    } catch (err) {
      const { message, type } = classifyError(err);
      setError(message);
      setErrorType(type);

      // При блокировке — очищаем только пароль, логин оставляем
      // (вдруг пользователь захочет попробовать другой аккаунт — он сам сотрёт)
      if (type === 'suspended') {
        reset({ username: data.username, password: '' });
        passwordRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  // CSS-класс ошибки в зависимости от типа
  const errorMessageClass =
    errorType === 'suspended'
      ? `${styles.errorMessage} ${styles.errorMessageSuspended ?? ''}`
      : styles.errorMessage;

  return (
    <main className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1
            className={styles.title}
            onClick={handleReset}
          >
            Учётный стол
          </h1>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit(onSubmit)}
          className={styles.form}
        >
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Логин"
              className={`${styles.input} ${errors.username ? styles.errorInput : ''}`}
              disabled={loading}
              autoComplete="username"
              {...usernameRegister}
              ref={(e) => {
                usernameRegister.ref(e);
                usernameRef.current = e;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEnterPress('username');
                }
              }}
            />
            {errors.username && (
              <p className={styles.errorText}>{errors.username.message}</p>
            )}
          </div>

          <div className={styles.inputGroup}>
            <input
              type="password"
              placeholder="Пароль"
              className={`${styles.input} ${errors.password ? styles.errorInput : ''}`}
              disabled={loading}
              autoComplete="current-password"
              {...passwordRegister}
              ref={(e) => {
                passwordRegister.ref(e);
                passwordRef.current = e;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEnterPress('password');
                }
              }}
            />
            {errors.password && (
              <p className={styles.errorText}>{errors.password.message}</p>
            )}
          </div>

          <div className={styles.buttonContainer}>
            <FilledColorButton
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              height="44px"
              width="360px"
            >
              {loading ? 'Вход...' : 'Войти'}
            </FilledColorButton>
          </div>

          {error && (
            <div className={errorMessageClass}>
              {errorType === 'suspended' && (
                <div className={styles.errorIcon}>🔒</div>
              )}
              <div className={styles.errorText}>
                <strong>{error}</strong>
                {errorType === 'suspended' && (
                  <p className={styles.errorHint}>
                    Если вы считаете, что это ошибка — свяжитесь с администратором системы.
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
};

export default LoginPage;