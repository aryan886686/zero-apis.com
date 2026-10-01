import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Globe,
  Key,
  ScrollText,
  Settings,
  LogOut,
  Zap,
  Menu,
  X,
  Compass,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Overview' },
  { to: '/dashboard/apis', icon: Globe, label: 'API Management', section: 'Management' },
  { to: '/dashboard/keys', icon: Key, label: 'API Keys', section: 'Management' },
  { to: '/dashboard/explorer', icon: Compass, label: 'API Explorer', section: 'Management' },
  { to: '/dashboard/logs', icon: ScrollText, label: 'Request Logs', section: 'Analytics' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', section: 'Account' },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your API gateway' },
  '/dashboard/apis': { title: 'API Management', subtitle: 'Create and manage your API endpoints' },
  '/dashboard/keys': { title: 'API Keys', subtitle: 'Generate and manage access keys' },
  '/dashboard/explorer': { title: 'API Explorer', subtitle: 'View specific endpoints available for your keys' },
  '/dashboard/logs': { title: 'Request Logs', subtitle: 'Monitor API traffic and requests' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Manage your account preferences' },
};

const Layout: React.FC = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const path = window.location.pathname;
  const currentPage = pageTitles[path] || pageTitles['/dashboard'];

  const handleLogout = () => {
    logout();
    navigate('/shadowphantomlogin');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Group nav items by section
  const sections = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`overlay-backdrop ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Zap size={20} color="white" />
            </div>
            <div>
              <div className="sidebar-brand-text">API Gateway</div>
              <span className="sidebar-brand-badge">Management System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(sections).map(([section, items]) => (
            <div className="sidebar-section" key={section}>
              <div className="sidebar-section-title">{section}</div>
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="link-icon" size={20} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="sidebar-avatar">
              {admin ? getInitials(admin.email) : 'AD'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{admin?.email || 'Admin'}</div>
              <div className="sidebar-user-role">{admin?.role?.replace('_', ' ') || 'Admin'}</div>
            </div>
            <LogOut size={16} color="var(--text-muted)" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="topbar-title">
              <h1>{currentPage.title}</h1>
              <p>{currentPage.subtitle}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--success-400)',
                  boxShadow: '0 0 8px var(--success-400)',
                }}
              />
              <span className="text-xs text-muted">System Online</span>
            </div>
          </div>
        </div>

        <div className="page-content" key={path}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
