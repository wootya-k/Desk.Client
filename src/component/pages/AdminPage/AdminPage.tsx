// pages/AdminPage/AdminPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminPage.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import UserEditModal from './UserEditModal/UserEditModal';
import {
  User,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  suspendUser,
  changePassword,
  UserFormData
} from '@services/UserService';
import DeleteButton from '@commons/DeleteButton/DeleteButton';
import ViewButton from '@commons/ViewButton/ViewButton';
import StatusFilterButton from '@commons/StatusFilterButton/StatusFilterButton';

const ROLES: Array<'Master' | 'Admin' | 'Editor' | 'Viewer'> = ['Master', 'Admin', 'Editor', 'Viewer'];

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить пользователей');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = term === '' ||
      `${user.lastName} ${user.firstName} ${user.patronymic}`.toLowerCase().includes(term) ||
      `@${user.login}`.toLowerCase().includes(term) ||
      (user.organization && user.organization.toLowerCase().includes(term)) ||
      (user.position && user.position.toLowerCase().includes(term));

    const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(user.role);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'true' && !user.isSuspended) ||
      (statusFilter === 'false' && user.isSuspended);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: UserFormData) => {
    try {
      if (editingUser) {
        const { password, isSuspended, ...userData } = formData;

        await updateUser(editingUser.login, userData);

        if (password.trim()) {
          await changePassword(editingUser.login, password);
        }

        // Явно приводим к boolean
        const shouldBeSuspended = isSuspended ?? false;
        if (shouldBeSuspended !== editingUser.isSuspended) {
          await suspendUser(editingUser.login, shouldBeSuspended);
        }
      } else {
        await createUser(formData);
      }
      await loadUsers();
      setIsModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка при сохранении');
    }
  };

  const handleDelete = async (login: string) => {
    try {
      await deleteUser(login);
      await loadUsers();
      setDeleteConfirm(null);
    } catch (err) {
      alert('Не удалось удалить пользователя');
    }
  };

  const handleGeneratePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleRoleFilterChange = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Master': return '#2471a3';
      case 'Admin': return '#5499c7';
      case 'Editor': return '#aed6f1';
      case 'Viewer': return '#aeb6bf';
      default: return '#bdc3c7';
    }
  };

  const getRoleTextColor = (role: string) => {
    switch (role) {
      case 'Master': return '#ffffff';
      case 'Admin': return '#ffffff';
      case 'Editor': return '#1b4f72';
      case 'Viewer': return '#2c3e50';
      default: return '#2c3e50';
    }
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>{error}</div>
        <FilledColorButton onClick={loadUsers}>Повторить</FilledColorButton>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FilledColorButton
            onClick={() => navigate(-1)}
            mainColor="#FFFFFF"
            additionalColor="#95a5a6"
            width="100px"
          >
            Назад
          </FilledColorButton>
          <h1 className={styles.title}>Управление пользователями</h1>
        </div>
        <FilledColorButton
          onClick={handleCreate}
          width="180px"
        >
          Создать пользователя
        </FilledColorButton>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Поиск по ФИО, логину, организации или должности..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterRow}>
          <div className={styles.roleFilters}>
            <span className={styles.filterLabel}>Роли:</span>
            {ROLES.map(role => (
              <button
                key={role}
                className={`${styles.roleFilter} ${selectedRoles.includes(role) ? styles.active : ''}`}
                onClick={() => handleRoleFilterChange(role)}
                style={{
                  borderColor: selectedRoles.includes(role) ? getRoleColor(role) : '#ddd',
                  backgroundColor: selectedRoles.includes(role) ? getRoleColor(role) + '18' : '#fff',
                  color: selectedRoles.includes(role) ? getRoleColor(role) : '#555'
                }}
              >
                {role}
              </button>
            ))}
            {selectedRoles.length > 0 && (
              <button
                className={styles.clearFilter}
                onClick={() => setSelectedRoles([])}
              >
                Сбросить
              </button>
            )}
          </div>

          <div className={styles.statusFilters}>
            <span className={styles.filterLabel}>Статус:</span>
            <StatusFilterButton
              value={statusFilter}
              onChange={setStatusFilter}
              height="36px"
              width="150px"
              mainColor="#ffffff"
              additionalColor="#3498db"
            />
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Организация</th>
                <th>Должность</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.login}>
                    <td>
                      <div className={styles.userName}>
                        <div className={styles.fullName}>
                          {user.lastName} {user.firstName} {user.patronymic}
                        </div>
                        <div className={styles.userLogin}>@{user.login}</div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.organization}>
                        {user.organization || '—'}
                      </div>
                      {user.city && <div className={styles.city}>{user.city}</div>}
                    </td>
                    <td>{user.position || '—'}</td>
                    <td>
                      <span
                        className={styles.roleBadge}
                        style={{
                          backgroundColor: getRoleColor(user.role),
                          color: getRoleTextColor(user.role),
                          borderColor: getRoleColor(user.role)
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${user.isSuspended ? styles.suspended : styles.active}`}>
                        <span className={styles.statusDot}></span>
                        {user.isSuspended ? 'Заморожен' : 'Активен'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <ViewButton onClick={() => handleEdit(user)} size={26} />
                        <DeleteButton onClick={() => setDeleteConfirm(user.login)} size={38} width='1px' />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <UserEditModal
        user={editingUser}
        isOpen={isModalOpen}
        onSave={handleSave}
        onCancel={() => setIsModalOpen(false)}
        onGeneratePassword={handleGeneratePassword}
      />

      {deleteConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <h3>Подтверждение удаления</h3>
            <p>Вы действительно хотите удалить пользователя <strong>{deleteConfirm}</strong>?</p>
            <div className={styles.confirmActions}>
              <FilledColorButton
                onClick={() => setDeleteConfirm(null)}
                mainColor="#FFFFFF"
                additionalColor="#95a5a6"
              >
                Отмена
              </FilledColorButton>
              <FilledColorButton
                onClick={() => handleDelete(deleteConfirm)}
                mainColor="#FFFFFF"
                additionalColor="#e74c3c"
              >
                Удалить
              </FilledColorButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;