export interface Schema {
    id: string;
    type: string;
    schema: object;
}

export interface JsonSchema {
    properties: { [key: string]: { title?: string; $ref?: string } };
}


export interface SchemaFilter {
    id: string;
    type: string;
    schema: object;
    schemaForms: object;
    data: object;
}

export interface RawDetailItem {
    id: string;
    type: string; 
    schema: string;
    uiSchema: string;
    data: string; 
}

export interface RawDataItem {
    id: string; 
    value: string;
    status: boolean
}

export interface ObjectView {
    id: string;
    type: string;
    view: string;
}
export interface Connection {
    from: string;
    to: string;
    fromPanel: string;
    toPanel: string;
}
export interface DetailEntity {
    id: string;
    type: string;
    schema: object;
    uiSchema: object;
    data: object;
}

export interface ObjectRecord {
    id: string;
    value: string;
    status: boolean;
}

export interface ObjectType {
    id: string;
    name: string;
    viewCategory: string;
    refs: string[]; // Добавляем поле refs
}

export interface SelectedObjectType extends ObjectType {
    selected?: boolean;
}

export type TableSettings = {
  [key: string]: number;
};

export type MergedColumn = {
  key: string;
  visible: boolean;
  order: number;
};

export type FormData = Record<string, unknown>;

export interface ChangeHistory {
  userLogin?: string;
  stamp?: string;
  value: string;
}

export type ObjectEditMode = 'create' | 'edit';