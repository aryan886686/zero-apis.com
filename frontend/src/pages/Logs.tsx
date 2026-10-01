import React, { useEffect, useState, useCallback } from 'react';
import { statsApi } from '../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  ScrollText,
  RefreshCw,
  ChevronDown,
  Clock,
  Wifi,
  AlertCircle,
} from 'lucide-react';

interface LogItem {
  _id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  ipAddress: string;
  userAgent: string;
  error: string | null;
  apiId?: { name: string; customEndpoint: string } | null;
  keyId?: { metadata?: { name: string }; key?: string } | null;
  createdAt: string;
}

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 30 });
  const [filters, setFilters] = useState({
    endpoint: '',
    statusCode: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.endpoint) params.endpoint = filters.endpoint;
      if (filters.statusCode) params.statusCode = filters.statusCode;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await statsApi.logs(params);
      setLogs(res.data.data);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const getStatusColor = (code: number) => {
    if (code < 300) return 'var(--success-400)';
    if (code < 400) return 'var(--primary-400)';
    if (code < 500) return 'var(--warning-400)';
    return 'var(--danger-400)';
  };

  const getMethodBadge = (method: string) => `badge badge-method badge-${method.toLowerCase()}`;

  const formatMs = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} /> Filters <ChevronDown size={14} />
          </button>
          <span className="text-xs text-muted">{pagination.total.toLocaleString()} total logs</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={loadLogs}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card mb-4" style={{ animation: 'pageIn 0.2s ease forwards' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Endpoint</label>
              <input className="form-input" placeholder="e.g., number" value={filters.endpoint} onChange={(e) => setFilters(f => ({ ...f, endpoint: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Status Code</label>
              <select className="form-input" value={filters.statusCode} onChange={(e) => setFilters(f => ({ ...f, statusCode: e.target.value }))}>
                <option value="">All</option>
                <option value="200">200 OK</option>
                <option value="400">400 Bad Request</option>
                <option value="401">401 Unauthorized</option>
                <option value="403">403 Forbidden</option>
                <option value="404">404 Not Found</option>
                <option value="429">429 Rate Limited</option>
                <option value="500">500 Server Error</option>
                <option value="502">502 Gateway Error</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={filters.startDate} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input className="form-input" type="date" value={filters.endDate} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <button className="btn btn-primary btn-sm" onClick={() => setPagination(p => ({ ...p, page: 1 }))}>
                Apply
              </button>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: '6px' }} onClick={() => { setFilters({ endpoint: '', statusCode: '', startDate: '', endDate: '' }); setPagination(p => ({ ...p, page: 1 })); }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="table-container">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="skeleton" style={{ height: '300px' }} />
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><ScrollText size={28} /></div>
            <h3>No Logs Found</h3>
            <p>Request logs will appear here once API traffic is routed through the gateway.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Response</th>
                  <th>Size</th>
                  <th>Key</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} onClick={() => setSelectedLog(log)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </div>
                      <div className="text-xs text-muted">
                        {format(new Date(log.createdAt), 'MMM dd')}
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.78rem', padding: '2px 6px', background: 'var(--bg-input)', borderRadius: '4px' }}>
                        /{log.endpoint}
                      </code>
                    </td>
                    <td><span className={getMethodBadge(log.method)}>{log.method}</span></td>
                    <td>
                      <span style={{
                        color: getStatusColor(log.statusCode),
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <Clock size={12} color="var(--text-muted)" />
                        {formatMs(log.responseTime)}
                      </div>
                    </td>
                    <td className="text-xs text-muted">{formatSize(log.responseSize)}</td>
                    <td>
                      <span className="text-xs truncate" style={{ maxWidth: '100px', display: 'block' }}>
                        {log.keyId?.metadata?.name || '—'}
                      </span>
                    </td>
                    <td className="text-xs text-muted">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span className="pagination-info">
              Page {pagination.page} of {pagination.pages} ({pagination.total.toLocaleString()} logs)
            </span>
            <div className="pagination-controls">
              <button className="pagination-btn" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>‹</button>
              <button className="pagination-btn" disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>›</button>
            </div>
          </div>
        </>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Request Details</h3>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="log-detail-row">
                <span className="log-detail-label">Endpoint</span>
                <span className="log-detail-value">/{selectedLog.endpoint}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">Method</span>
                <span className={getMethodBadge(selectedLog.method)}>{selectedLog.method}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">Status Code</span>
                <span className="log-detail-value" style={{ color: getStatusColor(selectedLog.statusCode) }}>{selectedLog.statusCode}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">Response Time</span>
                <span className="log-detail-value">{formatMs(selectedLog.responseTime)}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">Request Size</span>
                <span className="log-detail-value">{formatSize(selectedLog.requestSize)}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">Response Size</span>
                <span className="log-detail-value">{formatSize(selectedLog.responseSize)}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">IP Address</span>
                <span className="log-detail-value">{selectedLog.ipAddress || 'N/A'}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">API Key</span>
                <span className="log-detail-value">{selectedLog.keyId?.metadata?.name || 'N/A'}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">API</span>
                <span className="log-detail-value">{selectedLog.apiId?.name || 'N/A'}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">Timestamp</span>
                <span className="log-detail-value">{format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}</span>
              </div>
              <div className="log-detail-row">
                <span className="log-detail-label">User Agent</span>
                <span className="log-detail-value text-sm" style={{ maxWidth: '300px', wordBreak: 'break-all' }}>
                  {selectedLog.userAgent || 'N/A'}
                </span>
              </div>
              {selectedLog.error && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger-400)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>
                    <AlertCircle size={14} /> Error
                  </div>
                  <div style={{ color: 'var(--danger-400)', fontSize: '0.8rem' }}>{selectedLog.error}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
