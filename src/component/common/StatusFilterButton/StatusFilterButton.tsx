import React, { FC, useState, useRef, useEffect } from 'react';
import styles from './StatusFilterButton.module.css';

interface StatusFilterButtonProps {
  value: 'true' | 'false' | 'all';
  onChange: (value: 'true' | 'false' | 'all') => void;
  height?: string;
  width?: string;
  mainColor?: string;
  additionalColor?: string;
}

const StatusFilterButton: FC<StatusFilterButtonProps> = ({
  value = 'true',
  onChange,
  height = '44px',
  width = '130px',
  mainColor = '#ffffff',
  additionalColor = '#27ae60',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: 'true' as const, label: 'Активные', icon: '✓', color: '#27ae60' },
    { value: 'all' as const, label: 'Все', icon: '∞', color: '#3498db' },
    { value: 'false' as const, label: 'Неактивные', icon: '✕', color: '#e74c3c' },
  ];

  const currentOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue: 'true' | 'false' | 'all') => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  const getIconColor = () => {
    if (isHovered || isOpen) return mainColor;
    return currentOption.color;
  };

  return (
    <div className={styles.wrapper} ref={buttonRef}>
      <button
        className={`${styles.button} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ['--main-color' as string]: mainColor,
          ['--hover-color' as string]: additionalColor,
          height,
          width,
        }}
      >
        <span 
          className={styles.icon}
          style={{ color: getIconColor() }}
        >
          {currentOption.icon}
        </span>
        <span className={styles.label}>{currentOption.label}</span>
        <svg
          className={`${styles.arrow} ${isOpen ? styles.arrowUp : ''}`}
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
        >
          <path
            d="M1 1.5L6 6.5L11 1.5"
            stroke={getIconColor()}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.map((option) => (
            <button
              key={option.value}
              className={`${styles.dropdownItem} ${value === option.value ? styles.active : ''}`}
              onClick={() => handleSelect(option.value)}
              style={{
                ['--option-color' as string]: option.color,
              }}
            >
              <span className={styles.dropdownIcon}>{option.icon}</span>
              <span className={styles.dropdownLabel}>{option.label}</span>
              {value === option.value && (
                <span className={styles.checkmark}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusFilterButton;