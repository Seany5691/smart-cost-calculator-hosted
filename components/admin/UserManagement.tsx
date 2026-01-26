'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/lib/store/auth-simple';
import { X, AlertTriangle, Shield, User as UserIcon, Mail, Key } from 'lucide-react';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'telesales';
  isActive: boolean;
  requiresPasswordChange: boolean;
  isSuperAdmin: boolean;
}

// Confirm Modal Component
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <AlertTriangle className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-white">{message}</p>
        </div>
        <div className="flex justify-end space-x-3 p-6 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-6 py-2 bg-gradient-to-r from-red-500 to-rose-500 hover:shadow-lg text-white rounded-lg transition-all font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Alert Modal Component
function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message,
  type = 'error'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  message: string;
  type?: 'error' | 'success';
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        <div className="p-6">
          <div className={`${type === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'} border rounded-lg p-4`}>
            <p className={type === 'error' ? 'text-red-400' : 'text-green-400'}>{message}</p>
          </div>
        </div>
        <div className="flex justify-end p-6 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white rounded-lg transition-all font-semibold"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Password Reset Modal Component
function PasswordResetModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  username 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (password: string) => void; 
  username: string; 
}) {
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleSubmit = () => {
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    onConfirm(password);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/30">
        <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Key className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Reset Password</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-purple-200" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-white">
            Reset password for user: <span className="font-semibold text-purple-300">{username}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password (minimum 8 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
              placeholder="Enter new password"
              autoFocus
              className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>
          <p className="text-sm text-gray-400">
            User will be required to change this password on next login.
          </p>
        </div>
        <div className="flex justify-end space-x-3 p-6 border-t border-purple-500/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg text-white rounded-lg transition-all font-semibold"
          >
            Reset Password
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function UserManagement() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' as 'error' | 'success' });
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (token) {
      loadUsers();
    }
  }, [token]);

  const loadUsers = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // API returns {users: [...], pagination: {...}}
        setUsers(data.users || data);
      } else {
        console.error('Failed to load users:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Validate all required fields
    if (!editForm.username || editForm.username.length < 3) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Username is required and must be at least 3 characters',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    if (!editForm.name) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Name is required',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    if (!editForm.email) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Email is required',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setAlertConfig({
        title: 'Validation Error',
        message: 'Password is required and must be at least 8 characters',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    if (!token) {
      setAlertConfig({
        title: 'Authentication Error',
        message: 'Not authenticated',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editForm.username,
          name: editForm.name,
          email: editForm.email,
          password: newPassword,
          role: editForm.role || 'user', // Default to 'user' if not set
        }),
      });

      if (response.ok) {
        await loadUsers();
        setShowAddForm(false);
        setEditForm({});
        setNewPassword('');
        setAlertConfig({
          title: 'Success',
          message: 'User created successfully!',
          type: 'success'
        });
        setShowAlertModal(true);
      } else {
        const error = await response.json();
        const errorMessage = error.error?.message || 'Failed to create user';
        const details = error.error?.details;
        if (details) {
          const detailsStr = Object.entries(details)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          setAlertConfig({
            title: 'Error',
            message: `${errorMessage}\n\n${detailsStr}`,
            type: 'error'
          });
        } else {
          setAlertConfig({
            title: 'Error',
            message: errorMessage,
            type: 'error'
          });
        }
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to create user',
        type: 'error'
      });
      setShowAlertModal(true);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!token) {
      setAlertConfig({
        title: 'Authentication Error',
        message: 'Not authenticated',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        await loadUsers();
        setEditingId(null);
        setEditForm({});
        setAlertConfig({
          title: 'Success',
          message: 'User updated successfully!',
          type: 'success'
        });
        setShowAlertModal(true);
      } else {
        const error = await response.json();
        setAlertConfig({
          title: 'Error',
          message: error.error?.message || 'Failed to update user',
          type: 'error'
        });
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to update user',
        type: 'error'
      });
      setShowAlertModal(true);
    }
  };

  const handleDelete = async (user: User) => {
    if (user.isSuperAdmin) {
      setAlertConfig({
        title: 'Error',
        message: 'Cannot delete super admin user',
        type: 'error'
      });
      setShowAlertModal(true);
      return;
    }

    setDeleteUser(user);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteUser || !token) return;

    try {
      const response = await fetch(`/api/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadUsers();
        setAlertConfig({
          title: 'Success',
          message: 'User deleted successfully!',
          type: 'success'
        });
        setShowAlertModal(true);
      } else {
        const error = await response.json();
        setAlertConfig({
          title: 'Error',
          message: error.error?.message || 'Failed to delete user',
          type: 'error'
        });
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to delete user',
        type: 'error'
      });
      setShowAlertModal(true);
    } finally {
      setDeleteUser(null);
    }
  };

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setShowPasswordResetModal(true);
  };

  const confirmResetPassword = async (newPassword: string) => {
    if (!resetPasswordUser || !token) return;

    try {
      const response = await fetch(`/api/users/${resetPasswordUser.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: newPassword,
          requiresPasswordChange: true,
        }),
      });

      if (response.ok) {
        setAlertConfig({
          title: 'Success',
          message: 'Password reset successfully. User will be required to change password on next login.',
          type: 'success'
        });
        setShowAlertModal(true);
        await loadUsers();
      } else {
        const error = await response.json();
        const errorMessage = error.error?.message || 'Failed to reset password';
        const details = error.error?.details;
        if (details) {
          const detailsStr = Object.entries(details)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          setAlertConfig({
            title: 'Error',
            message: `${errorMessage}\n\n${detailsStr}`,
            type: 'error'
          });
        } else {
          setAlertConfig({
            title: 'Error',
            message: errorMessage,
            type: 'error'
          });
        }
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to reset password',
        type: 'error'
      });
      setShowAlertModal(true);
    } finally {
      setResetPasswordUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Shield className="w-7 h-7 text-purple-400" />
            <span>User Management</span>
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
          >
            Add User
          </button>
        </div>

        {showAddForm && (
          <div className="glass-card p-6 space-y-4 animate-fade-in-up">
            <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-purple-400" />
              <span>Add New User</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  placeholder="Username (min 3 characters)"
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select
                  value={editForm.role || 'user'}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="telesales">Telesales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditForm({});
                  setNewPassword('');
                }}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {users.map((user) => (
          <div key={user.id} className="glass-card-hover p-5 space-y-3">
            {editingId === user.id ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name || user.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                      disabled={user.isSuperAdmin}
                      title={user.isSuperAdmin ? "Cannot modify super admin name" : ""}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email || user.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                      disabled={user.isSuperAdmin}
                      title={user.isSuperAdmin ? "Cannot modify super admin email" : ""}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                    <select
                      value={editForm.role || user.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                      className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                      disabled={user.isSuperAdmin}
                      title={user.isSuperAdmin ? "Cannot modify super admin role" : ""}
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="telesales">Telesales</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={editForm.isActive !== undefined ? editForm.isActive : user.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="mr-2 w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={user.isSuperAdmin}
                      title={user.isSuperAdmin ? "Cannot modify super admin active status" : ""}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => handleUpdate(user.id)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditForm({});
                    }}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="text-white font-semibold text-lg flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-purple-400" />
                      <span>{user.username}</span>
                    </div>
                    <div className="text-sm text-gray-300">{user.name}</div>
                    <div className="text-sm text-gray-400 flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>{user.email}</span>
                    </div>
                  </div>
                  {user.isSuperAdmin && (
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1">
                      <Shield className="w-3 h-3" />
                      <span>Super Admin</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    user.role === 'admin' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                    user.role === 'manager' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 
                    user.role === 'telesales' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                    'bg-gradient-to-r from-green-500 to-emerald-500'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                  {!user.isActive && (
                    <span className="bg-gray-500/50 px-3 py-1 rounded-lg text-xs font-semibold border border-gray-400/30">
                      Inactive
                    </span>
                  )}
                  {user.requiresPasswordChange && (
                    <span className="bg-yellow-500/50 px-3 py-1 rounded-lg text-xs font-semibold border border-yellow-400/30">
                      Password Reset Required
                    </span>
                  )}
                </div>
                <div className="flex flex-col space-y-2 pt-2">
                  {!user.isSuperAdmin && (
                    <button
                      onClick={() => {
                        setEditingId(user.id);
                        setEditForm(user);
                      }}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
                    >
                      Edit User
                    </button>
                  )}
                  <button
                    onClick={() => handleResetPassword(user)}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold flex items-center justify-center space-x-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>Reset Password</span>
                  </button>
                  {!user.isSuperAdmin && (
                    <button
                      onClick={() => handleDelete(user)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
                    >
                      Delete User
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        
        {/* Modals */}
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setDeleteUser(null);
          }}
          onConfirm={confirmDelete}
          title="Confirm Delete"
          message={`Are you sure you want to delete user ${deleteUser?.username}? This action cannot be undone.`}
        />
        
        <PasswordResetModal
          isOpen={showPasswordResetModal}
          onClose={() => {
            setShowPasswordResetModal(false);
            setResetPasswordUser(null);
          }}
          onConfirm={confirmResetPassword}
          username={resetPasswordUser?.username || ''}
        />
        
        <AlertModal
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />
      </div>
    );
  }

  // Desktop Table View
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Shield className="w-8 h-8 text-purple-400" />
          <span>User Management</span>
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
        >
          Add User
        </button>
      </div>

      {showAddForm && (
        <div className="glass-card p-6 mb-6 animate-fade-in-up">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center space-x-2">
            <UserIcon className="w-5 h-5 text-purple-400" />
            <span>Add New User</span>
          </h3>
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                placeholder="Username (min 3 chars)"
                value={editForm.username || ''}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                placeholder="Email Address"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                placeholder="Password (min 8 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <select
                value={editForm.role || 'user'}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                className="w-full px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="telesales">Telesales</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Create User
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditForm({});
                setNewPassword('');
              }}
              className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr className="border-b border-purple-500/20 bg-white/5">
                <th className="text-left py-4 px-6 font-semibold text-purple-200">Username</th>
                <th className="text-left py-4 px-6 font-semibold text-purple-200">Name</th>
                <th className="text-left py-4 px-6 font-semibold text-purple-200">Email</th>
                <th className="text-center py-4 px-6 font-semibold text-purple-200">Role</th>
                <th className="text-center py-4 px-6 font-semibold text-purple-200">Status</th>
                <th className="text-center py-4 px-6 font-semibold text-purple-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  {editingId === user.id ? (
                    <>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          value={user.username}
                          disabled
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white opacity-50 cursor-not-allowed"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          value={editForm.name || user.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          disabled={user.isSuperAdmin}
                          title={user.isSuperAdmin ? "Cannot modify super admin name" : ""}
                        />
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="email"
                          value={editForm.email || user.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          disabled={user.isSuperAdmin}
                          title={user.isSuperAdmin ? "Cannot modify super admin email" : ""}
                        />
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={editForm.role || user.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                          className="w-full px-3 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          disabled={user.isSuperAdmin}
                          title={user.isSuperAdmin ? "Cannot modify super admin role" : ""}
                        >
                          <option value="user">User</option>
                          <option value="manager">Manager</option>
                          <option value="telesales">Telesales</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.isActive !== undefined ? editForm.isActive : user.isActive}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                            disabled={user.isSuperAdmin}
                            className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={user.isSuperAdmin ? "Cannot modify super admin active status" : ""}
                          />
                          <span className="ml-2 text-sm">Active</span>
                        </label>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleUpdate(user.id)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
                            className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="w-4 h-4 text-purple-400" />
                          <span className="font-medium">{user.username}</span>
                          {user.isSuperAdmin && (
                            <span className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1">
                              <Shield className="w-3 h-3" />
                              <span>Super Admin</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-200">{user.name}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 text-gray-300">
                          <Mail className="w-4 h-4 text-purple-400" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                          user.role === 'admin' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                          user.role === 'manager' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 
                          user.role === 'telesales' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                          'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          {user.isActive ? (
                            <span className="text-green-400 font-medium">✓ Active</span>
                          ) : (
                            <span className="text-red-400 font-medium">✗ Inactive</span>
                          )}
                          {user.requiresPasswordChange && (
                            <span className="text-yellow-400 text-xs bg-yellow-500/20 px-2 py-1 rounded border border-yellow-500/30">
                              Password Reset Required
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center space-x-2">
                          {!user.isSuperAdmin && (
                            <button
                              onClick={() => {
                                setEditingId(user.id);
                                setEditForm(user);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold flex items-center space-x-1"
                          >
                            <Key className="w-4 h-4" />
                            <span>Reset</span>
                          </button>
                          {!user.isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modals */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setDeleteUser(null);
        }}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete user ${deleteUser?.username}? This action cannot be undone.`}
      />
      
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => {
          setShowPasswordResetModal(false);
          setResetPasswordUser(null);
        }}
        onConfirm={confirmResetPassword}
        username={resetPasswordUser?.username || ''}
      />
      
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}
