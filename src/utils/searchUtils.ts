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
  export function parseSearchQuery(query: string): ConditionGroup[] {
    // 1) Делим по "||"
    const orParts = query.split('||').map(p => p.trim()).filter(Boolean);
  
    const groups: ConditionGroup[] = [];
  
    orParts.forEach((part) => {
      // part может быть "Класс=Специалист & Возраст>18"
      const andParts = part.split('&').map(x => x.trim()).filter(Boolean);
  
      const conditions: SearchCondition[] = [];
      for (const piece of andParts) {
        let match: RegExpExecArray | null = null;
  
        // "класс>специалист"
        if ((match = /^([^><!=]+)>(.+)$/.exec(piece)) !== null) {
          const [, field, val] = match;
          // Проверяем, есть ли значение
          if (val.trim()) {
            conditions.push({
              ruField: field.trim(),
              operator: '>',
              value: val.trim()
            });
          }
          continue;
        }
        // "класс<специалист"
        if ((match = /^([^><!=]+)<(.+)$/.exec(piece)) !== null) {
          const [, field, val] = match;
          if (val.trim()) {
            conditions.push({
              ruField: field.trim(),
              operator: '<',
              value: val.trim()
            });
          }
          continue;
        }
        // "класс=специалист"
        if ((match = /^([^><!=]+)=(.+)$/.exec(piece)) !== null) {
          const [, field, val] = match;
          if (val.trim()) {
            conditions.push({
              ruField: field.trim(),
              operator: '=',
              value: val.trim()
            });
          }
          continue;
        }
        // "класс!=специалист"
        if ((match = /^([^><!=]+)!=(.+)$/.exec(piece)) !== null) {
          const [, field, val] = match;
          if (val.trim()) {
            conditions.push({
              ruField: field.trim(),
              operator: '!=',
              value: val.trim()
            });
          }
          continue;
        }
        // Если ни один шаблон не подошёл, просто игнорируем этот кусок
        // (например, "класс=" без значения => пропускаем)
      }
  
      // Если в группе есть хотя бы одно условие, добавим её
      if (conditions.length > 0) {
        groups.push(conditions);
      }
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