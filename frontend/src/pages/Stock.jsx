import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDownCircle, ArrowUpCircle, History, Package, RefreshCw, AlertCircle } from 'lucide-react';
import { stockApi, productsApi, suppliersApi } from '../api/endpoints';
import { formatDateTime } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'in',      label: 'Stock In',          icon: ArrowDownCircle, color: 'text-emerald-400' },
  { id: 'out',     label: 'Stock Out',          icon: ArrowUpCircle,   color: 'text-red-400'     },
  { id: 'history', label: 'Movement History',   icon: History,          color: 'text-slate-300'  },
];

const DEFAULT_IN  = { product_id: '', quantity: '', supplier_id: '', reference_no: '', notes: '' };
const DEFAULT_OUT = { product_id: '', quantity: '', reference_no: '', notes: '' };

export default function Stock() {
  const [tab, setTab]             = useState('in');
  const [products, setProducts]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formIn,  setFormIn]      = useState(DEFAULT_IN);
  const [formOut, setFormOut]     = useState(DEFAULT_OUT);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null); // current qty of selected product for OUT

  // History state
  const [history, setHistory]   = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const [histSearch, setHistSearch] = useState('');
  const [histType, setHistType]   = useState('');
  const HIST_LIMIT = 20;

  useEffect(() => {
    productsApi.getAll({ limit: 500 }).then(r => setProducts(r.data.data || [])).catch(() => {});
    suppliersApi.getAll({ limit: 200 }).then(r => setSuppliers(r.data.data || [])).catch(() => {});
  }, []);

  // When product selected for OUT, grab its current stock
  useEffect(() => {
    if (formOut.product_id) {
      const p = products.find(x => String(x.id) === String(formOut.product_id));
      setSelectedStock(p ? p.quantity : null);
    } else {
      setSelectedStock(null);
    }
  }, [formOut.product_id, products]);

  const loadHistory = useCallback(() => {
    setHistLoading(true);
    stockApi.history({ page: histPage, limit: HIST_LIMIT, type: histType })
      .then(r => {
        setHistory(r.data.data || []);
        setHistTotal(r.data.pagination?.total || 0);
      })
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setHistLoading(false));
  }, [histPage, histType]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const refreshProducts = () => {
    productsApi.getAll({ limit: 500 }).then(r => setProducts(r.data.data || [])).catch(() => {});
  };

  const handleStockIn = async (e) => {
    e.preventDefault();
    if (!formIn.product_id || !formIn.quantity || Number(formIn.quantity) <= 0) {
      toast.error('Please select a product and enter a valid quantity');
      return;
    }
    setSubmitting(true);
    try {
      await stockApi.in({ ...formIn, quantity: Number(formIn.quantity) });
      toast.success('Stock recorded successfully!');
      setFormIn(DEFAULT_IN);
      refreshProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record stock in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockOut = async (e) => {
    e.preventDefault();
    const qty = Number(formOut.quantity);
    if (!formOut.product_id || !qty || qty <= 0) {
      toast.error('Please select a product and enter a valid quantity');
      return;
    }
    if (selectedStock !== null && qty > selectedStock) {
      toast.error(`Insufficient stock. Available: ${selectedStock}`);
      return;
    }
    setSubmitting(true);
    try {
      await stockApi.out({ ...formOut, quantity: qty });
      toast.success('Stock out recorded successfully!');
      setFormOut(DEFAULT_OUT);
      setSelectedStock(null);
      refreshProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record stock out');
    } finally {
      setSubmitting(false);
    }
  };

  const stockInsufficientOut = formOut.product_id && selectedStock !== null && Number(formOut.quantity) > selectedStock;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Stock Movements</h1>
        <p className="text-sm text-slate-400 mt-1">Record stock in/out and view movement history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 rounded-xl w-fit border border-slate-800">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-stock-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={15} className={active ? t.color : ''} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Stock In */}
      {tab === 'in' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ArrowDownCircle size={20} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-100">Record Stock In</h2>
                <p className="text-xs text-slate-400">Add incoming stock to your inventory</p>
              </div>
            </div>
            <form id="form-stock-in" onSubmit={handleStockIn} className="space-y-4">
              <div>
                <label className="label">Product *</label>
                <select id="in-product" className="input" value={formIn.product_id}
                  onChange={e => setFormIn(f => ({ ...f, product_id: e.target.value }))} required>
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Current: {p.quantity}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity *</label>
                  <input id="in-quantity" type="number" min="1" className="input" placeholder="0"
                    value={formIn.quantity} onChange={e => setFormIn(f => ({ ...f, quantity: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Reference No.</label>
                  <input id="in-reference" type="text" className="input" placeholder="e.g. PO-2024-001"
                    value={formIn.reference_no} onChange={e => setFormIn(f => ({ ...f, reference_no: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Supplier</label>
                <select id="in-supplier" className="input" value={formIn.supplier_id}
                  onChange={e => setFormIn(f => ({ ...f, supplier_id: e.target.value }))}>
                  <option value="">No supplier / internal</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea id="in-notes" className="input min-h-[80px] resize-none" placeholder="Optional notes..."
                  value={formIn.notes} onChange={e => setFormIn(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button id="btn-submit-in" type="submit" className="btn-success w-full" disabled={submitting}>
                <ArrowDownCircle size={16} />
                {submitting ? 'Recording...' : 'Record Stock In'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Out */}
      {tab === 'out' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <ArrowUpCircle size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-100">Record Stock Out</h2>
                <p className="text-xs text-slate-400">Remove stock for dispatch, usage or write-off</p>
              </div>
            </div>

            {/* Stock level indicator */}
            {formOut.product_id && selectedStock !== null && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm font-medium border ${
                selectedStock === 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : selectedStock <= 10
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <Package size={15} />
                Current stock: <strong>{selectedStock}</strong> units available
              </div>
            )}

            {stockInsufficientOut && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm font-medium border bg-red-500/10 border-red-500/30 text-red-400">
                <AlertCircle size={15} />
                Quantity exceeds available stock ({selectedStock})!
              </div>
            )}

            <form id="form-stock-out" onSubmit={handleStockOut} className="space-y-4">
              <div>
                <label className="label">Product *</label>
                <select id="out-product" className="input" value={formOut.product_id}
                  onChange={e => setFormOut(f => ({ ...f, product_id: e.target.value }))} required>
                  <option value="">Select product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                      {p.name} ({p.sku}) — Stock: {p.quantity}{p.quantity === 0 ? ' [OUT OF STOCK]' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity *</label>
                  <input id="out-quantity" type="number" min="1"
                    max={selectedStock !== null ? selectedStock : undefined}
                    className={`input ${stockInsufficientOut ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="0"
                    value={formOut.quantity} onChange={e => setFormOut(f => ({ ...f, quantity: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Reference No.</label>
                  <input id="out-reference" type="text" className="input" placeholder="e.g. ORD-5001"
                    value={formOut.reference_no} onChange={e => setFormOut(f => ({ ...f, reference_no: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea id="out-notes" className="input min-h-[80px] resize-none"
                  placeholder="Reason for stock removal..."
                  value={formOut.notes} onChange={e => setFormOut(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button id="btn-submit-out" type="submit" className="btn-danger w-full"
                disabled={submitting || stockInsufficientOut || (formOut.product_id && selectedStock === 0)}>
                <ArrowUpCircle size={16} />
                {submitting ? 'Recording...' : 'Record Stock Out'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input id="hist-search" type="text" className="input max-w-xs" placeholder="Search product, SKU..."
              value={histSearch} onChange={e => { setHistSearch(e.target.value); setHistPage(1); }} />
            <select id="hist-type" className="input w-40" value={histType}
              onChange={e => { setHistType(e.target.value); setHistPage(1); }}>
              <option value="">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>
            <button id="hist-refresh" className="btn-secondary" onClick={loadHistory}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          <div className="table-wrapper">
            {histLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <EmptyState icon={History} title="No movements found" description="Stock movements will appear here once recorded." />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Supplier</th>
                    <th>Reference</th>
                    <th>Recorded By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(m => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(m.created_at)}</td>
                      <td className="font-medium text-slate-200">{m.product_name}</td>
                      <td className="text-xs text-slate-400 font-mono">{m.sku}</td>
                      <td>
                        <span className={m.type === 'IN' ? 'badge-green' : 'badge-red'}>{m.type}</span>
                      </td>
                      <td className={`font-bold ${m.type === 'IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.type === 'IN' ? '+' : '-'}{m.quantity}
                      </td>
                      <td className="text-slate-400 text-xs">{m.supplier_name || '—'}</td>
                      <td className="text-xs text-slate-400 font-mono">{m.reference_no || '—'}</td>
                      <td className="text-xs text-slate-400">{m.user_name || '—'}</td>
                      <td className="text-xs text-slate-400 max-w-[160px] truncate">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {histTotal > HIST_LIMIT && (
            <Pagination page={histPage} totalPages={Math.ceil(histTotal / HIST_LIMIT)} onPage={setHistPage} />
          )}
        </div>
      )}
    </div>
  );
}
