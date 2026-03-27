import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './AutocompleteInput.module.css';

interface SavedQuery {
  name: string;
  body: string;
}

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

  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsListRef = useRef<HTMLUListElement | null>(null);
  const suggestionItemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const splitQuery = useCallback((str: string): string[] => {
    return str.split(/\s*(&|\|\|)\s*/).map(s => s.trim()).filter(Boolean);
  }, []);

  const applySuggestion = useCallback((suggestion: string) => {
    const segments = splitQuery(value);
    if (!segments.length) {
      onChange(suggestion);
      return;
    }
    const lastSegment = segments[segments.length - 1];
    let foundOperator: string | null = null;
    let operatorIndex = -1;

    for (const op of operators) {
      const i = lastSegment.indexOf(op);
      if (i !== -1) {
        foundOperator = op;
        operatorIndex = i;
        break;
      }
    }

    if (foundOperator) {
      const fieldPart = lastSegment.substring(0, operatorIndex);
      const newSegment = fieldPart + foundOperator + suggestion;
      segments[segments.length - 1] = newSegment;
    } else {
      segments[segments.length - 1] = suggestion;
    }

    onChange(segments.join(' '));
    setActiveIndex(-1);
    setShowSuggestions(false);
  }, [value, onChange, splitQuery, operators]);

  const getDistinctValuesForEnField = useCallback((enField: string): string[] => {
    const setOfValues = new Set<string>();
    rowsData.forEach(row => {
      const val = row[enField];
      if (val !== undefined && val !== null) {
        let displayValue: string;
        if (typeof val === 'boolean') {
          displayValue = val ? 'Да' : 'Нет';
        } else {
          displayValue = String(val);
        }
        setOfValues.add(displayValue);
      }
    });
    return Array.from(setOfValues).map(capitalizeFirst);
  }, [rowsData]);

  const getSuggestions = useCallback(() => {
    const segments = splitQuery(value);
    if (!segments.length) {
      return ruFields.map(capitalizeFirst);
    }
    const lastSegment = segments[segments.length - 1].toLowerCase();

    let foundOperator: string | null = null;
    for (const op of operators) {
      if (lastSegment.includes(op)) {
        foundOperator = op;
        break;
      }
    }

    if (!foundOperator) {
      return ruFields
        .filter((f) => f.startsWith(lastSegment))
        .map(capitalizeFirst);
    } else {
      const operatorIndex = lastSegment.indexOf(foundOperator);
      const fieldPart = lastSegment.substring(0, operatorIndex).trim();
      const valuePart = lastSegment.substring(operatorIndex + foundOperator.length).trim();

      const enField = ruToEnMap[fieldPart];
      if (!enField) {
        return [];
      }
      if (foundOperator === '=' || foundOperator === '!=') {
        const distinctVals = getDistinctValuesForEnField(enField);
        if (!valuePart) {
          return distinctVals;
        } else {
          return distinctVals.filter(val =>
            val.toLowerCase().includes(valuePart)
          );
        }
      } else {
        return [];
      }
    }
  }, [value, splitQuery, ruFields, operators, ruToEnMap, getDistinctValuesForEnField]);

  useEffect(() => {
    if (showSuggestions) {
      const s = getSuggestions().filter((item) => item.trim() !== '');
      setSuggestions(s);
    } else {
      setSuggestions([]);
    }
  }, [value, showSuggestions, getSuggestions]);

  useEffect(() => {
    if (!showSuggestions) {
      setSavedQueryCycleIndex(-1);
      setShowCycleIndicator(false);
    }
  }, [showSuggestions]);

  useEffect(() => {
    setSavedQueryCycleIndex(-1);
    setShowCycleIndicator(false);
  }, [savedQueries.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {

    console.log('🎹 Key:', e.key, '| Ctrl:', e.ctrlKey, '| Meta:', e.metaKey, '| Shift:', e.shiftKey);
  // 🔥 Ctrl+ArrowDown / Ctrl+ArrowUp — цикл по сохранённым запросам
  // (работает даже когда список подсказок закрыт)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    e.stopPropagation();

    if (savedQueries.length === 0) return;

    const direction = e.key === 'ArrowDown' ? 1 : -1;
    const newIndex = (savedQueryCycleIndex + direction + savedQueries.length) % savedQueries.length;
    
    setSavedQueryCycleIndex(newIndex);
    const selected = savedQueries[newIndex];
    
    onChange(selected.body);
    setShowCycleIndicator(true);
    
    onCycleSavedQuery?.(selected, newIndex, savedQueries.length);
    
    // Скрыть индикатор через 2 секунды
    setTimeout(() => setShowCycleIndicator(false), 2000);
    
    return;
  }

  // ESC: сначала закрываем список, потом снимаем фокус
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();

    if (showSuggestions) {
      setShowSuggestions(false);
      setActiveIndex(-1);
    } else {
      inputRef.current?.blur();
    }
    return;
  }

  // Ctrl+Space: переключатель (открыть/закрыть)
  if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
    e.preventDefault();
    e.stopPropagation();
    setShowSuggestions(prev => !prev);
    setActiveIndex(-1);
    return;
  }

  // Если список подсказок открыт — обрабатываем навигацию по нему
  if (showSuggestions && suggestions.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        applySuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Tab') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        applySuggestion(suggestions[activeIndex]);
      }
    }
  }
};

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
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

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && suggestionItemRefs.current[activeIndex] && suggestionsListRef.current) {
      const activeItem = suggestionItemRefs.current[activeIndex];
      const list = suggestionsListRef.current;

      if (activeItem && list) {
        activeItem.scrollIntoView({
          block: 'nearest',
          behavior: 'auto'
        });
      }
    }
  }, [activeIndex]);

  return (
    <div
      role="combobox"
      aria-expanded={showSuggestions}
      className={styles.inputWrapper}
      style={{ width, minWidth }}
    >
      <input
        role="searchbox"
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
      {typeof resultsCount === 'number' && (
        <div className={styles.resultsBadge}>
          {resultsCount}
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          ref={suggestionsListRef}
          role="listbox"
          className={styles.suggestions}
        >
          {suggestions.map((item, idx) => (
            <li
              key={`suggest_${idx}_${item}`}
              ref={el => { suggestionItemRefs.current[idx] = el; }}
              className={idx === activeIndex ? styles.suggestionItemActive : styles.suggestionItem}
              onMouseDown={() => applySuggestion(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      {showCycleIndicator && savedQueryCycleIndex >= 0 && savedQueries[savedQueryCycleIndex] && (
        <div className={styles.cycleIndicator} aria-live="polite">
          📑 {savedQueries[savedQueryCycleIndex].name} ({savedQueryCycleIndex + 1}/{savedQueries.length})
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;