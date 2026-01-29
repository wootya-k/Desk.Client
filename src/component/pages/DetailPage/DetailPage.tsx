import { FC, useEffect, useState, useCallback } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialCells, materialRenderers } from '@jsonforms/material-renderers';
import { useParams, useNavigate } from 'react-router-dom';
import { DetailEntity } from '@models';
import { Buffer } from 'buffer';
import { UISchemaElement } from '@jsonforms/core';
import {
    fetchDetailEntityById,
    fetchDetailEntityByType
} from '@services/DetailService';
import {
    updateObject,
    createObject
} from '@services/ObjectService';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './DetailPage.module.css'; // Импорт стилей

// Глобальная настройка Buffer
if (typeof window !== 'undefined') window.Buffer = Buffer;

const DetailPage: FC = () => {
    const { id, type } = useParams<{ id?: string; type?: string }>();
    const [formEntity, setFormEntity] = useState<DetailEntity | null>(null);
    const navigate = useNavigate();

    const handleClickBack = useCallback(() => {
        if (type) {
            navigate(`/view-objects/${type}`);
        } else {
            navigate('/');
        }
    }, [type, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            let queryFunction;

            if (id && type) queryFunction = fetchDetailEntityById;
            else if (type && !id) queryFunction = fetchDetailEntityByType;

            if (queryFunction) {
                try {
                    const entity = await queryFunction(id || type!);
                    setFormEntity(entity);
                } catch (error) {
                    console.error('Ошибка при получении FormEntity:', error);
                }
            } else console.error('Ни ID, ни тип не указаны');
        };

        fetchData();
    }, [id, type]);

    const handleCreateOrUpdateObject = async () => {
        if (!formEntity || !formEntity.data || !formEntity.type || (!id && !type))
            return alert('Данные формы недоступны.');
        
        try {
            let result;

            if (id)
                result = await updateObject(id, formEntity.data);
            else
                result = await createObject(formEntity.type, formEntity.data);

            console.log(result ? 'Объект успешно обработан' : 'Не удалось обработать объект.');
            navigate(`/view-objects/${type}`);
        } catch (error) {
            console.log(`Ошибка обработки объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    };

    if (!formEntity) return <div className={styles.loading}>Загрузка...</div>;

    return (
        <div>
            <JsonForms
                schema={formEntity.schema}
                uischema={formEntity.uiSchema as UISchemaElement}
                data={formEntity.data}
                renderers={materialRenderers}
                cells={materialCells}
                onChange={({ data }) => setFormEntity(prev => ({ ...prev!, data }))}
            />
            
            <div>
                <FilledColorButton 
                    mainColor="#FFFFFF" 
                    additionalColor="#3498db" 
                    onClick={handleClickBack}
                >
                    Назад
                </FilledColorButton>
                
                {(type && id) ? (
                    <FilledColorButton
                        mainColor="#FFFFFF"
                        additionalColor="#00a378"
                        onClick={handleCreateOrUpdateObject}
                    >
                        Обновить объект
                    </FilledColorButton>
                ) : type ? (
                    <FilledColorButton
                        mainColor="#FFFFFF"
                        additionalColor="#00a378"
                        onClick={handleCreateOrUpdateObject}
                    >
                        Создать объект
                    </FilledColorButton>
                ) : null}
            </div>
        </div>
    );
};

export default DetailPage;