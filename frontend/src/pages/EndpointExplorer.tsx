import React, { useEffect, useState } from 'react';
import { apisApi } from '../api/client';
import { Globe, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

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
}

const EndpointExplorer: React.FC = () => {
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ORIGIN = window.location.origin;

  useEffect(() => {
    const fetchApis = async () => {
      try {
        const res = await apisApi.list({ limit: 100, status: 'active' });
        setApis(res.data.data);
      } catch {
        toast.error('Failed to load APIs');
      } finally {
        setLoading(false);
      }
    };
    fetchApis();
  }, []);

  const buildUrl = (api: ApiItem) => {
    return `${ORIGIN}/api/v1/${api.customEndpoint}?key=ENTER_YOUR_KEY&${api.paramName}=ENTER_YOUR_QUERY`;
  };

  const copyUrl = (api: ApiItem) => {
    navigator.clipboard.writeText(buildUrl(api));
    setCopiedId(api._id);
    toast.success('URL copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: '#22c55e',
      POST: '#3b82f6',
      PUT: '#f59e0b',
      DELETE: '#ef4444',
      PATCH: '#a855f7',
    };
    return colors[method] || '#6b7280';
  };

  return (
    <div>
      {/* Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '44px', height: '44px',
          background: 'rgba(99,102,241,0.2)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={22} color="var(--primary-400)" />
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            How to Use These Endpoints
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Copy any endpoint URL below. Replace <code style={{ background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary-300)', fontWeight: 600 }}>ENTER_YOUR_KEY</code> with your API key from the Keys section, and <code style={{ background: 'rgba(6,182,212,0.15)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-300)', fontWeight: 600 }}>ENTER_YOUR_QUERY</code> with the actual data you want to lookup.
          </p>
        </div>
      </div>

      {/* Endpoints Grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '160px', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : apis.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Globe size={28} /></div>
            <h3>No Active APIs</h3>
            <p>Add an API from the API Management section first.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {apis.map((api) => (
            <div key={api._id} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--primary-500)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.08)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              {/* Header */}
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px',
                    background: `${getMethodColor(api.method)}15`,
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Globe size={18} color={getMethodColor(api.method)} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {api.name}
                    </h3>
                    {api.description && (
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {api.description}
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    background: `${getMethodColor(api.method)}20`,
                    color: getMethodColor(api.method),
                  }}>
                    {api.method}
                  </span>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    background: 'rgba(34,197,94,0.1)',
                    color: 'var(--success-400)',
                  }}>
                    ● Active
                  </span>
                </div>
              </div>

              {/* Endpoint URL */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Endpoint URL
                </div>
                <div style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'stretch',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '14px 16px',
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-all',
                    overflowX: 'auto',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>{ORIGIN}/api/v1/</span>
                    <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>{api.customEndpoint}</span>
                    <span style={{ color: 'var(--text-muted)' }}>?key=</span>
                    <span style={{ color: 'var(--primary-300)', background: 'rgba(99,102,241,0.12)', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>ENTER_YOUR_KEY</span>
                    <span style={{ color: 'var(--text-muted)' }}>&{api.paramName}=</span>
                    <span style={{ color: 'var(--accent-300)', background: 'rgba(6,182,212,0.12)', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>ENTER_YOUR_QUERY</span>
                  </div>
                  <button
                    onClick={() => copyUrl(api)}
                    style={{
                      background: copiedId === api._id ? 'rgba(34,197,94,0.1)' : 'var(--bg-input)',
                      border: 'none',
                      borderLeft: '1px solid var(--border-default)',
                      padding: '0 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'background 0.2s',
                      fontSize: '0.78rem',
                      color: copiedId === api._id ? 'var(--success-400)' : 'var(--text-muted)',
                      fontWeight: 500,
                      minWidth: '90px',
                    }}
                    onMouseOver={e => { if (copiedId !== api._id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseOut={e => { if (copiedId !== api._id) e.currentTarget.style.background = 'var(--bg-input)'; }}
                  >
                    {copiedId === api._id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>
              </div>

              {/* Footer Info */}
              <div style={{
                padding: '10px 20px',
                borderTop: '1px solid var(--border-default)',
                background: 'var(--bg-base)',
                display: 'flex',
                gap: '24px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}>
                <span>Upstream: <code style={{ color: 'var(--text-secondary)' }}>{api.upstreamUrl}</code></span>
                <span>Parameter: <code style={{ color: 'var(--accent-400)', fontWeight: 600 }}>{api.paramName}</code></span>
                <span>Total Requests: <strong style={{ color: 'var(--text-primary)' }}>{api.totalRequests.toLocaleString()}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EndpointExplorer;
