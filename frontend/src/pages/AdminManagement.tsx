import React, { useEffect, useState } from 'react';
import { usersApi } from '../api/client';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Trash2, Shield, ShieldOff, KeyRound,
  X, Eye, EyeOff, Crown, User, Mail, Lock, CheckCircle, AlertTriangle
} from 'lucide-react';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'moderator';
  status: 'active' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
}

type ModalType = 'create' | 'changePassword' | 'delete' | null;

const AdminManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'moderator' });
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await usersApi.list();
      setUsers(res.data.data);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openModal = (type: ModalType, user?: AdminUser) => {
    setSelectedUser(user || null);
    setModalType(type);
    setForm({ name: '', email: '', password: '', role: 'moderator' });
    setNewPassword('');
    setShowPassword(false);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersApi.create({ name: form.name, email: form.email, password: form.password, role: form.role as any });
      toast.success(`${form.role === 'moderator' ? 'Moderator' : 'Super Admin'} created!`);
      closeModal();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForcePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await usersApi.forceChangePassword(selectedUser._id, newPassword);
      toast.success(`Password updated for ${selectedUser.email}`);
      closeModal();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await usersApi.delete(selectedUser._id);
      toast.success('User deleted');
      closeModal();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await usersApi.updateStatus(user._id, newStatus);
      toast.success(`Account ${newStatus}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(251,191,36,0.12)', color: '#fbbf24', letterSpacing: '0.3px'
        }}>
          <Crown size={11} /> SUPER ADMIN
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
        background: 'rgba(99,102,241,0.12)', color: 'var(--primary-400)', letterSpacing: '0.3px'
      }}>
        <Shield size={11} /> MODERATOR
      </span>
    );
  };

  const getStatusDot = (status: string) => {
    const color = status === 'active' ? 'var(--success-400)' : 'var(--error-400, #ef4444)';
    return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }} />;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Team Management
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {users.length} member{users.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('create')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} /> Add Moderator
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--radius-md)' }} />)}
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Member', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem',
                    fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.5px', background: 'var(--bg-base)'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user._id} style={{
                  borderBottom: idx < users.length - 1 ? '1px solid var(--border-default)' : 'none',
                  transition: 'background 0.15s'
                }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.02))'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: user.role === 'super_admin'
                          ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                          : 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: 700, color: '#fff', flexShrink: 0
                      }}>
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {user.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{getRoleBadge(user.role)}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.8rem' }}>
                    {getStatusDot(user.status)}
                    <span style={{ color: user.status === 'active' ? 'var(--success-400)' : '#ef4444', fontWeight: 500 }}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Change Password */}
                      <button
                        title="Change Password"
                        onClick={() => openModal('changePassword', user)}
                        style={{
                          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                          color: 'var(--primary-400)', borderRadius: '8px', padding: '6px 10px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.15s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                      >
                        <KeyRound size={13} /> Password
                      </button>
                      {/* Suspend / Activate (not for super_admin) */}
                      {user.role !== 'super_admin' && (
                        <button
                          title={user.status === 'active' ? 'Suspend' : 'Activate'}
                          onClick={() => handleToggleStatus(user)}
                          style={{
                            background: user.status === 'active' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                            border: user.status === 'active' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(34,197,94,0.2)',
                            color: user.status === 'active' ? '#f59e0b' : 'var(--success-400)',
                            borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.15s'
                          }}
                        >
                          {user.status === 'active' ? <><ShieldOff size={13} /> Suspend</> : <><CheckCircle size={13} /> Activate</>}
                        </button>
                      )}
                      {/* Delete (not for super_admin) */}
                      {user.role !== 'super_admin' && (
                        <button
                          title="Delete"
                          onClick={() => openModal('delete', user)}
                          style={{
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444', borderRadius: '8px', padding: '6px 10px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.15s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ margin: 0 }}>No team members found. Add a moderator to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {modalType && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-default)', padding: '28px', width: '100%', maxWidth: '440px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
          }}>

            {/* CREATE MODERATOR */}
            {modalType === 'create' && (
              <form onSubmit={handleCreate}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add Team Member</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Create a new moderator account</p>
                  </div>
                  <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label"><User size={13} style={{ display: 'inline', marginRight: 6 }} />Name</label>
                    <input className="form-input" placeholder="Full name" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Mail size={13} style={{ display: 'inline', marginRight: 6 }} />Email *</label>
                    <input className="form-input" type="email" placeholder="moderator@example.com" required value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Lock size={13} style={{ display: 'inline', marginRight: 6 }} />Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" required minLength={6}
                        value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Shield size={13} style={{ display: 'inline', marginRight: 6 }} />Role</label>
                    <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="moderator">Moderator</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`} disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}

            {/* FORCE CHANGE PASSWORD */}
            {modalType === 'changePassword' && selectedUser && (
              <form onSubmit={handleForcePassword}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Change Password</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedUser.email}</p>
                  </div>
                  <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" required minLength={6}
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ paddingRight: '40px' }} />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`} disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

            {/* DELETE CONFIRM */}
            {modalType === 'delete' && selectedUser && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <AlertTriangle size={28} color="#ef4444" />
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>Delete Account</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Are you sure you want to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{selectedUser.email}</strong>? This cannot be undone.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>Cancel</button>
                  <button className={`btn ${submitting ? 'btn-loading' : ''}`} disabled={submitting} onClick={handleDelete}
                    style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none' }}>
                    {submitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
