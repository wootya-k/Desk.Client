import { create } from 'zustand';

export type SchemaState = {
  schemas: Record<string, { schema: any; uiSchema: any }>;
  updateSchema: (objectType: string, schema: any, uiSchema: any) => void;
};

export const useEventStore = create<SchemaState>((set) => ({
  schemas: {},
  updateSchema: (objectType, schema, uiSchema) => 
    set((state) => ({
      schemas: {
        ...state.schemas,
        [objectType]: { schema, uiSchema }
      }
    })),
}));