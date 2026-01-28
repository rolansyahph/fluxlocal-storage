import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { formatBytes } from '../utils/format';
import { Icon } from './Icon';
import { API_BASE_URL } from '../constants';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form States (Add/Edit)
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formQuotaMB, setFormQuotaMB] = useState(100);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormQuotaMB(100);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormPassword(''); // Don't show existing password
    setFormQuotaMB(user.storageLimitBytes / (1024 * 1024));
    setIsEditModalOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formEmail || !formPassword) return;

    try {
      await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUsername,
          email: formEmail,
          password: formPassword,
          role: UserRole.USER,
          storageLimitBytes: formQuotaMB * 1024 * 1024
        })
      });
      fetchUsers();
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding user', error);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !formUsername || !formEmail) return;

    const newLimitBytes = formQuotaMB * 1024 * 1024;

    try {
      await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUsername,
          email: formEmail,
          storageLimitBytes: newLimitBytes,
          password: formPassword || undefined
        })
      });
      fetchUsers();
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user', error);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user', error);
    }
  };

  // Calculated stats
  const totalUsers = users.length;
  const totalUsedStorage = users.reduce((acc, u) => acc + (u.usedStorageBytes || 0), 0);
  const totalAllocatedStorage = users.reduce((acc, u) => acc + u.storageLimitBytes, 0);
  const usagePercentage = totalAllocatedStorage > 0 ? (totalUsedStorage / totalAllocatedStorage) * 100 : 0;

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm pb-20 md:pb-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Icon name="user-shield" /> User Management
        </h2>
        <button
          onClick={openAddModal}
          className="bg-brand-600 text-white px-4 py-2 rounded-md hover:bg-brand-700 transition flex items-center gap-2 shadow-sm"
        >
          <Icon name="plus" /> Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{totalUsers}</p>
          </div>
          <div className="p-3 rounded-full bg-blue-50 text-blue-600">
            <Icon name="users" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Storage Used</p>
            <p className="text-2xl font-bold text-gray-800">{formatBytes(totalUsedStorage)}</p>
            <p className="text-xs text-gray-400">of {formatBytes(totalAllocatedStorage)} allocated</p>
          </div>
          <div className="p-3 rounded-full bg-green-50 text-green-600">
            <Icon name="server" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Global Quota Usage</p>
            <p className="text-2xl font-bold text-gray-800">{usagePercentage.toFixed(1)}%</p>
            <div className="w-full max-w-[100px] h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(usagePercentage, 100)}%` }}></div>
            </div>
          </div>
          <div className="p-3 rounded-full bg-purple-50 text-purple-600">
            <Icon name="chart-pie" />
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="overflow-x-auto border rounded-lg border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quota</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(u => {
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono hidden lg:table-cell max-w-[120px] truncate" title={u.id}>
                    {u.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{u.username}</span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                      {/* Show ID on smaller screens where the ID column is hidden */}
                      <span className="text-[10px] text-gray-400 font-mono mt-0.5 lg:hidden select-all">{u.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    <span className="font-semibold text-gray-700">{formatBytes(u.usedStorageBytes || 0)}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    {formatBytes(u.storageLimitBytes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {u.role !== UserRole.ADMIN && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-brand-600 hover:text-brand-900 bg-brand-50 p-2 rounded hover:bg-brand-100 transition"
                          title="Edit User"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded hover:bg-red-100 transition"
                          title="Delete User"
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    )}
                    {u.role === UserRole.ADMIN && (
                      <span className="text-xs text-gray-400 italic">System Admin</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- ADD USER MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="bg-brand-50 p-4 border-b border-brand-100 flex justify-between items-center">
              <h3 className="font-bold text-brand-800">Add New User</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="times" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Quota (MB)</label>
                <input
                  type="number"
                  value={formQuotaMB}
                  onChange={e => setFormQuotaMB(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  min="1"
                />
              </div>
              <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-md hover:bg-brand-700 transition">
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="bg-brand-50 p-4 border-b border-brand-100 flex justify-between items-center">
              <h3 className="font-bold text-brand-800">Edit User</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="times" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Quota (MB)</label>
                <input
                  type="number"
                  value={formQuotaMB}
                  onChange={e => setFormQuotaMB(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                  min="1"
                />
              </div>
              <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-md hover:bg-brand-700 transition">
                Update User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
