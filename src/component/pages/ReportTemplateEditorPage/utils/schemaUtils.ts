import { FieldOption } from '@services/ReportTemplateService';

export const generateTemplateId = () => `template_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

export const buildJsonSchema = (
  usedFields: FieldOption[],
  requiredFields: Set<string>,
  templateId?: string
) => ({
  $id: templateId || generateTemplateId(),
  type: "object",
  required: Array.from(requiredFields),
  properties: usedFields.reduce((acc, field) => {
    acc[field.path] = { type: "string" };
    return acc;
  }, {} as Record<string, any>)
});