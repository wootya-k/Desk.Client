export interface SearchCondition {
    ruField: string;
    operator: string;
    value: string;
}

export type ConditionGroup = SearchCondition[];

export function parseSearchQuery(query: string): ConditionGroup[] {
    let normalized = query
        .replace(/\s+и\s+/gi, ' & ')
        .replace(/\s+или\s+/gi, ' || ')
        .trim();

    const isWrappedInParens = (s: string): boolean => {
        s = s.trim();
        if (!s.startsWith('(') || !s.endsWith(')')) return false;
        let depth = 0;
        for (let i = 0; i < s.length; i++) {
            if (s[i] === '(') depth++;
            else if (s[i] === ')') {
                depth--;
                if (depth === 0) return i === s.length - 1;
            }
        }
        return false;
    };

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

    const stripOuterParens = (s: string): string => {
        let str = s.trim();
        while (isWrappedInParens(str)) {
            str = str.slice(1, -1).trim();
        }
        return str;
    };

    const orParts = smartSplit(normalized, '||').filter(Boolean);
    const groups: ConditionGroup[] = [];

    orParts.forEach((part) => {
        let andPart = stripOuterParens(part);
        const andParts = smartSplit(andPart, '&').map(stripOuterParens).filter(Boolean);
        const conditions: SearchCondition[] = [];

        for (const piece of andParts) {
            if (!piece) continue;
            let match: RegExpExecArray | null = null;

            if ((match = /^([^><!=]+)>=(.+)$/.exec(piece)) !== null) {
                const [, field, val] = match;
                if (val.trim()) conditions.push({ ruField: field.trim(), operator: '>=', value: val.trim() });
                continue;
            }
            if ((match = /^([^><!=]+)<=(.+)$/.exec(piece)) !== null) {
                const [, field, val] = match;
                if (val.trim()) conditions.push({ ruField: field.trim(), operator: '<=', value: val.trim() });
                continue;
            }
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
        }

        if (conditions.length > 0) groups.push(conditions);
    });

    return groups;
}

export function checkRowAgainstConditionGroups(
    row: Record<string, unknown>,
    groups: ConditionGroup[],
    ruToEnMap: Record<string, string>
): boolean {
    for (const group of groups) {
        let allMatch = true;
        for (const cond of group) {

            if (cond.ruField.toLowerCase() === 'возраст') {
                const age = row['computed_age'] as number | null | undefined;
                if (age === null || age === undefined) { allMatch = false; break; }
                
                const condNum = parseFloat(cond.value);
                if (isNaN(condNum)) { allMatch = false; break; }

                switch (cond.operator) {
                    case '>':  if (age <= condNum) allMatch = false; break;
                    case '<':  if (age >= condNum) allMatch = false; break;
                    case '>=': if (age <  condNum) allMatch = false; break;
                    case '<=': if (age >  condNum) allMatch = false; break;
                    case '=':  if (age !== condNum) allMatch = false; break;
                    case '!=': if (age === condNum) allMatch = false; break;
                    default: allMatch = false;
                }
                if (!allMatch) break;
                continue;
            }

            const enField = ruToEnMap[cond.ruField.toLowerCase()];
            if (!enField) { allMatch = false; break; }

            const rowVal = row[enField];
            if (rowVal === undefined || rowVal === null) { allMatch = false; break; }

            const condStr = cond.value.toLowerCase();

            if (condStr === '[битая ссылка]') {
                const isRef = /^ref\(/i.test(String(rowVal).trim());
                if (cond.operator === '=') {
                    if (!isRef) allMatch = false;
                } else if (cond.operator === '!=') {
                    if (isRef) allMatch = false;
                } else {
                    allMatch = false;
                }
                if (!allMatch) break;
                continue;
            }

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

            const rowStr = String(rowVal).toLowerCase().trim();

            switch (cond.operator) {
                case '>':
                    if (isNaN(+rowStr) || isNaN(+condStr)) allMatch = false;
                    else if (+rowStr <= +condStr) allMatch = false;
                    break;
                case '<':
                    if (isNaN(+rowStr) || isNaN(+condStr)) allMatch = false;
                    else if (+rowStr >= +condStr) allMatch = false;
                    break;
                case '>=':
                    if (isNaN(+rowStr) || isNaN(+condStr)) allMatch = false;
                    else if (+rowStr < +condStr) allMatch = false;
                    break;
                case '<=':
                    if (isNaN(+rowStr) || isNaN(+condStr)) allMatch = false;
                    else if (+rowStr > +condStr) allMatch = false;
                    break;
                case '=':
                    if (!rowStr.includes(condStr)) allMatch = false;
                    break;
                case '!=':
                    if (rowStr.includes(condStr)) allMatch = false;
                    break;
                default:
                    allMatch = false;
            }
            if (!allMatch) break;
        }
        if (allMatch) return true;
    }
    return false;
}

export function getFieldFragmentForAutocomplete(input: string): string | null {
    const normalized = input
        .replace(/\s+и\s+/gi, ' & ')
        .replace(/\s+или\s+/gi, ' || ');

    const lastStart = Math.max(
        normalized.lastIndexOf('('),
        normalized.lastIndexOf('&'),
        normalized.lastIndexOf('||'),
        -1
    );

    const afterStart = normalized.slice(lastStart + 1).trim();

    if (/^[=<>!]/.test(afterStart)) return null;

    const fieldMatch = /^[^=<>!&|)]+/.exec(afterStart);
    const fragment = fieldMatch?.[0].trim();

    if (fragment && /^[a-zA-Zа-яА-ЯёЁ]/.test(fragment) && !/^[иИ|&]+$/.test(fragment)) {
        return fragment;
    }

    return null;
}