import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './AutocompleteInput.module.css';

interface SavedQuery { name: string; body: string; }

interface AutocompleteInputProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  ruFields: string[];
  operators?: string[];
  rowsData: Record<string, unknown>[];
  ruToEnMap: Record<string, string>;
  resultsCount?: number;
  width?: string;
  minWidth?: string;
  savedQueries?: SavedQuery[];
  onCycleSavedQuery?: (query: SavedQuery, index: number, total: number) => void;
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1);
}

const findLastSegmentStart = (str: string): number => {
  let maxPos = -1;
  const check = (sep: string, shift: number) => {
    const p = str.lastIndexOf(sep);
    if (p !== -1 && p + shift > maxPos) maxPos = p + shift;
  };
  
  // 🔥 Ключевое исправление: сдвиги, чтобы разделитель оставался в префиксе
  check('(', 1);      // после "(" → префикс включает "("
  check('&', 1);      // после "&" → префикс включает "&"
  check('||', 2);     // после "||" → префикс включает "||"
  check(' и ', 3);    // после " и "
  check(' и', 2);     // после " и" (без пробела в конце)
  check(' или ', 5);  // после " или "
  check(' или', 4);   // после " или" (без пробела в конце)
  
  return Math.max(0, maxPos);
};

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = 'Поиск...',
  ruFields,
  operators = ['>', '<', '=', '!='],
  rowsData,
  ruToEnMap,
  resultsCount,
  width = '300px',
  minWidth = '220px',
  savedQueries = [],
  onCycleSavedQuery,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [savedQueryCycleIndex, setSavedQueryCycleIndex] = useState(-1);
  const [showCycleIndicator, setShowCycleIndicator] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsListRef = useRef<HTMLUListElement>(null);
  const suggestionItemRefs = useRef<(HTMLLIElement | null)[]>([]);
  
  // 🔥 Реф для отмены автозакрытия списка после клика по подсказке
  const blurTimeoutRef = useRef<number | null>(null);

  // 🔹 Кэш значений полей
  const fieldValuesCache = useMemo(() => {
    const cache: Record<string, string[]> = {};
    ruFields.forEach(ruField => {
      const enField = ruToEnMap[ruField.toLowerCase()];
      if (!enField) return;
      const values = new Set<string>();
      rowsData.forEach(row => {
        const val = row[enField];
        if (val == null) return;
        const display = typeof val === 'boolean' ? (val ? 'Да' : 'Нет') : String(val);
        values.add(capitalizeFirst(display));
      });
      cache[ruField] = Array.from(values).sort();
    });
    return cache;
  }, [rowsData, ruFields, ruToEnMap]);

  // 🔹 Логика подсказок
  const computeSuggestions = useCallback(() => {
    const input = value.trim();
    if (!input) return ruFields.map(capitalizeFirst);

    const segStart = findLastSegmentStart(input);
    let currentToken = input.slice(segStart).trim();

    // Пустой токен или чистый коннектор → предлагаем поля
    if (!currentToken || /^(и|или)$/i.test(currentToken)) {
      return ruFields.map(capitalizeFirst);
    }

    // Закрывающая скобка → коннекторы
    if (currentToken.endsWith(')')) {
      return ['и', 'или'];
    }

    // Парсим условие field<op>value
    let opFound: string | null = null;
    let opPos = -1;
    for (const op of ['!=', '=', '>', '<']) {
      const pos = currentToken.indexOf(op);
      if (pos !== -1) { opFound = op; opPos = pos; break; }
    }

    if (opFound) {
      const fieldName = currentToken.slice(0, opPos).trim().toLowerCase();
      const valPart = currentToken.slice(opPos + opFound.length).trim().toLowerCase();
      const enField = ruToEnMap[fieldName];

      if (!enField) {
        return ruFields.filter(f => f.toLowerCase().startsWith(fieldName)).map(capitalizeFirst);
      }
      if (!valPart) {
        return fieldValuesCache[fieldName] || [];
      }
      const allVals = fieldValuesCache[fieldName] || [];
      const exactMatch = allVals.some(v => v.toLowerCase() === valPart);
      
      if (exactMatch) {
        const openCount = (input.match(/\(/g) || []).length;
        const closeCount = (input.match(/\)/g) || []).length;
        const res = ['и', 'или'];
        if (openCount > closeCount) res.unshift(')');
        return res;
      }
      return allVals.filter(v => v.toLowerCase().includes(valPart));
    }

    // Нет оператора → печатаем имя поля
    const cleanToken = currentToken.replace(/^\s*\(/, '').trim();
    return ruFields.filter(f => f.toLowerCase().startsWith(cleanToken.toLowerCase())).map(capitalizeFirst);
  }, [value, ruFields, ruToEnMap, fieldValuesCache]);

  // 🔹 Обновление списка подсказок
  useEffect(() => {
    if (!showSuggestions) {
      setSuggestions([]);
      return;
    }
    const s = computeSuggestions().filter(Boolean);
    setSuggestions(s);
    setActiveIndex(-1);
  }, [value, showSuggestions, computeSuggestions]);

  // 🔹 Применение подсказки
  const applySuggestion = useCallback((suggestion: string) => {
    // 🔥 Отменяем закрытие списка по blur, если оно было запланировано
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

    if (suggestion === 'и' || suggestion === 'или') {
      onChange(`${value.trim()} ${suggestion} `);
    } else if (suggestion === ')') {
      onChange(`${value.trim()})`);
    } else {
      const segStart = findLastSegmentStart(value);
      const prefix = value.slice(0, segStart).trimEnd();
      const currentToken = value.slice(segStart).trim();

      let newToken = suggestion;
      for (const op of ['!=', '=', '>', '<']) {
        const idx = currentToken.indexOf(op);
        if (idx !== -1) {
          newToken = currentToken.slice(0, idx + op.length) + suggestion;
          break;
        }
      }

      const spacer = prefix && !prefix.endsWith(' ') && !prefix.endsWith('(') ? ' ' : '';
      onChange(prefix ? `${prefix}${spacer}${newToken}` : newToken);
    }
    
    // 🔥 Явно оставляем список открытым для следующего шага
    setShowSuggestions(true);
    setActiveIndex(-1);
  }, [value, onChange]);

  // 🔹 Клавиатура
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      if (!savedQueries.length) return;
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const newIdx = (savedQueryCycleIndex + dir + savedQueries.length) % savedQueries.length;
      setSavedQueryCycleIndex(newIdx);
      onChange(savedQueries[newIdx].body);
      setShowCycleIndicator(true);
      onCycleSavedQuery?.(savedQueries[newIdx], newIdx, savedQueries.length);
      setTimeout(() => setShowCycleIndicator(false), 1500);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (showSuggestions) { setShowSuggestions(false); setActiveIndex(-1); }
      else inputRef.current?.blur();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
      e.preventDefault();
      setShowSuggestions(v => !v);
      return;
    }

    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => (i + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          applySuggestion(suggestions[activeIndex]);
        }
      }
    }
  }, [showSuggestions, suggestions, activeIndex, savedQueries, savedQueryCycleIndex, onChange, applySuggestion, onCycleSavedQuery]);

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    // 🔥 Задержка перед закрытием, чтобы успел сработать клик по элементу
    blurTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }, 150);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setActiveIndex(-1);
    setShowSuggestions(true);
    setShowCycleIndicator(false);
  };

  useEffect(() => {
    if (activeIndex >= 0 && suggestionItemRefs.current[activeIndex]) {
      suggestionItemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div role="combobox" aria-expanded={showSuggestions} className={styles.inputWrapper} style={{ width, minWidth }}>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {typeof resultsCount === 'number' && <div className={styles.resultsBadge}>{resultsCount}</div>}
      
      {showSuggestions && suggestions.length > 0 && (
        <ul ref={suggestionsListRef} role="listbox" className={styles.suggestions}>
          {suggestions.map((item, idx) => (
            <li
              key={`${idx}_${item}`}
              ref={el => suggestionItemRefs.current[idx] = el}
              className={idx === activeIndex ? styles.suggestionItemActive : styles.suggestionItem}
              onMouseDown={(e) => { e.preventDefault(); applySuggestion(item); }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      
      {showCycleIndicator && savedQueryCycleIndex >= 0 && savedQueries[savedQueryCycleIndex] && (
        <div className={styles.cycleIndicator}>
          📑 {savedQueries[savedQueryCycleIndex].name} ({savedQueryCycleIndex + 1}/{savedQueries.length})
        </div>
      )}
    </div>
  );
};

export default React.memo(AutocompleteInput);