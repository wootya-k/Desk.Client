import React, { FC } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialCells, materialRenderers } from '@jsonforms/material-renderers';
import { UISchemaElement } from '@jsonforms/core';
import styles from './ObjectEditForm.module.css';
import { i18nRu } from 'utils/i18n'; // ← путь под твой проект
import { ErrorObject } from 'ajv';

type DetailEntity = {
  type: string;
  schema: any;
  uiSchema: UISchemaElement | any; // ← обрати внимание: uiSchema, а не uischema
  data: any;
};

interface ObjectEditFormProps {
  formEntity: DetailEntity | null;
  formData: any;
  isLoading: boolean;
  error: boolean;
  onChange: (data: any) => void;
  serverValidationErrors?: ErrorObject[];
}

const ObjectEditForm: FC<ObjectEditFormProps> = ({
  formEntity,
  formData,
  isLoading,
  error,
  onChange
}) => {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  if (error || !formEntity) {
    return (
      <div className={styles.errorContainer}>
        <p>Не удалось загрузить данные формы</p>
      </div>
    );
  }

  return (
    <div className={styles.formContent}>
    <JsonForms
    validationMode="NoValidation" 
      data={formData}
      schema={formEntity.schema}           // ← без опционального ?, т.к. выше проверка
      uischema={formEntity.uiSchema}       // ← исправлено: uiSchema → uischema (prop JsonForms)
      renderers={materialRenderers}
      cells={materialCells}
      i18n={i18nRu}                        // ← только это добавляем
      onChange={({ data }) => {
        onChange(data);
      }}
    />
    </div>
  );
};

export default ObjectEditForm;