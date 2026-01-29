import { useState, useEffect, useCallback } from 'react';
import {
  fetchReportTemplateById,
  fetchFieldExplorer,
  parseSchema,
  saveReportTemplate,
  CreateReportTemplateRequest,
  ReportSchema,
} from '@services/ReportTemplateService';
import { createFileFromBase64 } from '../utils/fileUtils';
import { buildJsonSchema } from '../utils/schemaUtils';
import { flattenFieldGroups, restoreUsedFields } from '../utils/fieldUtils';
import { TemplateState } from '../types';
import { FieldOption } from '@services/ReportTemplateService';

export const generateTemplateId = () => `template_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;


interface UseTemplateEditorProps {
  templateId?: string;
}

export const useTemplateEditor = ({ templateId }: UseTemplateEditorProps) => {
  const [state, setState] = useState<TemplateState>({
    file: null,
    fileName: null,
    usedFields: [],
    fieldGroups: [],
    expandedGroups: {},
    requiredFields: new Set(),
    jsonSchema: '',
    isLoading: false,
  });

  const initializeNewTemplate = useCallback(() => {
    setState(prev => ({
      ...prev,
      file: null,
      fileName: null,
      usedFields: [],
      requiredFields: new Set(),
      fieldGroups: [],
      jsonSchema: '',
      expandedGroups: {},
    }));
  }, []);

  const loadTemplate = useCallback(async (id: string) => {
    if (!id) {
      console.error('❌ Empty template ID');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // 1. Загружаем шаблон
      const reportDto = await fetchReportTemplateById(id);
      
      // 2. Восстанавливаем файл
      let file: File | null = null;
      if (reportDto.file) {
        file = createFileFromBase64(reportDto.file, `${reportDto.title}.docx`);
      }

      // 3. Парсим схему
      const schema: ReportSchema = parseSchema(reportDto.schema);
      const initialRequired = new Set<string>();
      const initialUsedPaths = new Set<string>();
      
      if (schema?.fields) {
        schema.fields.forEach(f => {
          if (f?.path) {
            initialUsedPaths.add(f.path);
            if (f.required) initialRequired.add(f.path);
          }
        });
      }

      // 4. Загружаем поля
      const explorerData = await fetchFieldExplorer(id);
      const fieldGroups = flattenFieldGroups(explorerData);
      
      // 5. Восстанавливаем использованные поля
      const schemaObj = JSON.parse(reportDto.schema);
      const schemaProperties = schemaObj.properties || {};
      
      const allFields = fieldGroups.flatMap(g => g.fields);
      const usedFields = restoreUsedFields(allFields, schemaProperties, initialUsedPaths);
      
      // 6. Инициализируем раскрытые группы
      const expandedGroups = Object.fromEntries(
        fieldGroups.map(group => [group.key, false])
      );

      setState({
        file,
        fileName: file?.name || null,
        usedFields,
        fieldGroups,
        expandedGroups,
        requiredFields: initialRequired,
        jsonSchema: reportDto.schema,
        isLoading: false,
      });
      
    } catch (err) {
      console.error('💥 Error loading template:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    } else {
      initializeNewTemplate();
    }
  }, [templateId, loadTemplate, initializeNewTemplate]);

  const addField = (field: FieldOption) => {
    setState(prev => ({
      ...prev,
      usedFields: prev.usedFields.some(f => f.path === field.path)
        ? prev.usedFields
        : [...prev.usedFields, field]
    }));
  };

  const removeField = (path: string) => {
    setState(prev => {
      const nextRequired = new Set(prev.requiredFields);
      nextRequired.delete(path);
      
      return {
        ...prev,
        usedFields: prev.usedFields.filter(f => f.path !== path),
        requiredFields: nextRequired
      };
    });
  };

  const toggleRequired = (path: string) => {
    setState(prev => {
      const nextRequired = new Set(prev.requiredFields);
      nextRequired.has(path) ? nextRequired.delete(path) : nextRequired.add(path);
      
      return { ...prev, requiredFields: nextRequired };
    });
  };

  const toggleGroup = (key: string) => {
    setState(prev => ({
      ...prev,
      expandedGroups: {
        ...prev.expandedGroups,
        [key]: !prev.expandedGroups[key]
      }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.docx')) {
      setState(prev => ({
        ...prev,
        file,
        fileName: file.name
      }));
    }
  };

  const handleSave = async () => {
    if (!state.file) {
      throw new Error('Пожалуйста, загрузите файл шаблона');
    }

    const schemaData = buildJsonSchema(
      state.usedFields,
      state.requiredFields,
      templateId
    );

    const request: CreateReportTemplateRequest = {
      id: templateId || generateTemplateId(),
      title: state.fileName?.replace('.docx', '') || 'Новый шаблон',
      schemaReportJson: JSON.stringify(schemaData, null, 2),
      file: state.file
    };

    return await saveReportTemplate(request);
  };

  return {
    ...state,
    addField,
    removeField,
    toggleRequired,
    toggleGroup,
    handleFileChange,
    handleSave,
    initializeNewTemplate,
    loadTemplate
  };
};