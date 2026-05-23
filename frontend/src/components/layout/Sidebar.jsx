import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowLeftRight, Truck, ShoppingCart,
  Warehouse, FileBarChart2, ScrollText, Settings, ChevronLeft, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products',        icon: Package,          label: 'Products' },
  { to: '/stock',           icon: ArrowLeftRight,   label: 'Stock Movement' },
  { to: '/suppliers',       icon: Truck,            label: 'Suppliers' },
  { to: '/purchase-orders', icon: ShoppingCart,     label: 'Purchase Orders' },
  { to: '/warehouses',      icon: Warehouse,        label: 'Warehouses' },
  { to: '/reports',         icon: FileBarChart2,    label: 'Reports' },
  { to: '/logs',            icon: ScrollText,       label: 'Audit Logs', adminOnly: true },
  { to: '/settings',        icon: Settings,         label: 'Settings' },
];

export default function Sidebar({ open, setOpen }) {
  const { user, isManager } = useAuth();

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${
        open ? 'w-60' : 'w-16'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center shadow-glow">
          <Zap size={16} className="text-white" />
        </div>
        {open && (
          <div className="animate-fade-in">
            <p className="text-sm font-bold text-slate-100">WarehouseIQ</p>
            <p className="text-xs text-slate-500">Smart Management</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.filter(item => !item.adminOnly || isManager).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${!open ? 'justify-center' : ''}`
            }
            title={!open ? label : ''}
          >
            <Icon size={18} className="flex-shrink-0" />
            {open && <span className="animate-fade-in truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {open && user && (
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="absolute -right-3 top-16 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors z-10"
      >
        <ChevronLeft size={12} className={`transition-transform duration-300 ${open ? '' : 'rotate-180'}`} />
      </button>
    </aside>
  );
}
