import React, { useEffect, useState } from 'react';
import { statsApi } from '../api/client';
import {
  Globe,
  Key,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface OverviewData {
  totalApis: number;
  activeApis: number;
  totalKeys: number;
  activeKeys: number;
  expiringKeys: number;
  todayRequests: number;
  totalRequests: number;
  todayStats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    totalBandwidth: number;
  };
}

interface TrendItem {
  _id: string;
  total: number;
  successful: number;
  failed: number;
  avgResponseTime: number;
}

interface TopApi {
  _id: string;
  count: number;
  avgResponseTime: number;
  errorRate: number;
}

const COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];

const formatNumber = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="value" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [topApis, setTopApis] = useState<TopApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, trendRes, topRes] = await Promise.all([
          statsApi.overview(),
          statsApi.trend(7),
          statsApi.topApis(7, 5),
        ]);
        setOverview(ovRes.data.data);
        setTrend(trendRes.data.data);
        setTopApis(topRes.data.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div className="stat-card" key={i}>
              <div className="skeleton skeleton-stat" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text-sm" />
            </div>
          ))}
        </div>
        <div className="charts-grid">
          <div className="chart-card chart-card-full">
            <div className="skeleton" style={{ height: '300px' }} />
          </div>
        </div>
      </div>
    );
  }

  const stats = overview || {
    totalApis: 0, activeApis: 0, totalKeys: 0, activeKeys: 0,
    expiringKeys: 0, todayRequests: 0, totalRequests: 0,
    todayStats: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, avgResponseTime: 0, totalBandwidth: 0 },
  };

  const successRate = stats.todayStats.totalRequests > 0
    ? ((stats.todayStats.successfulRequests / stats.todayStats.totalRequests) * 100).toFixed(1)
    : '100';

  const pieData = [
    { name: 'Success', value: stats.todayStats.successfulRequests || 0 },
    { name: 'Failed', value: stats.todayStats.failedRequests || 0 },
  ].filter(d => d.value > 0);

  return (
    <div>
      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon primary"><Globe size={20} /></div>
            <span className="stat-label">Total APIs</span>
          </div>
          <div className="stat-value">{stats.totalApis}</div>
          <div className="stat-change positive">
            {stats.activeApis} active
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon accent"><Key size={20} /></div>
            <span className="stat-label">API Keys</span>
          </div>
          <div className="stat-value">{stats.totalKeys}</div>
          <div className="stat-change positive">
            {stats.activeKeys} active
            {stats.expiringKeys > 0 && (
              <span style={{ color: 'var(--warning-400)', marginLeft: '8px' }}>
                • {stats.expiringKeys} expiring
              </span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon success"><Activity size={20} /></div>
            <span className="stat-label">Today's Requests</span>
          </div>
          <div className="stat-value">{formatNumber(stats.todayRequests)}</div>
          <div className="stat-change positive">
            {successRate}% success rate
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon warning"><Zap size={20} /></div>
            <span className="stat-label">Avg Response</span>
          </div>
          <div className="stat-value">{Math.round(stats.todayStats.avgResponseTime)}ms</div>
          <div className="stat-change">
            <span className="text-muted">{formatBytes(stats.todayStats.totalBandwidth)} bandwidth</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Request Trend */}
        <div className="chart-card chart-card-full">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Request Trend (7 days)
              </div>
              <div className="card-subtitle">Daily API request volume</div>
            </div>
            <span className="text-xs text-muted">{formatNumber(stats.totalRequests)} total</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="_id"
                tickFormatter={(v: string) => v.split('-').slice(1).join('/')}
                stroke="rgba(255,255,255,0.1)"
              />
              <YAxis stroke="rgba(255,255,255,0.1)" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="successful"
                name="Successful"
                stroke="#6366f1"
                fill="url(#gradSuccess)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke="#ef4444"
                fill="url(#gradFailed)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top APIs */}
        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <BarChart3 size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Top APIs
              </div>
              <div className="card-subtitle">By request count (7d)</div>
            </div>
          </div>
          {topApis.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topApis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.1)" />
                <YAxis
                  type="category"
                  dataKey="_id"
                  width={100}
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Requests" radius={[0, 4, 4, 0]}>
                  {topApis.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <BarChart3 size={32} color="var(--text-muted)" />
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>No API traffic yet</p>
            </div>
          )}
        </div>

        {/* Success/Failure Pie */}
        <div className="chart-card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Health Overview
              </div>
              <div className="card-subtitle">Today's success vs failure</div>
            </div>
          </div>
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#22c55e' }} />
                  <span className="text-muted">Success ({stats.todayStats.successfulRequests})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
                  <span className="text-muted">Failed ({stats.todayStats.failedRequests})</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <Clock size={32} color="var(--text-muted)" />
              <p className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>No requests today</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">System Status</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-xs text-muted mb-2">Active APIs</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{stats.activeApis}/{stats.totalApis}</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-xs text-muted mb-2">Active Keys</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{stats.activeKeys}/{stats.totalKeys}</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-xs text-muted mb-2">Total Requests</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatNumber(stats.totalRequests)}</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div className="text-xs text-muted mb-2">Expiring Keys</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: stats.expiringKeys > 0 ? 'var(--warning-400)' : 'inherit' }}>
              {stats.expiringKeys}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
