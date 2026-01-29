// layout/Sidebar/ObjectTypesNavigator.tsx
import React, { useEffect, useState } from 'react';
import { fetchObjectTypes } from '@services/ObjectTypeService';
import { ObjectType } from '@models';
import { useNavigate } from 'react-router-dom';
import './ObjectTypesNavigator.css';

const ObjectTypesNavigator: React.FC = () => {
    const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadObjectTypes = async () => {
            setLoading(true);
            try {
                const data = await fetchObjectTypes();
                setObjectTypes(data);
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError('Неизвестная ошибка');
                }
            } finally {
                setLoading(false);
            }
        };

        loadObjectTypes();
    }, []);

    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>Ошибка: {error}</div>;

    return (
        <div className="object-types-navigator">
            <h2>Типы объектов</h2>
            <ul>
                {objectTypes.map((type) => (
                    <li key={type.id} onClick={() => navigate(`/view-objects/${type.id}`)}>
                        {type.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ObjectTypesNavigator;
