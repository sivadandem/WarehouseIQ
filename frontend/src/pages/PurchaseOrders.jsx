import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  DollarSign,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Truck,
  X,
  ChevronDown,
  PackageCheck,
} from 'lucide-react';
import { purchaseOrdersApi, suppliersApi, productsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDateTime, getPOStatusBadge } from '../utils/helpers';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import StatCard from '../components/ui/StatCard';

/* ─────────────────────────── constants ─────────────────────────── */
const STATUS_OPTIONS = ['all', 'pending', 'approved', 'delivered', 'cancelled'];

const STATUS_TRANSITIONS = {
  pending:   ['approved', 'cancelled'],
  approved:  ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const EMPTY_LINE_ITEM = { product_id: '', quantity: 1, unit_price: '' };

/* ─────────────────────────── helpers ───────────────────────────── */
function StatusBadge({ status }) {
  const { label, cls } = getPOStatusBadge(status);
  return <span className={`badge ${cls}`}>{label}</span>;
}

function StatusIcon({ status }) {
  const icons = {
    pending:   <Clock size={14} className="text-yellow-400" />,
    approved:  <CheckCircle size={14} className="text-blue-400" />,
    delivered: <Truck size={14} className="text-emerald-400" />,
    cancelled: <X size={14} className="text-slate-400" />,
  };
  return icons[status] ?? null;
}

/* ═══════════════════════════════════════════════════════════════════
   CREATE PO MODAL
═══════════════════════════════════════════════════════════════════ */
function CreatePOModal({ isOpen, onClose, suppliers, products, onCreated }) {
  const [supplierId, setSupplierId]   = useState('');
  const [notes, setNotes]             = useState('');
  const [items, setItems]             = useState([{ ...EMPTY_LINE_ITEM }]);
  const [saving, setSaving]           = useState(false);

  // reset on open
  useEffect(() => {
    if (isOpen) {
      setSupplierId('');
      setNotes('');
      setItems([{ ...EMPTY_LINE_ITEM }]);
    }
  }, [isOpen]);

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_LINE_ITEM }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const runningTotal = items.reduce((acc, it) => {
    const qty   = parseFloat(it.quantity)   || 0;
    const price = parseFloat(it.unit_price) || 0;
    return acc + qty * price;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) { toast.error('Please select a supplier.'); return; }

    const validItems = items.filter(it => it.product_id && it.quantity > 0 && it.unit_price !== '');
    if (validItems.length === 0) {
      toast.error('Add at least one complete line item.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplier_id: supplierId,
        notes,
        items: validItems.map(it => ({
          product_id: it.product_id,
          quantity:   parseFloat(it.quantity),
          unit_price: parseFloat(it.unit_price),
        })),
      };
      await purchaseOrdersApi.create(payload);
      toast.success('Purchase order created!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to create purchase order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Purchase Order" size="xl">
      <form id="create-po-form" onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Supplier */}
        <div>
          <label id="po-supplier-label" htmlFor="po-supplier-select" className="label">
            Supplier <span className="text-red-400">*</span>
          </label>
          <select
            id="po-supplier-select"
            className="input"
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
            required
          >
            <option value="">— Select supplier —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label id="po-notes-label" htmlFor="po-notes-textarea" className="label">Notes</label>
          <textarea
            id="po-notes-textarea"
            className="input min-h-[72px] resize-y"
            placeholder="Optional notes or instructions…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">Line Items</span>
            <button
              id="po-add-item-btn"
              type="button"
              onClick={addItem}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5"
            >
              <Plus size={13} /> Add Item
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {/* header */}
            <div className="grid grid-cols-[1fr_90px_110px_36px] gap-2 px-1">
              <span className="text-xs text-slate-500 font-medium">Product</span>
              <span className="text-xs text-slate-500 font-medium">Qty</span>
              <span className="text-xs text-slate-500 font-medium">Unit Price</span>
              <span />
            </div>

            {items.map((item, idx) => (
              <div
                key={idx}
                id={`po-line-item-${idx}`}
                className="grid grid-cols-[1fr_90px_110px_36px] gap-2 items-center bg-slate-800/60 rounded-lg p-2"
              >
                {/* Product */}
                <select
                  id={`po-item-product-${idx}`}
                  className="input py-1.5 text-sm"
                  value={item.product_id}
                  onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                >
                  <option value="">— Product —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Quantity */}
                <input
                  id={`po-item-qty-${idx}`}
                  type="number"
                  min="1"
                  className="input py-1.5 text-sm"
                  placeholder="1"
                  value={item.quantity}
                  onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                />

                {/* Unit Price */}
                <input
                  id={`po-item-price-${idx}`}
                  type="number"
                  min="0"
                  step="0.01"
                  className="input py-1.5 text-sm"
                  placeholder="0.00"
                  value={item.unit_price}
                  onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                />

                {/* Remove */}
                <button
                  id={`po-item-remove-${idx}`}
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove item"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Running total */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-700">
            <span className="text-sm text-slate-400">Order Total:</span>
            <span className="text-base font-bold text-slate-100">{formatCurrency(runningTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
          <button id="po-cancel-btn" type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button id="po-submit-btn" type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
            ) : (
              <><ShoppingCart size={15} /> Create Order</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VIEW DETAILS MODAL
═══════════════════════════════════════════════════════════════════ */
function ViewPOModal({ isOpen, onClose, order }) {
  if (!order) return null;

  const totalAmount = order.total_amount
    ?? order.items?.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0)
    ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`PO #${order.order_number ?? order.id}`} size="lg">
      <div className="flex flex-col gap-5">

        {/* Header info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/60 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Supplier</span>
            <span className="text-sm font-semibold text-slate-100">
              {order.supplier?.name ?? order.supplier_name ?? '—'}
            </span>
            {order.supplier?.email && (
              <span className="text-xs text-slate-400">{order.supplier.email}</span>
            )}
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusIcon status={order.status} />
              <StatusBadge status={order.status} />
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Created</span>
            <span className="text-sm text-slate-200">{formatDateTime(order.created_at)}</span>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Total Value</span>
            <span className="text-sm font-bold text-slate-100">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-slate-800/40 rounded-xl px-4 py-3">
            <span className="text-xs text-slate-500 uppercase tracking-wide block mb-1">Notes</span>
            <p className="text-sm text-slate-300">{order.notes}</p>
          </div>
        )}

        {/* Items table */}
        {order.items?.length > 0 && (
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
              Line Items ({order.items.length})
            </span>
            <div className="table-wrapper rounded-xl">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx} id={`view-item-${idx}`}>
                      <td className="text-slate-200">
                        {it.product?.name ?? it.product_name ?? `Product #${it.product_id}`}
                      </td>
                      <td className="text-right text-slate-300">{it.quantity}</td>
                      <td className="text-right text-slate-300">{formatCurrency(it.unit_price)}</td>
                      <td className="text-right font-medium text-slate-100">
                        {formatCurrency(it.quantity * it.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right font-semibold text-slate-300 py-2">
                      Total
                    </td>
                    <td className="text-right font-bold text-slate-100 py-2">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button id="view-po-close-btn" onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UPDATE STATUS MODAL
═══════════════════════════════════════════════════════════════════ */
function UpdateStatusModal({ isOpen, onClose, order, onUpdated }) {
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving]       = useState(false);

  const allowedTransitions = order ? STATUS_TRANSITIONS[order.status] ?? [] : [];

  useEffect(() => {
    if (isOpen && allowedTransitions.length > 0) {
      setNewStatus(allowedTransitions[0]);
    } else {
      setNewStatus('');
    }
  }, [isOpen, order]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus) return;
    setSaving(true);
    try {
      await purchaseOrdersApi.updateStatus(order.id, newStatus);
      toast.success(`Order status updated to "${newStatus}".`);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const statusLabels = {
    approved:  'Approved',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Order Status" size="sm">
      {allowedTransitions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-slate-400 text-sm">
            This order cannot be transitioned to another status.
          </p>
          <button id="update-status-close-btn" onClick={onClose} className="btn-secondary mt-4">Close</button>
        </div>
      ) : (
        <form id="update-status-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <p className="text-sm text-slate-400 mb-3">
              Current status: <StatusBadge status={order?.status} />
            </p>
            <label id="new-status-label" htmlFor="new-status-select" className="label">
              New Status
            </label>
            <div className="relative">
              <select
                id="new-status-select"
                className="input pr-9 appearance-none"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              >
                {allowedTransitions.map(s => (
                  <option key={s} value={s}>{statusLabels[s] ?? s}</option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <button id="update-status-cancel-btn" type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
              Cancel
            </button>
            <button id="update-status-submit-btn" type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              {saving ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function PurchaseOrders() {
  const { isManager, isAdmin } = useAuth();

  // data
  const [orders,    setOrders]    = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // filter
  const [statusFilter, setStatusFilter] = useState('all');

  // modals
  const [showCreate,       setShowCreate]       = useState(false);
  const [viewOrder,        setViewOrder]        = useState(null);
  const [updateStatusOrder, setUpdateStatusOrder] = useState(null);
  const [deleteOrder,      setDeleteOrder]      = useState(null);
  const [deleting,         setDeleting]         = useState(false);

  /* ── fetch ────────────────────────────────────────────────────── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await purchaseOrdersApi.getAll(params);
      setOrders(res.data?.data ?? res.data ?? []);
    } catch (err) {
      setError('Failed to load purchase orders.');
      toast.error('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await suppliersApi.getAll();
      setSuppliers(res.data?.data ?? res.data ?? []);
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productsApi.getAll();
      setProducts(res.data?.data ?? res.data ?? []);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [fetchSuppliers, fetchProducts]);

  /* ── delete ───────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteOrder) return;
    setDeleting(true);
    try {
      await purchaseOrdersApi.delete(deleteOrder.id);
      toast.success(`Order #${deleteOrder.order_number ?? deleteOrder.id} deleted.`);
      setDeleteOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete order.');
    } finally {
      setDeleting(false);
    }
  };

  /* ── stats ────────────────────────────────────────────────────── */
  const stats = {
    total:    orders.length,
    pending:  orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    value:    orders.reduce((acc, o) => {
      const amt = o.total_amount
        ?? o.items?.reduce((s, it) => s + (it.quantity * it.unit_price), 0)
        ?? 0;
      return acc + Number(amt);
    }, 0),
  };

  /* ── filtered list ────────────────────────────────────────────── */
  const filtered = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage supplier purchase orders and track deliveries.
          </p>
        </div>
        {isManager && (
          <button
            id="po-open-create-btn"
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} /> Create PO
          </button>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.total}
          color="brand"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color="yellow"
        />
        <StatCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={formatCurrency(stats.value)}
          color="green"
        />
      </div>

      {/* ── Filter Bar ── */}
      <div className="card flex items-center gap-2 flex-wrap py-3 px-4">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-medium mr-1">Status:</span>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            id={`po-filter-${s}`}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
        {statusFilter !== 'all' && (
          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button id="po-retry-btn" onClick={fetchOrders} className="btn-secondary text-sm">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="No purchase orders found"
            description={
              statusFilter === 'all'
                ? 'Create your first purchase order to get started.'
                : `No ${statusFilter} orders at this time.`
            }
            action={
              isManager && statusFilter === 'all' ? (
                <button
                  id="po-empty-create-btn"
                  className="btn-primary flex items-center gap-2 mt-2"
                  onClick={() => setShowCreate(true)}
                >
                  <Plus size={15} /> Create PO
                </button>
              ) : null
            }
          />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th className="text-center">Items</th>
                  <th className="text-right">Total Amount</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const totalAmt = order.total_amount
                    ?? order.items?.reduce((s, it) => s + (it.quantity * it.unit_price), 0)
                    ?? 0;
                  const itemCount = order.items_count ?? order.items?.length ?? '—';
                  const canDelete = isAdmin && order.status === 'pending';
                  const canUpdateStatus =
                    isManager && STATUS_TRANSITIONS[order.status]?.length > 0;

                  return (
                    <tr key={order.id} id={`po-row-${order.id}`}>
                      {/* Order # */}
                      <td>
                        <span className="font-mono text-sm font-semibold text-slate-200">
                          #{order.order_number ?? String(order.id).padStart(4, '0')}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td>
                        <span className="text-slate-200">
                          {order.supplier?.name ?? order.supplier_name ?? '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={order.status} />
                          <StatusBadge status={order.status} />
                        </div>
                      </td>

                      {/* Items count */}
                      <td className="text-center">
                        <span className="text-slate-300">{itemCount}</span>
                      </td>

                      {/* Total Amount */}
                      <td className="text-right font-semibold text-slate-100">
                        {formatCurrency(totalAmt)}
                      </td>

                      {/* Created */}
                      <td className="text-slate-400 text-sm whitespace-nowrap">
                        {formatDateTime(order.created_at)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View */}
                          <button
                            id={`po-view-btn-${order.id}`}
                            title="View details"
                            onClick={() => setViewOrder(order)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Update Status */}
                          {canUpdateStatus && (
                            <button
                              id={`po-status-btn-${order.id}`}
                              title="Update status"
                              onClick={() => setUpdateStatusOrder(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              id={`po-delete-btn-${order.id}`}
                              title="Delete order"
                              onClick={() => setDeleteOrder(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Modals ═══ */}

      {/* Create */}
      <CreatePOModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        suppliers={suppliers}
        products={products}
        onCreated={fetchOrders}
      />

      {/* View Details */}
      <ViewPOModal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        order={viewOrder}
      />

      {/* Update Status */}
      <UpdateStatusModal
        isOpen={!!updateStatusOrder}
        onClose={() => setUpdateStatusOrder(null)}
        order={updateStatusOrder}
        onUpdated={fetchOrders}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteOrder}
        onClose={() => setDeleteOrder(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Purchase Order"
        message={
          deleteOrder
            ? `Delete order #${deleteOrder.order_number ?? deleteOrder.id}? This action cannot be undone.`
            : ''
        }
      />
    </div>
  );
}
