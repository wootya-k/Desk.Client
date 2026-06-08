import { useState, useEffect, Fragment } from 'react'; // Добавляем Fragment
import { useNavigate } from 'react-router-dom';
import {
  getEmployeeChanges,
  exportEmployeeChanges,
  downloadFile,
  deleteEmployeeChange,
  EmployeeChange
} from '@services/CheckpointService';
import styles from './CheckpointPage.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

const CATEGORIES = [
  '1. Подлежат призыву',
  '2. Офицеры запаса',
  '3. Прапорщики, сержанты и солдаты запаса'
] as const;

type CategoryKey = typeof CATEGORIES[number];

const CheckpointPage = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [changes, setChanges] = useState<EmployeeChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<false | 'xlsx' | 'xls' | 'ods'>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    setDateFrom(sixtyDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmployeeChanges(new Date(dateFrom), new Date(dateTo), 60);
      setChanges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'xls' | 'ods') => {
    setExporting(format);
    try {
      const blob = await exportEmployeeChanges(new Date(dateFrom), new Date(dateTo), format, 60);
      downloadFile(blob, `checkpoint_${dateFrom}_${dateTo}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка экспорта');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (changeId: string) => {
    try {
      // 1. Удаляем на бэкенде
      await deleteEmployeeChange(changeId);

      // 2. Удаляем из локального стейта
      setChanges(prev => prev.filter(c => c.changeId !== changeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления записи');
    }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catLabel = cat.replace(/^\d+\.\s*/, '').toLowerCase();

    acc[cat] = changes.filter(c => {
      const itemLabel = c.militaryCategory.toLowerCase();
      return itemLabel.includes(catLabel);
    });
    return acc;
  }, {} as Record<CategoryKey, EmployeeChange[]>);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <FilledColorButton onClick={() => navigate('/')} >
          Назад
        </FilledColorButton>
      </div>

      <div className={styles.headerPanel}>
        <h1 className={styles.title}>
          Сведения о происшедших изменениях у работников <br />
          АО "Рога и копыта", состоящих на воинском учёте
        </h1>
        <div className={styles.period}>
          за период с {formatDate(dateFrom)} по {formatDate(dateTo)}
          <span className={styles.total}>(всего записей: {changes.length})</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.dates}>
          <label>С даты: <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
          <label>По дату: <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
        </div>
        <div className={styles.exports}>
          {(['xlsx', 'xls', 'ods'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={exporting !== false || changes.length === 0}
              className={styles.expBtn}
            >
              {exporting === fmt ? '...' : fmt.toUpperCase()}
            </button>
          ))}
        </div>
        <FilledColorButton onClick={loadData} disabled={loading}>
          {loading ? '...' : 'Обновить'}
        </FilledColorButton>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 50 }}>№</th>
              <th>Фамилия, имя, отчество</th>
              <th style={{ width: 90 }}>Год рожд.</th>
              <th>Звание</th>
              <th style={{ width: 70 }}>ВУС</th>
              <th className={styles.addrHead}>
                <span>Место регистрации по паспорту</span>
                <span className={styles.noUnderline}>Фактическое проживание</span>
              </th>
              <th>Изменения</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
                    <tbody>
            {CATEGORIES.map(cat => (
              // Используем Fragment с key вместо <>
              <Fragment key={cat}>
                <tr className={styles.catRow}>
                  <td colSpan={8}>{cat}</td>
                </tr>
                {grouped[cat].length === 0 ? (
                  <tr className={styles.emptyRow}>
                    <td colSpan={8}>В категории «{cat.replace(/^\d+\.\s*/, '')}» изменений не обнаружено</td>
                  </tr>
                ) : (
                  grouped[cat].map(c => {
                    const same = c.registrationAddress === c.residenceAddress;
                    return (
                      <tr key={c.changeId} className={styles.dataRow}> 
                        <td>{c.sequenceNumber}</td>
                        <td>{c.fullName}</td>
                        <td>{c.yearOfBirth}</td>
                        <td>{c.militaryRank}</td>
                        <td>{c.militarySpecialty}</td>
                        <td>
                          <div className={styles.addr}>
                            <span className={styles.addrReg}>{c.registrationAddress}</span>
                            {!same && <span className={styles.addrRes}>{c.residenceAddress}</span>}
                          </div>
                        </td>
                        <td>{c.changeDescription}</td>
                        <td>
                          <button
                            onClick={() => handleDelete(c.changeId)}
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            title="Удалить"
                            type="button"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CheckpointPage;