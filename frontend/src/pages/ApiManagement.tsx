import React, { useEffect, useState, useCallback } from 'react';
import { apisApi, ApiPayload } from '../api/client';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Power,
  Globe,
  X,
  ExternalLink,
} from 'lucide-react';

interface ApiItem {
  _id: string;
  name: string;
  description: string;
  customEndpoint: string;
  upstreamUrl: string;
  method: string;
  paramName: string;
  status: string;
  totalRequests: number;
  rateLimit: { requestsPerDay: number; requestsPerMinute: number; concurrentRequests: number };
  caching: { enabled: boolean; ttl: number };
  createdAt: string;
}

const defaultForm: ApiPayload = {
  name: '',
  description: '',
  customEndpoint: '',
  upstreamUrl: '',
  method: 'GET',
  paramName: '',
  rateLimit: { requestsPerDay: 10000, requestsPerMinute: 100, concurrentRequests: 50 },
  caching: { enabled: false, ttl: 3600 },
};

const ApiManagement: React.FC = () => {
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ApiPayload>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiItem | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const loadApis = useCallback(async () => {
    try {
      const res = await apisApi.list({ search, status: statusFilter, page: pagination.page, limit: 20 });
      setApis(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load APIs');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.page]);

  useEffect(() => { loadApis(); }, [loadApis]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (api: ApiItem) => {
    setEditingId(api._id);
    setForm({
      name: api.name,
      description: api.description,
      customEndpoint: api.customEndpoint,
      upstreamUrl: api.upstreamUrl,
      method: api.method,
      paramName: api.paramName,
      rateLimit: api.rateLimit,
      caching: api.caching,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apisApi.update(editingId, form);
        toast.success('API updated successfully');
      } else {
        await apisApi.create(form);
        toast.success('API created successfully');
      }
      setShowModal(false);
      loadApis();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save API');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apisApi.delete(deleteTarget._id);
      toast.success('API deleted successfully');
      setDeleteTarget(null);
      loadApis();
    } catch {
      toast.error('Failed to delete API');
    }
  };

  const copyUrl = (api: ApiItem) => {
    const url = `${window.location.origin}/api/v1/${api.customEndpoint}?${api.paramName}=VALUE&key=YOUR_API_KEY`;
    navigator.clipboard.writeText(url);
    toast.success('Endpoint URL copied to clipboard!');
  };

  const toggleStatus = async (api: ApiItem) => {
    const newStatus = api.status === 'active' ? 'suspended' : 'active';
    try {
      await apisApi.updateStatus(api._id, newStatus);
      toast.success(`API ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      loadApis();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const getMethodBadge = (method: string) => {
    return `badge badge-method badge-${method.toLowerCase()}`;
  };

  const getStatusBadge = (status: string) => {
    return `badge badge-${status}`;
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              placeholder="Search APIs..."
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
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={openCreate} id="create-api-btn">
            <Plus size={16} /> New API
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
      ) : apis.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Globe size={28} /></div>
            <h3>No APIs Found</h3>
            <p>Create your first API endpoint to get started with the gateway.</p>
            <button className="btn btn-primary mt-4" onClick={openCreate}>
              <Plus size={16} /> Create First API
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
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Upstream</th>
                  <th>Status</th>
                  <th>Requests</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apis.map((api) => (
                  <tr key={api._id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{api.name}</div>
                      {api.description && (
                        <div className="text-xs text-muted truncate" style={{ maxWidth: '200px' }}>
                          {api.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: '4px', color: 'var(--accent-400)' }}>
                        /api/v1/{api.customEndpoint}
                      </code>
                    </td>
                    <td><span className={getMethodBadge(api.method)}>{api.method}</span></td>
                    <td>
                      <div className="truncate text-sm" style={{ maxWidth: '200px' }} title={api.upstreamUrl}>
                        {api.upstreamUrl}
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadge(api.status)}>
                        <span className={`badge-dot ${api.status}`} />
                        {api.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {api.totalRequests.toLocaleString()}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(api)} title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => copyUrl(api)} title="Copy URL Template">
                          <Copy size={15} color="var(--accent-400)" />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => toggleStatus(api)}
                          title={api.status === 'active' ? 'Suspend' : 'Activate'}
                        >
                          <Power size={15} color={api.status === 'active' ? 'var(--success-400)' : 'var(--text-muted)'} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(api)} title="Delete">
                          <Trash2 size={15} color="var(--danger-400)" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {apis.length} of {pagination.total} APIs
              </span>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                >
                  ‹
                </button>
                {[...Array(pagination.pages)].map((_, i) => (
                  <button
                    key={i}
                    className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                    onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit API' : 'Create New API'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">API Name *</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Phone Number Lookup" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Description</label>
                    <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this API" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Custom Endpoint *</label>
                    <input className="form-input" value={form.customEndpoint} onChange={(e) => setForm({ ...form, customEndpoint: e.target.value })} required placeholder="e.g., number" />
                    <span className="text-xs text-muted">Access: /api/v1/{form.customEndpoint || 'endpoint'}</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">HTTP Method *</label>
                    <select className="form-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Upstream URL *</label>
                    <div className="form-input-icon">
                      <ExternalLink size={16} className="icon-left" />
                      <input className="form-input" value={form.upstreamUrl} onChange={(e) => setForm({ ...form, upstreamUrl: e.target.value })} required placeholder="e.g. https://api.example.com/data?mobile={number}" />
                    </div>
                    <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                      <strong>Tip:</strong> If the upstream API uses a different parameter name (e.g. <code>mobile</code> instead of <code>number</code>), use a placeholder like <code>{`{${form.paramName || 'parameter'}}`}</code> in the URL.
                    </span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Parameter Name *</label>
                    <input className="form-input" value={form.paramName} onChange={(e) => setForm({ ...form, paramName: e.target.value })} required placeholder="e.g., number" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate Limit (per day)</label>
                    <input className="form-input" type="number" value={form.rateLimit?.requestsPerDay || 10000} onChange={(e) => setForm({ ...form, rateLimit: { ...form.rateLimit!, requestsPerDay: parseInt(e.target.value) } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate Limit (per minute)</label>
                    <input className="form-input" type="number" value={form.rateLimit?.requestsPerMinute || 100} onChange={(e) => setForm({ ...form, rateLimit: { ...form.rateLimit!, requestsPerMinute: parseInt(e.target.value) } })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cache TTL (seconds)</label>
                    <input className="form-input" type="number" value={form.caching?.ttl || 3600} onChange={(e) => setForm({ ...form, caching: { ...form.caching!, ttl: parseInt(e.target.value) } })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={`btn btn-primary ${saving ? 'btn-loading' : ''}`} disabled={saving}>
                  {editingId ? 'Update API' : 'Create API'}
                </button>
              </div>
            </form>
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
                <h3>Delete API</h3>
                <p className="confirm-message mt-2">
                  Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete API</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiManagement;
