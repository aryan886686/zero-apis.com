import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, usersApi, settingsApi } from '../api/client';
import toast from 'react-hot-toast';
import {
  User, Lock, Shield, Mail, Users, Plus, Trash2, Edit3,
  Save, Eye, EyeOff, RefreshCw, Route, UserPlus, AlertTriangle,
  CheckCircle, XCircle, Key,
} from 'lucide-react';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

const Settings: React.FC = () => {
  const { admin, refreshProfile } = useAuth();
  const isSuperAdmin = admin?.role === 'super_admin';

  // ── Password Change ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // ── Login Path ──
  const [loginPath, setLoginPath] = useState('/shadowphantomlogin');
  const [savingPath, setSavingPath] = useState(false);

  // ── Team Management ──
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'moderator' });
  const [forceNewPass, setForceNewPass] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [changingMemberPass, setChangingMemberPass] = useState(false);

  // Load settings + team
  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
      loadMembers();
    }
  }, [isSuperAdmin]);

  const loadSettings = async () => {
    try {
      const res = await settingsApi.get();
      if (res.data.data?.loginPath) setLoginPath(res.data.data.loginPath);
    } catch { /* use defaults */ }
  };

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await usersApi.list();
      setMembers(res.data.data || []);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoadingMembers(false);
    }
  };

  // ── Password Change Handler ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPass(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  // ── Login Path Handler ──
  const handleSaveLoginPath = async () => {
    setSavingPath(true);
    try {
      await settingsApi.update({ loginPath });
      toast.success('Login path updated! New path: ' + loginPath);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save login path');
    } finally {
      setSavingPath(false);
    }
  };

  // ── Team Handlers ──
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.email || !newMember.password) {
      toast.error('Email and password are required');
      return;
    }
    setAddingMember(true);
    try {
      await usersApi.create(newMember as any);
      toast.success('Team member added!');
      setShowAddModal(false);
      setNewMember({ name: '', email: '', password: '', role: 'moderator' });
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    try {
      await usersApi.updateStatus(member._id, newStatus);
      toast.success(`${member.email} ${newStatus}`);
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!confirm(`Delete ${member.email}? This cannot be undone.`)) return;
    try {
      await usersApi.delete(member._id);
      toast.success('Member deleted');
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPassModal || forceNewPass.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingMemberPass(true);
    try {
      await usersApi.forceChangePassword(showPassModal, forceNewPass);
      toast.success('Password changed successfully');
      setShowPassModal(null);
      setForceNewPass('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingMemberPass(false);
    }
  };

  const getPassModalMember = () => members.find(m => m._id === showPassModal);

  // ── Styles ──
  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    marginBottom: '24px',
  };

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  };

  const modalBox: React.CSSProperties = {
    background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)', padding: '32px', width: '100%', maxWidth: '440px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', background: 'var(--primary-500)', color: 'white',
    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
    transition: 'all 0.2s ease',
  };

  const btnDanger: React.CSSProperties = {
    ...btnPrimary, background: 'var(--danger-500)',
  };

  const btnGhost: React.CSSProperties = {
    padding: '8px 12px', background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
    transition: 'all 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px',
    fontWeight: 600, color: 'var(--text-secondary)',
  };

  return (
    <div>
      {/* ── Profile Section ── */}
      <div style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-primary)' }}>
          <User size={20} color="var(--primary-400)" /> Profile Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ ...inputStyle, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} /> {admin?.email || '—'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <div style={{ ...inputStyle, opacity: 0.7, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={14} /> {admin?.role?.replace('_', ' ').toUpperCase() || 'ADMIN'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Last Login</label>
            <div style={{ ...inputStyle, opacity: 0.7 }}>
              {admin?.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Own Password ── */}
      <div style={sectionStyle}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--text-primary)' }}>
          <Lock size={20} color="var(--warning-400)" /> Change Your Password
        </h3>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={inputStyle}
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
              <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={inputStyle}
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              style={inputStyle}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>
          <button type="submit" style={{ ...btnPrimary, alignSelf: 'flex-start' }} disabled={savingPass}>
            <Save size={16} /> {savingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Login Path Config (Super Admin Only) ── */}
      {isSuperAdmin && (
        <div style={sectionStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--text-primary)' }}>
            <Route size={20} color="var(--accent-400)" /> Login Page Path
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Set the secret URL path for the login page. Only people who know this path can access login.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '500px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Path (starts with /)</label>
              <input
                style={inputStyle}
                value={loginPath}
                onChange={e => setLoginPath(e.target.value)}
                placeholder="/shadowphantomlogin"
              />
            </div>
            <button style={btnPrimary} onClick={handleSaveLoginPath} disabled={savingPath}>
              <Save size={16} /> {savingPath ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current login URL: </span>
            <code style={{ color: 'var(--primary-400)', fontSize: '13px', fontWeight: 600 }}>
              {window.location.origin}{loginPath}
            </code>
          </div>
        </div>
      )}

      {/* ── Team Management (Super Admin Only) ── */}
      {isSuperAdmin && (
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', margin: 0 }}>
              <Users size={20} color="var(--success-400)" /> Team Management
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={btnGhost} onClick={loadMembers}>
                <RefreshCw size={14} /> Refresh
              </button>
              <button style={btnPrimary} onClick={() => setShowAddModal(true)}>
                <UserPlus size={16} /> Add Member
              </button>
            </div>
          </div>

          {loadingMembers ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No team members found</div>
          ) : (
            members.map(member => (
              <div key={member._id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: member.role === 'super_admin' ? 'linear-gradient(135deg, var(--primary-500), var(--accent-500))' : 'var(--bg-base)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: 'white',
                    border: '2px solid var(--border-default)',
                  }}>
                    {member.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                      {member.name || member.email}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{member.email}</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                        background: member.role === 'super_admin' ? 'rgba(var(--primary-500-rgb, 99, 102, 241), 0.15)' : 'rgba(var(--success-500-rgb, 16, 185, 129), 0.15)',
                        color: member.role === 'super_admin' ? 'var(--primary-400)' : 'var(--success-400)',
                        textTransform: 'uppercase',
                      }}>
                        {member.role.replace('_', ' ')}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                        background: member.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: member.status === 'active' ? 'var(--success-400)' : 'var(--danger-400)',
                      }}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions — don't show for self */}
                {member._id !== admin?.id && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      style={btnGhost}
                      title="Change Password"
                      onClick={() => { setShowPassModal(member._id); setForceNewPass(''); }}
                    >
                      <Key size={14} />
                    </button>
                    <button
                      style={{ ...btnGhost, color: member.status === 'active' ? 'var(--warning-400)' : 'var(--success-400)' }}
                      title={member.status === 'active' ? 'Suspend' : 'Activate'}
                      onClick={() => handleToggleStatus(member)}
                    >
                      {member.status === 'active' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    </button>
                    <button
                      style={{ ...btnGhost, color: 'var(--danger-400)' }}
                      title="Delete"
                      onClick={() => handleDeleteMember(member)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Add Member Modal ── */}
      {showAddModal && (
        <div style={modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
              <UserPlus size={20} color="var(--primary-400)" /> Add Team Member
            </h3>
            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="user@example.com" required />
              </div>
              <div>
                <label style={labelStyle}>Password *</label>
                <input style={inputStyle} type="text" value={newMember.password} onChange={e => setNewMember({ ...newMember, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}>
                  <option value="moderator">Moderator</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" style={btnGhost} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" style={btnPrimary} disabled={addingMember}>
                  <Plus size={16} /> {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Force Password Change Modal ── */}
      {showPassModal && (
        <div style={modalOverlay} onClick={() => setShowPassModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
              <Key size={20} color="var(--warning-400)" /> Change Password
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Set new password for <strong style={{ color: 'var(--text-primary)' }}>{getPassModalMember()?.email}</strong>
            </p>
            <form onSubmit={handleForcePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <input
                  style={inputStyle}
                  type="text"
                  value={forceNewPass}
                  onChange={e => setForceNewPass(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" style={btnGhost} onClick={() => setShowPassModal(null)}>Cancel</button>
                <button type="submit" style={btnPrimary} disabled={changingMemberPass}>
                  <Save size={16} /> {changingMemberPass ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
