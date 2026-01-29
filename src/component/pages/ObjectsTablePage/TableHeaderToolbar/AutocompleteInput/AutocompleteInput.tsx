import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AutocompleteInput.css';

interface AutocompleteInputProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  ruFields: string[];
  operators?: string[];
  rowsData: Record<string, unknown>[];
  ruToEnMap: Record<string, string>;
  width?: string;
}

/**
 * Делает первую букву заглавной.
 */
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
  width = '300px',
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Для Ctrl+Z/Ctrl+Shift+Z
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Если хотим, чтобы и ArrowDown/ArrowUp/Enter работали:
    if (!showSuggestions || suggestions.length === 0) {
      // Если пользователь жмёт Ctrl+Z — не мешаем
      return;
    }

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
  };

  const handleFocus = () => {
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setActiveIndex(-1);
    setShowSuggestions(true);
  };

  /**
   * Разделяем строку по & или ||, упрощённо — чтобы автокомплит понимал последний сегмент.
   */
  const splitQuery = useCallback((str: string): string[] => {
    return str.split(/\s*(&|\|\|)\s*/).map(s => s.trim()).filter(Boolean);
}, []);

  /**
   * Заменяет только часть после оператора (если оператор есть).
   * Например, "Класс=Спе" + "Специалист" => "Класс=Специалист".
   */
  const applySuggestion = (suggestion: string) => {
    const segments = splitQuery(value);
    if (!segments.length) {
      onChange(suggestion);
      return;
    }
    const lastSegment = segments[segments.length - 1];
    let foundOperator: string | null = null;
    let operatorIndex = -1;

    for (const op of operators!) {
      const i = lastSegment.indexOf(op);
      if (i !== -1) {
        foundOperator = op;
        operatorIndex = i;
        break;
      }
    }

    if (foundOperator) {
      // Разделим lastSegment , заменим valuePart
      const fieldPart = lastSegment.substring(0, operatorIndex);
      const newSegment = fieldPart + foundOperator + suggestion;
      segments[segments.length - 1] = newSegment;
    } else {
      // Нет оператора — просто подменяем
      segments[segments.length - 1] = suggestion;
    }

    onChange(segments.join(' '));
    setActiveIndex(-1);
    setShowSuggestions(false);
  };

  /**
   * Собираем уникальные значения поля enField из rowsData, капитализируем.
   */
  const getDistinctValuesForEnField = useCallback((enField: string): string[] => {
    const setOfValues = new Set<string>();
    rowsData.forEach(row => {
      const val = row[enField];
      if (val !== undefined && val !== null) {
        setOfValues.add(String(val));
      }
    });
    return Array.from(setOfValues).map(capitalizeFirst);
  }, [rowsData]);

  /**
   * Формируем подсказки:
   *  - Если нет оператора => поля
   *  - Если = или != => значения
   *  - Если > или < => возвращаем []
   */
  const getSuggestions = useCallback(() => {
    const segments = splitQuery(value);
    if (!segments.length) {
      // Пусто - подсказываем все поля
      return ruFields.map(capitalizeFirst);
    }
    const lastSegment = segments[segments.length - 1].toLowerCase();

    let foundOperator: string | null = null;
    for (const op of operators!) {
      if (lastSegment.includes(op)) {
        foundOperator = op;
        break;
      }
    }

    if (!foundOperator) {
      // поля, начинающиеся на lastSegment
      return ruFields
        .filter((f) => f.startsWith(lastSegment))
        .map(capitalizeFirst);
    } else {
      // Делим по foundOperator
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
        // > or < => не подсказываем
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

  return (
    <div role="combobox" aria-expanded={showSuggestions} className="autocomplete-input-wrapper" style={{ width }}>
      <input 
        role="searchbox"
        ref={inputRef}
        className="autocomplete-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul 
          role="listbox"
          className="autocomplete-suggestions">
          {suggestions.map((item, idx) => (
            <li
              key={`suggest_${idx}_${item}`} 
              className={idx === activeIndex ? 'suggestion-item active' : 'suggestion-item'}
              onMouseDown={() => applySuggestion(item)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;