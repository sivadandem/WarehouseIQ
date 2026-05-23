import React, { useEffect, useState } from 'react';
import { Package, Boxes, AlertTriangle, TrendingUp, Warehouse, Truck, ShoppingCart, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { dashboardApi } from '../api/endpoints';
import StatCard from '../components/ui/StatCard';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDateTime, getStockStatus } from '../utils/helpers';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary().then(r => setData(r.data.data)).catch(() => toast.error('Failed to load dashboard')).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;

  const { stats, lowStockProducts, recentMovements, categoryBreakdown, stockTrend, topProducts } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Warehouse overview & real-time analytics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Products" value={stats.totalProducts} color="brand" />
        <StatCard icon={Boxes} label="Total Stock" value={stats.totalStock.toLocaleString()} color="green" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStockCount} sub={`${stats.outOfStockCount} out of stock`} color="yellow" />
        <StatCard icon={DollarSign} label="Inventory Value" value={formatCurrency(stats.totalInventoryValue)} color="purple" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Warehouse} label="Warehouses" value={stats.totalWarehouses} color="blue" />
        <StatCard icon={Truck} label="Suppliers" value={stats.totalSuppliers} color="brand" />
        <StatCard icon={ShoppingCart} label="Pending Orders" value={stats.pendingOrders} color="yellow" />
        <StatCard icon={TrendingUp} label="Out of Stock" value={stats.outOfStockCount} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock Trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Stock Movement Trend (30 days)</h3>
          {stockTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stockTrend}>
                <defs>
                  <linearGradient id="gin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gout" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="stock_in" stroke="#10b981" fill="url(#gin)" name="Stock In" strokeWidth={2} />
                <Area type="monotone" dataKey="stock_out" stroke="#f59e0b" fill="url(#gout)" name="Stock Out" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-500 text-sm">No movement data in the last 30 days</div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Category Breakdown</h3>
          {categoryBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="total_value" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryBreakdown.slice(0, 4).map((c, i) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-slate-400 truncate flex-1">{c.category}</span>
                    <span className="text-xs font-medium text-slate-300">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="flex items-center justify-center h-40 text-slate-500 text-sm">No data</div>}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low stock */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Low Stock Alerts</h3>
            <span className="badge-red">{stats.lowStockCount + stats.outOfStockCount} items</span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {lowStockProducts.slice(0, 6).map(p => {
              const st = getStockStatus(p.quantity, p.min_stock_threshold);
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.sku} · {p.warehouse_name || 'No warehouse'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-200">{p.quantity}</span>
                    <span className={st.cls}>{st.label}</span>
                  </div>
                </div>
              );
            })}
            {lowStockProducts.length === 0 && <p className="text-center text-sm text-slate-500 py-8">All stock levels are healthy ✓</p>}
          </div>
        </div>

        {/* Recent movements */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300">Recent Stock Movements</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {recentMovements.slice(0, 6).map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    m.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>{m.type}</div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{m.product_name}</p>
                    <p className="text-xs text-slate-500">{m.user_name} · {formatDateTime(m.created_at)}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${m.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m.type === 'IN' ? '+' : '-'}{m.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
