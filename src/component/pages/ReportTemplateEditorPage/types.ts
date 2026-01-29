import { FieldOption } from '@services/ReportTemplateService';

export interface PanelState {
  isCollapsed: boolean;
  width: number;
}

export interface FieldGroup {
  key: string;
  title: string;
  fields: FieldOption[];
}

export interface TemplateState {
  file: File | null;
  fileName: string | null;
  usedFields: FieldOption[];
  fieldGroups: FieldGroup[];
  expandedGroups: Record<string, boolean>;
  requiredFields: Set<string>;
  jsonSchema: string;
  isLoading: boolean;
}