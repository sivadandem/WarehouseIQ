import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi, authApi } from '../api/endpoints';
import toast from 'react-hot-toast';
import { User, Lock, Users, Plus } from 'lucide-react';
import Modal from '../components/ui/Modal';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [userLoading, setUserLoading] = useState(false);

  const loadUsers = async () => {
    if (usersLoaded) return;
    const res = await usersApi.getAll();
    setUsers(res.data.data);
    setUsersLoaded(true);
  };

  const handlePwChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserLoading(true);
    try {
      await usersApi.create(newUser);
      toast.success('User created successfully');
      setShowUserModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'staff' });
      setUsersLoaded(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally { setUserLoading(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <User size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-200">Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-100">{user?.name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <span className="badge-blue mt-1 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-200">Change Password</h2>
        </div>
        <form onSubmit={handlePwChange} className="space-y-3">
          {[['currentPassword','Current Password'],['newPassword','New Password'],['confirm','Confirm New Password']].map(([k,lbl]) => (
            <div key={k}>
              <label className="label">{lbl}</label>
              <input type="password" className="input" value={pwForm[k]}
                onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))} required />
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={pwLoading}>{pwLoading ? 'Saving...' : 'Update Password'}</button>
        </form>
      </div>

      {/* User Management (Admin only) */}
      {isAdmin && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users size={16} className="text-brand-400" />
              <h2 className="text-sm font-semibold text-slate-200">User Management</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { loadUsers(); }} className="btn-secondary btn-sm">Load Users</button>
              <button onClick={() => setShowUserModal(true)} className="btn-primary btn-sm gap-1">
                <Plus size={13} /> Add User
              </button>
            </div>
          </div>
          {users.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.name}</td>
                      <td className="text-slate-400">{u.email}</td>
                      <td><span className="badge-blue capitalize">{u.role}</span></td>
                      <td><span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Add New User">
        <form onSubmit={handleCreateUser} className="space-y-3">
          {[['name','Name','text'],['email','Email','email'],['password','Password','password']].map(([k,lbl,t]) => (
            <div key={k}>
              <label className="label">{lbl}</label>
              <input type={t} className="input" value={newUser[k]}
                onChange={e => setNewUser(f => ({ ...f, [k]: e.target.value }))} required />
            </div>
          ))}
          <div>
            <label className="label">Role</label>
            <select className="input" value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={userLoading}>{userLoading ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
