// searchUtils.ts
export interface SearchCondition {
    ruField: string;   // например "класс"
    operator: string;  // "=", "!=", ">", "<"
    value: string;     // например "Специалист"
  }
  
  // Массив условий = одна группа (AND),
  // Массив таких групп = OR (||).
  export type ConditionGroup = SearchCondition[];
  
  
  // parseSearchQuery: 
  //  • cтроку вроде: "Класс=Специалист & Возраст>18 || Класс=Рабочий" 
  //  • разбиваем по "||" => 2 группы ( OR ) 
  //  • внутри каждой группы разбиваем по "&" => несколько условий ( AND )
  //  • если условие "класс=" без значения, пропускаем
  //  • если итоговая группа пустая, не добавляем её
  // searchUtils.ts

// searchUtils.ts

export function parseSearchQuery(query: string): ConditionGroup[] {
    // 🔹 Нормализация: заменяем русские операторы на символы
    let normalized = query
        .replace(/\s+и\s+/gi, ' & ')      // "и" → &
        .replace(/\s+или\s+/gi, ' || ')   // "или" → ||
        .trim();

    // 🔹 Проверка: строка обёрнута в парные скобки?
    const isWrappedInParens = (s: string): boolean => {
        s = s.trim();
        if (!s.startsWith('(') || !s.endsWith(')')) return false;
        let depth = 0;
        for (let i = 0; i < s.length; i++) {
            if (s[i] === '(') depth++;
            else if (s[i] === ')') {
                depth--;
                if (depth === 0) return i === s.length - 1; // закрывающая скобка в конце
            }
        }
        return false;
    };

    // 🔹 Умное разбиение строки с учётом вложенных скобок
    const smartSplit = (str: string, delimiter: string): string[] => {
        const result: string[] = [];
        let current = '';
        let depth = 0;
        const delimLen = delimiter.length;
        
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '(') {
                depth++;
                current += char;
            } else if (char === ')') {
                depth--;
                current += char;
            } else if (depth === 0 && str.slice(i, i + delimLen) === delimiter) {
                result.push(current.trim());
                current = '';
                i += delimLen - 1;
            } else {
                current += char;
            }
        }
        if (current.trim()) result.push(current.trim());
        return result;
    };

    // 🔹 Убирает внешние скобки у отдельного куска
    const stripOuterParens = (s: string): string => {
        let str = s.trim();
        while (isWrappedInParens(str)) {
            str = str.slice(1, -1).trim();
        }
        return str;
    };

    // === Основной парсинг ===
    const orParts = smartSplit(normalized, '||').filter(Boolean);
    const groups: ConditionGroup[] = [];

    orParts.forEach((part) => {
        // Если вся OR-часть в скобках — убираем их
        let andPart = stripOuterParens(part);
        
        // Делим на AND-условия (с учётом скобок внутри!)
        const andParts = smartSplit(andPart, '&').map(stripOuterParens).filter(Boolean);
        const conditions: SearchCondition[] = [];

        for (const piece of andParts) {
            if (!piece) continue;
            let match: RegExpExecArray | null = null;

            // Парсим операторы (порядок важен: != перед =)
            if ((match = /^([^><!=]+)!=(.+)$/.exec(piece)) !== null) {
                const [, field, val] = match;
                if (val.trim()) conditions.push({ ruField: field.trim(), operator: '!=', value: val.trim() });
                continue;
            }
            if ((match = /^([^><!=]+)>(.+)$/.exec(piece)) !== null) {
                const [, field, val] = match;
                if (val.trim()) conditions.push({ ruField: field.trim(), operator: '>', value: val.trim() });
                continue;
            }
            if ((match = /^([^><!=]+)<(.+)$/.exec(piece)) !== null) {
                const [, field, val] = match;
                if (val.trim()) conditions.push({ ruField: field.trim(), operator: '<', value: val.trim() });
                continue;
            }
            if ((match = /^([^><!=]+)=(.+)$/.exec(piece)) !== null) {
                const [, field, val] = match;
                if (val.trim()) conditions.push({ ruField: field.trim(), operator: '=', value: val.trim() });
                continue;
            }
            // Не распознали — игнорируем
        }

        if (conditions.length > 0) groups.push(conditions);
    });

    return groups;
}
  
  // checkRowAgainstConditionGroups:
  //  • Перебираем каждую группу (OR), внутри группы все условия (AND).
  //  • Если хотя бы одна группа вернула true => общий результат true.
 export function checkRowAgainstConditionGroups(
  row: Record<string, unknown>,
  groups: ConditionGroup[],
  ruToEnMap: Record<string, string>
): boolean {
  // OR
  for (const group of groups) {
    let allMatch = true; // AND
    for (const cond of group) {
      const enField = ruToEnMap[cond.ruField.toLowerCase()];
      if (!enField) {
        allMatch = false;
        break;
      }
      const rowVal = row[enField];
      if (rowVal === undefined || rowVal === null) {
        allMatch = false;
        break;
      }
      
      const condStr = cond.value.toLowerCase();
      
      // Special handling for boolean values with "Да"/"Нет"
      if (typeof rowVal === 'boolean') {
        const expectedBool = condStr === 'да';
        switch (cond.operator) {
          case '=':
            if (rowVal !== expectedBool) allMatch = false;
            break;
          case '!=':
            if (rowVal === expectedBool) allMatch = false;
            break;
          default:
            allMatch = false;
        }
        if (!allMatch) break;
        continue;
      }
      
      const rowStr = String(rowVal).toLowerCase();

      switch (cond.operator) {
        case '>':
          if (isNaN(+rowStr) || isNaN(+condStr)) {
            allMatch = false; 
          } else {
            if (+rowStr <= +condStr) allMatch = false;
          }
          break;
        case '<':
          if (isNaN(+rowStr) || isNaN(+condStr)) {
            allMatch = false;
          } else {
            if (+rowStr >= +condStr) allMatch = false;
          }
          break;
        case '=':
          if (!rowStr.includes(condStr)) {
            allMatch = false;
          }
          break;
        case '!=':
          if (rowStr === condStr) {
            allMatch = false;
          }
          break;
        default:
          allMatch = false;
      }
      if (!allMatch) break;
    }
    if (allMatch) {
      return true;
    }
  }

  return false;
}

