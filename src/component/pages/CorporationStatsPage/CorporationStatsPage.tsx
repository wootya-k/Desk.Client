import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStatsForType, StatsMatrix } from '@services/CorporationStatsService';
import CorporationStatsTable from './CorporationStatsTable/CorporationStatsTable';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './CorporationStatsPage.module.css';

const CorporationStatsPage: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const [stats, setStats] = useState<StatsMatrix | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!type) {
                setError('Тип объекта не указан в URL');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const matrix = await getStatsForType(type);
                setStats(matrix);
                setError(null);
            } catch (err) {
                console.error('Ошибка загрузки статистики:', err);
                setError('Не удалось загрузить данные для статистики');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [type]);

    const handleBackClick = () => {
        navigate('/');
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <FilledColorButton
                    onClick={handleBackClick}
                    width="100px"
                >
                    Назад
                </FilledColorButton>
            </div>

            <div className={styles.content}>
                {error && <div className={styles.error}>{error}</div>}
                {stats && <CorporationStatsTable stats={stats} isLoading={isLoading} />}
            </div>
        </div>
    );
};

export default CorporationStatsPage;