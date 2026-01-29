import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { login } from '@services/AuthService';
import styles from './LoginPage.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

type FormValues = {
  username: string;
  password: string;
};

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
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

  // Регистрируем поля с refs
  const usernameRegister = register('username', { required: 'Обязательное поле' });
  const passwordRegister = register('password', { 
    required: 'Обязательное поле',
    minLength: {
      value: 6,
      message: 'Минимум 6 символов'
    }
  });

  // Обработчик сброса формы
  const handleReset = () => {
    reset();
    setError(null);
    setLoading(false);
    // Снимаем фокус со всех полей
    usernameRef.current?.blur();
    passwordRef.current?.blur();
  };

  // Найти первое пустое поле
  const findFirstEmptyField = (): 'username' | 'password' | null => {
    if (!formValues.username?.trim()) return 'username';
    if (!formValues.password?.trim()) return 'password';
    return null;
  };

  // Обработчик Enter без фокуса
  const handleGlobalEnter = () => {
    const emptyField = findFirstEmptyField();
    
    if (emptyField === 'username') {
      usernameRef.current?.focus();
    } else if (emptyField === 'password') {
      passwordRef.current?.focus();
    } else {
      // Все поля заполнены - отправляем форму
      handleSubmit(onSubmit)();
    }
  };

  // Обработчик ESC для сброса формы
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleReset();
      }
      
      // Enter без фокуса на элементах формы
      if (e.key === 'Enter' && !formRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        handleGlobalEnter();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formValues]);

  // Обработчик Enter в полях ввода
  const handleEnterPress = (currentField: 'username' | 'password') => {
    if (currentField === 'username') {
      // Переход к паролю
      passwordRef.current?.focus();
    } else {
      // В пароле - ищем следующее пустое поле или отправляем
      const emptyField = findFirstEmptyField();
      if (emptyField === 'username') {
        usernameRef.current?.focus();
      } else {
        // Все поля заполнены - отправляем форму
        handleSubmit(onSubmit)();
      }
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setLoading(true);
    setError(null);
    
    try {
      await login(data.username, data.password);
      navigate('/');
    } catch (err) {
      let message = 'Ошибка авторизации';
      
      if (err instanceof Error) {
        if (err.message.includes("Неверный пароль")) {
          message = "Неверный пароль";
        } else if (err.message.includes("Пользователь не найден")) {
          message = "Пользователь не найден";
        } else {
          message = err.message;
        }
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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

          {error && <div className={styles.errorMessage}>{error}</div>}
        </form>
      </div>
    </main>
  );
};

export default LoginPage;