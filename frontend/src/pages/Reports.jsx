import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import {
  BarChart2, AlertTriangle, ArrowDownUp, Users2,
  TrendingUp, TrendingDown, Minus, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '../api/endpoints';
import { formatCurrency, formatDateTime, getStockStatus } from '../utils/helpers';
import LoadingSpinner, { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';

// ─── Shared chart theme ───────────────────────────────────────────────────────
const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '12px',
  },
  labelStyle: { color: '#94a3b8', fontWeight: 600 },
  cursor: { fill: 'rgba(99,102,241,0.08)' },
};

const CHART_GRID_COLOR = '#1e293b';
const TICK_COLOR = '#64748b';

// ─── Tab pill config ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'inventory',   label: 'Inventory',        Icon: BarChart2 },
  { id: 'low-stock',   label: 'Low Stock',         Icon: AlertTriangle },
  { id: 'movements',   label: 'Stock Movements',   Icon: ArrowDownUp },
  { id: 'suppliers',   label: 'Suppliers',         Icon: Users2 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDateString(d) {
  return d.toISOString().split('T')[0];
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: toDateString(from), to: toDateString(to) };
}

// ─── Custom tooltip for supplier bar ─────────────────────────────────────────
function SupplierTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px' }}>
      <p className="text-xs font-semibold text-slate-300">{payload[0]?.payload?.supplier_name}</p>
      <p className="text-xs text-blue-400 mt-1">
        Total Value: <span className="font-bold">{formatCurrency(payload[0]?.value)}</span>
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: Inventory
// ═════════════════════════════════════════════════════════════════════════════
function InventoryTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.inventory();
      setData(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error('Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const top10 = [...data]
    .sort((a, b) => (b.total_value ?? 0) - (a.total_value ?? 0))
    .slice(0, 10);

  const chartData = top10.map((p) => ({
    name: p.name?.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    fullName: p.name,
    value: Number(p.total_value ?? 0),
  }));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Top 10 Products by Stock Value</h3>
        {chartData.length === 0 ? (
          <EmptyState title="No inventory data" description="No products found." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: TICK_COLOR, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: TICK_COLOR, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={52}
              />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(val, _name, props) => [
                  formatCurrency(val),
                  props.payload.fullName,
                ]}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Table */}
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Inventory Summary</h3>
          <button id="btn-refresh-inventory" onClick={load} className="btn-ghost btn-sm gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        {data.length === 0 ? (
          <EmptyState title="No products" description="No inventory records found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Unit Price</th>
                  <th className="text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p, i) => (
                  <tr key={p.id ?? i} id={`inv-row-${p.id ?? i}`}>
                    <td className="font-medium text-slate-200">{p.name}</td>
                    <td>
                      <span className="badge-gray">{p.sku ?? '—'}</span>
                    </td>
                    <td className="text-slate-400">{p.category ?? '—'}</td>
                    <td className="text-right font-mono">{(p.quantity ?? 0).toLocaleString()}</td>
                    <td className="text-right font-mono">{formatCurrency(p.price)}</td>
                    <td className="text-right font-mono font-semibold text-emerald-400">
                      {formatCurrency(p.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: Low Stock
// ═════════════════════════════════════════════════════════════════════════════
function LowStockTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.lowStock();
      setData(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error('Failed to load low-stock report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function getSeverityBadge(qty, min) {
    if (qty === 0) return <span className="badge-red">Out of Stock</span>;
    const ratio = min > 0 ? qty / min : 1;
    if (ratio <= 0.5) return <span className="badge-red">Critical</span>;
    return <span className="badge-yellow">Low Stock</span>;
  }

  if (loading) return <PageLoader />;

  return (
    <div className="table-wrapper">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-yellow-400" />
          <h3 className="text-sm font-semibold text-slate-300">
            Low Stock Alerts
            {data.length > 0 && (
              <span className="ml-2 badge-red">{data.length} item{data.length !== 1 ? 's' : ''}</span>
            )}
          </h3>
        </div>
        <button id="btn-refresh-lowstock" onClick={load} className="btn-ghost btn-sm gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="All stock levels are healthy"
          description="No products are below their minimum stock threshold."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="text-right">Current Stock</th>
                <th className="text-right">Min Threshold</th>
                <th>Status</th>
                <th>Warehouse</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, i) => (
                <tr key={p.id ?? i} id={`ls-row-${p.id ?? i}`}>
                  <td className="font-medium text-slate-200">{p.name}</td>
                  <td>
                    <span className="badge-gray">{p.sku ?? '—'}</span>
                  </td>
                  <td className="text-slate-400">{p.category ?? '—'}</td>
                  <td className="text-right font-mono font-semibold text-red-400">
                    {(p.quantity ?? 0).toLocaleString()}
                  </td>
                  <td className="text-right font-mono text-slate-400">
                    {(p.min_stock_threshold ?? p.min_quantity ?? '—').toLocaleString?.() ?? '—'}
                  </td>
                  <td>{getSeverityBadge(p.quantity, p.min_stock_threshold ?? p.min_quantity)}</td>
                  <td className="text-slate-400">{p.warehouse ?? p.warehouse_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: Stock Movements
// ═════════════════════════════════════════════════════════════════════════════
function MovementsTab() {
  const [dateRange, setDateRange] = useState(defaultDateRange());
  const [data, setData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.movements({ from: dateRange.from, to: dateRange.to });
      const rows = res.data?.data ?? res.data ?? [];
      setData(rows);

      // Build daily aggregation for the line chart
      const byDate = {};
      rows.forEach((m) => {
        const d = (m.created_at ?? m.date ?? '').split('T')[0];
        if (!d) return;
        if (!byDate[d]) byDate[d] = { date: d, in: 0, out: 0 };
        if ((m.type ?? m.movement_type) === 'IN') byDate[d].in += Number(m.quantity ?? 0);
        else byDate[d].out += Number(m.quantity ?? 0);
      });
      setChartData(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
    } catch {
      toast.error('Failed to load movements report');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const totalIn  = data.filter((m) => (m.type ?? m.movement_type) === 'IN').reduce((s, m) => s + Number(m.quantity ?? 0), 0);
  const totalOut = data.filter((m) => (m.type ?? m.movement_type) === 'OUT').reduce((s, m) => s + Number(m.quantity ?? 0), 0);
  const netChange = totalIn - totalOut;

  function handleDateChange(field, val) {
    setDateRange((prev) => ({ ...prev, [field]: val }));
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="mov-from" className="label">From Date</label>
          <input
            id="mov-from"
            type="date"
            value={dateRange.from}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="input w-44"
            max={dateRange.to}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="mov-to" className="label">To Date</label>
          <input
            id="mov-to"
            type="date"
            value={dateRange.to}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="input w-44"
            min={dateRange.from}
          />
        </div>
        <button id="btn-apply-movements" onClick={load} className="btn-primary gap-1.5 h-10">
          <RefreshCw size={14} /> Apply
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={TrendingUp}
              label="Total Stock IN"
              value={totalIn.toLocaleString()}
              color="green"
            />
            <StatCard
              icon={TrendingDown}
              label="Total Stock OUT"
              value={totalOut.toLocaleString()}
              color="red"
            />
            <StatCard
              icon={Minus}
              label="Net Change"
              value={(netChange >= 0 ? '+' : '') + netChange.toLocaleString()}
              color={netChange >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Line Chart */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Stock IN vs OUT Over Time</h3>
            {chartData.length === 0 ? (
              <EmptyState title="No movement data" description="No stock movements in the selected period." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: TICK_COLOR, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: TICK_COLOR, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP_STYLE}
                    formatter={(val, name) => [val.toLocaleString(), name === 'in' ? 'Stock IN' : 'Stock OUT']}
                  />
                  <Legend
                    formatter={(val) => (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        {val === 'in' ? 'Stock IN' : 'Stock OUT'}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="in"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="out"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Movements Table */}
          <div className="table-wrapper">
            <div className="px-4 py-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300">
                Movement Log
                <span className="ml-2 text-slate-500 font-normal">({data.length} records)</span>
              </h3>
            </div>
            {data.length === 0 ? (
              <EmptyState title="No movements" description="No stock movements found for the selected period." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th className="text-right">Qty</th>
                      <th>User</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((m, i) => {
                      const type = m.type ?? m.movement_type ?? '';
                      const isIn = type === 'IN';
                      return (
                        <tr key={m.id ?? i} id={`mov-row-${m.id ?? i}`}>
                          <td className="text-slate-400 whitespace-nowrap text-xs">
                            {formatDateTime(m.created_at ?? m.date)}
                          </td>
                          <td className="font-medium text-slate-200">
                            {m.product_name ?? m.product?.name ?? '—'}
                          </td>
                          <td>
                            <span className={isIn ? 'badge-green' : 'badge-red'}>
                              {isIn ? '↑ IN' : '↓ OUT'}
                            </span>
                          </td>
                          <td className={`text-right font-mono font-semibold ${isIn ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isIn ? '+' : '-'}{(m.quantity ?? 0).toLocaleString()}
                          </td>
                          <td className="text-slate-400">{m.user_name ?? m.user?.name ?? '—'}</td>
                          <td className="text-slate-500 text-xs max-w-xs truncate">{m.notes ?? m.note ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB: Suppliers
// ═════════════════════════════════════════════════════════════════════════════
function SuppliersTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.suppliers();
      setData(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error('Failed to load suppliers report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = [...data]
    .sort((a, b) => (b.total_value ?? 0) - (a.total_value ?? 0))
    .slice(0, 10)
    .map((s) => ({
      supplier_name: s.supplier_name ?? s.name,
      value: Number(s.total_value ?? 0),
    }));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Horizontal Bar Chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">
          Top Suppliers by Total Value
        </h3>
        {chartData.length === 0 ? (
          <EmptyState title="No supplier data" description="No supplier report data available." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 44)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: TICK_COLOR, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="supplier_name"
                width={130}
                tick={{ fill: TICK_COLOR, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v?.length > 18 ? v.slice(0, 18) + '…' : v)}
              />
              <Tooltip content={<SupplierTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Suppliers Table */}
      <div className="table-wrapper">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Supplier Performance</h3>
          <button id="btn-refresh-suppliers" onClick={load} className="btn-ghost btn-sm gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        {data.length === 0 ? (
          <EmptyState title="No suppliers" description="No supplier data found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th className="text-right">Total Orders</th>
                  <th className="text-right">Products Supplied</th>
                  <th className="text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s, i) => (
                  <tr key={s.id ?? i} id={`sup-row-${s.id ?? i}`}>
                    <td>
                      <p className="font-medium text-slate-200">{s.supplier_name ?? s.name}</p>
                      {s.email && (
                        <p className="text-xs text-slate-500 mt-0.5">{s.email}</p>
                      )}
                    </td>
                    <td className="text-right font-mono">{(s.total_orders ?? 0).toLocaleString()}</td>
                    <td className="text-right font-mono">{(s.total_products ?? s.products_count ?? 0).toLocaleString()}</td>
                    <td className="text-right font-mono font-semibold text-blue-400">
                      {formatCurrency(s.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════════════
export default function Reports() {
  const [activeTab, setActiveTab] = useState('inventory');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Insights across inventory, stock movements, and supplier performance
          </p>
        </div>
      </div>

      {/* Tab Pills */}
      <div
        id="reports-tabs"
        role="tablist"
        className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit"
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`tab-btn-${id}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div id="reports-tab-content" role="tabpanel">
        {activeTab === 'inventory'  && <InventoryTab />}
        {activeTab === 'low-stock'  && <LowStockTab />}
        {activeTab === 'movements'  && <MovementsTab />}
        {activeTab === 'suppliers'  && <SuppliersTab />}
      </div>
    </div>
  );
}
