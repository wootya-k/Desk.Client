import React, { FC } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialCells, materialRenderers } from '@jsonforms/material-renderers';
import { UISchemaElement } from '@jsonforms/core';
import styles from './ObjectEditForm.module.css';

type DetailEntity = {
  type: string;
  schema: any;
  uiSchema: UISchemaElement | any;
  data: any;
};

interface ObjectEditFormProps {
  formEntity: DetailEntity | null;
  formData: any;
  isLoading: boolean;
  error: boolean;
  onChange: (data: any) => void;
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
        schema={formEntity.schema}
        uischema={formEntity.uiSchema as UISchemaElement}
        data={formData}
        renderers={materialRenderers}
        cells={materialCells}
        onChange={({ data }) => onChange(data)}
      />
    </div>
  );
};

export default ObjectEditForm;