// 🔍 Извлекает фрагмент для подсказки имён полей
// Возвращает то, что пользователь сейчас вводит как имя поля
export function getFieldFragmentForAutocomplete(input: string): string | null {
    // Нормализуем операторы
    const normalized = input
        .replace(/\s+и\s+/gi, ' & ')
        .replace(/\s+или\s+/gi, ' || ');
    
    // Находим "активную" часть: после последнего разделителя до оператора условия
    // Разделители: начало строки, (, &, ||
    // Конец фрагмента: =, >, <, !=, &, ||, ), конец строки
    
    // Ищем последний потенциальный старт поля
    const lastStart = Math.max(
        normalized.lastIndexOf('('),
        normalized.lastIndexOf('&'),
        normalized.lastIndexOf('||'),
        -1
    );
    
    const afterStart = normalized.slice(lastStart + 1).trim();
    
    // Если после разделителя сразу оператор (=, >, <) — значит вводим значение, не поле
    if (/^[=<>!]/.test(afterStart)) return null;
    
    // Берём всё до первого оператора условия
    const fieldMatch = /^[^=<>!&|)]+/.exec(afterStart);
    const fragment = fieldMatch?.[0].trim();
    
    // Фильтруем: фрагмент должен начинаться с буквы и не быть оператором
    if (fragment && /^[a-zA-Zа-яА-ЯёЁ]/.test(fragment) && !/^[иИ|&]+$/.test(fragment)) {
        return fragment;
    }
    
    return null;
}