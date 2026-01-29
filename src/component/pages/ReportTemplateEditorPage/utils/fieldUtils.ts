import { FieldExplorerData, FieldOption } from '@services/ReportTemplateService';
import { FieldGroup } from '../types';

export const flattenFieldGroups = (data: FieldExplorerData): FieldGroup[] => {
  const groups: FieldGroup[] = [];

  const addGroup = (key: string, title: string, fields?: FieldOption[]) => {
    if (fields && fields.length > 0) {
      groups.push({ key, title, fields });
    }
  };

  addGroup('userGroup', data.userGroup?.title || 'Данные пользователя', data.userGroup?.fields);
  addGroup('targetGroup', data.targetGroup?.title || 'Целевые данные', data.targetGroup?.fields);
  addGroup('firstLevelGroups', data.firstLevelGroups?.title || 'Группы первого уровня', data.firstLevelGroups?.fields);
  addGroup('secondLevelGroups', data.secondLevelGroups?.title || 'Группы второго уровня', data.secondLevelGroups?.fields);

  return groups;
};

export const restoreUsedFields = (
  allFields: FieldOption[],
  schemaProperties: Record<string, any>,
  initialUsedPaths: Set<string>
): FieldOption[] => {
  return allFields.filter(field => 
    schemaProperties.hasOwnProperty(field.path) || initialUsedPaths.has(field.path)
  );
};