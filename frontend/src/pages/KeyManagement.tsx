import React, { useEffect, useState, useCallback } from 'react';
import { keysApi, apisApi, KeyPayload } from '../api/client';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Trash2,
  Key,
  Shield,
  ShieldOff,
  ShieldX,
  Copy,
  Check,
  X,
  Clock,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';

interface KeyItem {
  _id: string;
  key: string;
  maskedKey: string;
  status: string;
  allowedApis: string[];
  expiresAt: string;
  lastUsedAt: string | null;
  usageToday: number;
  usageThisMonth: number;
  totalUsage: number;
  daysRemaining: number;
  metadata: { name: string; description: string };
  createdAt: string;
}

interface ApiItem {
  _id: string;
  name: string;
  customEndpoint: string;
}

const KeyManagement: React.FC = () => {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KeyItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [form, setForm] = useState<KeyPayload>({
    metadata: { name: '', description: '' },
    allowedApis: ['*'],
    expiresAt: '',
  });

  const loadKeys = useCallback(async () => {
    try {
      const res = await keysApi.list({ search, status: statusFilter, page: pagination.page, limit: 20 });
      setKeys(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load keys');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.page]);

  const loadApis = useCallback(async () => {
    try {
      const res = await apisApi.list({ limit: 100 });
      setApis(res.data.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);
  useEffect(() => { loadApis(); }, [loadApis]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: KeyPayload = {
        ...form,
        expiresAt: form.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const res = await keysApi.create(payload);
      setNewKeyResult(res.data.data.rawKey);
      toast.success('API key generated!');
      loadKeys();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate key');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await keysApi.delete(deleteTarget._id);
      toast.success('Key deleted');
      setDeleteTarget(null);
      loadKeys();
    } catch {
      toast.error('Failed to delete key');
    }
  };

  const updateKeyStatus = async (key: KeyItem, status: string) => {
    try {
      await keysApi.updateStatus(key._id, status);
      toast.success(`Key ${status}`);
      loadKeys();
    } catch {
      toast.error('Failed to update key status');
    }
  };

  const copyKey = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getStatusBadge = (status: string) => `badge badge-${status}`;

  const getExpiryColor = (days: number) => {
    if (days <= 0) return 'var(--danger-400)';
    if (days <= 7) return 'var(--warning-400)';
    return 'var(--text-secondary)';
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              placeholder="Search keys..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            />
          </div>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => { setShowCreateModal(true); setNewKeyResult(null); }} id="generate-key-btn">
            <Plus size={16} /> Generate Key
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-container">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="skeleton" style={{ height: '200px' }} />
          </div>
        </div>
      ) : keys.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Key size={28} /></div>
            <h3>No API Keys</h3>
            <p>Generate your first API key to start using the gateway.</p>
            <button className="btn btn-primary mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Generate First Key
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Status</th>
                  <th>Access</th>
                  <th>Usage (Total)</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key._id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{key.metadata.name}</div>
                      {key.metadata.description && (
                        <div className="text-xs text-muted truncate" style={{ maxWidth: '150px' }}>
                          {key.metadata.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.78rem', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: '4px', color: 'var(--accent-400)' }}>
                        {key.key}
                      </code>
                    </td>
                    <td>
                      <span className={getStatusBadge(key.status)}>
                        <span className={`badge-dot ${key.status}`} />
                        {key.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs">
                        {key.allowedApis.includes('*') ? (
                          <span style={{ color: 'var(--primary-400)' }}>All APIs</span>
                        ) : (
                          `${key.allowedApis.length} API(s)`
                        )}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {key.totalUsage.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted">
                        Today: {key.usageToday}
                      </div>
                    </td>
                    <td>
                      <div style={{ color: getExpiryColor(key.daysRemaining), fontSize: '0.8rem' }}>
                        {key.daysRemaining <= 0 ? 'Expired' : `${key.daysRemaining}d remaining`}
                      </div>
                      <div className="text-xs text-muted">
                        {format(new Date(key.expiresAt), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {key.status === 'active' && (
                          <button className="btn btn-ghost btn-icon" onClick={() => updateKeyStatus(key, 'suspended')} title="Suspend">
                            <ShieldOff size={15} />
                          </button>
                        )}
                        {key.status === 'suspended' && (
                          <button className="btn btn-ghost btn-icon" onClick={() => updateKeyStatus(key, 'active')} title="Activate">
                            <Shield size={15} color="var(--success-400)" />
                          </button>
                        )}
                        {key.status !== 'revoked' && (
                          <button className="btn btn-ghost btn-icon" onClick={() => updateKeyStatus(key, 'revoked')} title="Revoke">
                            <ShieldX size={15} color="var(--warning-400)" />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(key)} title="Delete">
                          <Trash2 size={15} color="var(--danger-400)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <span className="pagination-info">Showing {keys.length} of {pagination.total} keys</span>
              <div className="pagination-controls">
                <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>‹</button>
                {[...Array(Math.min(pagination.pages, 5))].map((_, i) => (
                  <button key={i} className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`} onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}>{i + 1}</button>
                ))}
                <button className="pagination-btn" disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>›</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setNewKeyResult(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{newKeyResult ? 'Key Generated!' : 'Generate API Key'}</h3>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setNewKeyResult(null); }}><X size={18} /></button>
            </div>

            {newKeyResult ? (
              <>
                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  {/* Key Display */}
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'rgba(34, 197, 94, 0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Check size={28} color="var(--success-400)" />
                    </div>
                    <p style={{ color: 'var(--success-400)', fontSize: '0.85rem', fontWeight: 500 }}>
                      API Key generated successfully! You can always view and copy it from the table.
                    </p>
                  </div>
                  <div className="key-display" style={{ marginBottom: '24px' }}>
                    <span className="key-value">{newKeyResult}</span>
                    <button className={`btn btn-ghost btn-icon key-copy-btn ${copied ? 'copied' : ''}`} onClick={() => copyKey(newKeyResult)}>
                      {copied ? <Check size={16} color="var(--success-400)" /> : <Copy size={16} />}
                    </button>
                  </div>

                  {/* Available Endpoints */}
                  <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={16} color="var(--primary-400)" />
                      Available Endpoints with this Key
                    </h4>
                    {apis.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active APIs found. Add an API first.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {apis.map((api) => {
                          const url = `http://localhost:3000/api/v1/${api.customEndpoint}?key=${newKeyResult}&q=USER_INPUT`;
                          return (
                            <div key={api._id} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                              <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{api.name}</span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-400)' }}>GET /api/v1/{api.customEndpoint}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
                                <code style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--accent-300)', flex: 1, wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
                                  {url}
                                </code>
                                <button
                                  onClick={() => copyKey(url)}
                                  style={{ background: 'var(--bg-input)', border: 'none', borderLeft: '1px solid var(--border-default)', padding: '0 14px', cursor: 'pointer' }}
                                  title="Copy URL"
                                >
                                  <Copy size={14} color="var(--text-muted)" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={() => { setShowCreateModal(false); setNewKeyResult(null); }}>Done</button>
                </div>
              </>
            ) : (
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Key Name</label>
                      <input className="form-input" value={form.metadata?.name || ''} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata!, name: e.target.value } })} placeholder="e.g., Production Key" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input className="form-input" value={form.metadata?.description || ''} onChange={(e) => setForm({ ...form, metadata: { ...form.metadata!, description: e.target.value } })} placeholder="What is this key used for?" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">API Access</label>
                      <select className="form-input" value={form.allowedApis?.includes('*') ? '*' : 'custom'} onChange={(e) => setForm({ ...form, allowedApis: e.target.value === '*' ? ['*'] : [] })}>
                        <option value="*">All APIs (wildcard)</option>
                        <option value="custom">Specific APIs</option>
                      </select>
                    </div>
                    {!form.allowedApis?.includes('*') && (
                      <div className="form-group">
                        <label className="form-label">Select APIs</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                          {apis.map((api) => (
                            <label key={api._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-input)' }}>
                              <input
                                type="checkbox"
                                checked={form.allowedApis?.includes(api.customEndpoint) || false}
                                onChange={(e) => {
                                  const current = form.allowedApis || [];
                                  setForm({
                                    ...form,
                                    allowedApis: e.target.checked
                                      ? [...current, api.customEndpoint]
                                      : current.filter(a => a !== api.customEndpoint)
                                  });
                                }}
                              />
                              <span>{api.name}</span>
                              <span className="text-xs text-muted">({api.customEndpoint})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input className="form-input" type="date" value={form.expiresAt?.split('T')[0] || ''} onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
                      <span className="text-xs text-muted">Leave empty for 1 year default</span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                    <Key size={16} /> Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-body">
              <div className="confirm-content">
                <div className="confirm-icon danger"><Trash2 size={24} /></div>
                <h3>Delete API Key</h3>
                <p className="confirm-message mt-2">
                  Delete key <strong>"{deleteTarget.metadata.name}"</strong>?
                  Any applications using this key will lose access.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete Key</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyManagement;
