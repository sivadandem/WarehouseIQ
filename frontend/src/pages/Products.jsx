import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Package,
  PackageX,
  AlertTriangle,
  DollarSign,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  Tag,
  Barcode,
  Warehouse,
  Truck,
} from 'lucide-react';

import { productsApi, warehousesApi, suppliersApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getStockStatus } from '../utils/helpers';

import LoadingSpinner, { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import StatCard from '../components/ui/StatCard';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Office',
  'Safety',
  'Equipment',
  'Supplies',
  'Other',
];

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  name: '',
  sku: '',
  category: '',
  description: '',
  price: '',
  min_stock_threshold: '',
  warehouse_id: '',
  supplier_id: '',
};

// ─── Products Page ─────────────────────────────────────────────────────────────

export default function Products() {
  const { isManager } = useAuth();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null); // null = add mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, whRes, supRes] = await Promise.all([
        productsApi.getAll(),
        warehousesApi.getAll(),
        suppliersApi.getAll(),
      ]);
      setProducts(prodRes.data.data ?? prodRes.data ?? []);
      setWarehouses(whRes.data.data ?? whRes.data ?? []);
      setSuppliers(supRes.data.data ?? supRes.data ?? []);
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to load products.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Helper lookups ──────────────────────────────────────────────────────────
  const warehouseMap = useMemo(() => {
    const map = {};
    warehouses.forEach((w) => { map[w.id] = w.name; });
    return map;
  }, [warehouses]);

  const supplierMap = useMemo(() => {
    const map = {};
    suppliers.forEach((s) => { map[s.id] = s.name; });
    return map;
  }, [suppliers]);

  // ── Filtered + paginated products ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);
      const matchCat = !categoryFilter || p.category === categoryFilter;
      const matchWh =
        !warehouseFilter || String(p.warehouse_id) === String(warehouseFilter);
      return matchSearch && matchCat && matchWh;
    });
  }, [products, search, categoryFilter, warehouseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, categoryFilter, warehouseFilter]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalValue = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach((p) => {
      const qty = p.quantity ?? p.stock_quantity ?? 0;
      const min = p.min_stock_threshold ?? 0;
      totalValue += (p.price ?? 0) * qty;
      if (qty === 0) outOfStock++;
      else if (qty <= min) lowStock++;
    });

    return { total: products.length, lowStock, outOfStock, totalValue };
  }, [products]);

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name ?? '',
      sku: product.sku ?? '',
      category: product.category ?? '',
      description: product.description ?? '',
      price: product.price != null ? String(product.price) : '',
      min_stock_threshold:
        product.min_stock_threshold != null
          ? String(product.min_stock_threshold)
          : '',
      warehouse_id: product.warehouse_id != null ? String(product.warehouse_id) : '',
      supplier_id: product.supplier_id != null ? String(product.supplier_id) : '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!editProduct && !form.sku.trim()) errs.sku = 'SKU is required.';
    if (!form.category) errs.category = 'Category is required.';
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0)
      errs.price = 'Valid price is required.';
    if (
      form.min_stock_threshold !== '' &&
      (isNaN(Number(form.min_stock_threshold)) ||
        Number(form.min_stock_threshold) < 0)
    )
      errs.min_stock_threshold = 'Must be a non-negative number.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        price: Number(form.price),
        min_stock_threshold: form.min_stock_threshold !== ''
          ? Number(form.min_stock_threshold)
          : 0,
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      };

      if (!editProduct) {
        payload.sku = form.sku.trim();
        await productsApi.create(payload);
        toast.success('Product created successfully.');
      } else {
        await productsApi.update(editProduct.id, payload);
        toast.success('Product updated successfully.');
      }

      closeForm();
      fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to save product.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete helpers ───────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productsApi.delete(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to delete product.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;

  if (error && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <PackageX size={40} className="text-red-400" />
        <p className="text-slate-300 font-semibold">{error}</p>
        <button id="products-retry-btn" className="btn-secondary" onClick={fetchAll}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage your warehouse product catalogue
          </p>
        </div>
        {isManager && (
          <button
            id="products-add-btn"
            className="btn-primary flex items-center gap-2"
            onClick={openAdd}
          >
            <Plus size={16} />
            Add Product
          </button>
        )}
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats.total}
          color="brand"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={stats.lowStock}
          color="yellow"
        />
        <StatCard
          icon={PackageX}
          label="Out of Stock"
          value={stats.outOfStock}
          color="red"
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={formatCurrency(stats.totalValue)}
          color="green"
        />
      </div>

      {/* ── Filters Bar ──────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              id="products-search-input"
              type="text"
              className="input pl-9 w-full"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                id="products-search-clear-btn"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="relative">
            <Tag
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <select
              id="products-category-filter"
              className="input pl-9 pr-8 appearance-none min-w-[160px]"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>

          {/* Warehouse filter */}
          <div className="relative">
            <Warehouse
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <select
              id="products-warehouse-filter"
              className="input pl-9 pr-8 appearance-none min-w-[160px]"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={String(wh.id)}>{wh.name}</option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Active filter summary */}
        {(search || categoryFilter || warehouseFilter) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">
              Showing {filtered.length} of {products.length} products
            </span>
            <button
              id="products-clear-filters-btn"
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setWarehouseFilter('');
              }}
              className="text-xs text-brand-400 hover:text-brand-300 ml-auto transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Products Table ────────────────────────────────────────────────────── */}
      <div className="card p-0">
        {paginated.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={
              search || categoryFilter || warehouseFilter
                ? 'No products match your current filters. Try adjusting or clearing them.'
                : 'Get started by adding your first product to the catalogue.'
            }
            action={
              isManager ? (
                <button
                  id="products-empty-add-btn"
                  className="btn-primary flex items-center gap-2 mt-2"
                  onClick={openAdd}
                >
                  <Plus size={15} />
                  Add Product
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Warehouse</th>
                    <th>Supplier</th>
                    <th>Stock</th>
                    <th>Min Threshold</th>
                    <th>Price</th>
                    {isManager && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((product) => {
                    const qty = product.quantity ?? product.stock_quantity ?? 0;
                    const min = product.min_stock_threshold ?? 0;
                    const { label: stockLabel, cls: stockCls } = getStockStatus(qty, min);

                    return (
                      <tr key={product.id} className="group">
                        {/* SKU */}
                        <td>
                          <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {product.sku ?? '—'}
                          </span>
                        </td>

                        {/* Name */}
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                              <Package size={13} className="text-slate-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-200 leading-tight">
                                {product.name}
                              </p>
                              {product.description && (
                                <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="badge-blue text-xs">{product.category ?? '—'}</span>
                        </td>

                        {/* Warehouse */}
                        <td className="text-slate-400 text-sm">
                          {warehouseMap[product.warehouse_id] ?? (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="text-slate-400 text-sm">
                          {supplierMap[product.supplier_id] ?? (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Stock badge */}
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <span className={`${stockCls} text-xs inline-block w-fit`}>
                              {stockLabel}
                            </span>
                            <span className="text-xs text-slate-500">{qty} units</span>
                          </div>
                        </td>

                        {/* Min Threshold */}
                        <td className="text-slate-400 text-sm">{min}</td>

                        {/* Price */}
                        <td className="font-medium text-slate-200 tabular-nums">
                          {formatCurrency(product.price)}
                        </td>

                        {/* Actions */}
                        {isManager && (
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                id={`products-edit-btn-${product.id}`}
                                onClick={() => openEdit(product)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                                title="Edit product"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                id={`products-delete-btn-${product.id}`}
                                onClick={() => setDeleteTarget(product)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                title="Delete product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 pb-4">
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
              <p className="text-xs text-slate-600 text-center mt-2">
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} products
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editProduct ? `Edit Product — ${editProduct.name}` : 'Add New Product'}
        size="lg"
      >
        <form id="products-form" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Name */}
            <div className="sm:col-span-2">
              <label htmlFor="form-name" className="label">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                id="form-name"
                name="name"
                type="text"
                className={`input w-full ${formErrors.name ? 'border-red-500' : ''}`}
                placeholder="e.g. Ergonomic Office Chair"
                value={form.name}
                onChange={handleFormChange}
              />
              {formErrors.name && (
                <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* SKU (readonly on edit) */}
            <div>
              <label htmlFor="form-sku" className="label">
                SKU {!editProduct && <span className="text-red-400">*</span>}
              </label>
              <div className="relative">
                <Barcode
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  id="form-sku"
                  name="sku"
                  type="text"
                  className={`input w-full pl-9 ${
                    editProduct ? 'opacity-60 cursor-not-allowed' : ''
                  } ${formErrors.sku ? 'border-red-500' : ''}`}
                  placeholder="e.g. CHAIR-001"
                  value={form.sku}
                  onChange={handleFormChange}
                  readOnly={!!editProduct}
                />
              </div>
              {formErrors.sku && (
                <p className="text-xs text-red-400 mt-1">{formErrors.sku}</p>
              )}
              {editProduct && (
                <p className="text-xs text-slate-600 mt-1">SKU cannot be changed after creation.</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="form-category" className="label">
                Category <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Tag
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <select
                  id="form-category"
                  name="category"
                  className={`input w-full pl-9 pr-8 appearance-none ${
                    formErrors.category ? 'border-red-500' : ''
                  }`}
                  value={form.category}
                  onChange={handleFormChange}
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
              </div>
              {formErrors.category && (
                <p className="text-xs text-red-400 mt-1">{formErrors.category}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label htmlFor="form-price" className="label">
                Price (USD) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <DollarSign
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  id="form-price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`input w-full pl-9 ${formErrors.price ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                  value={form.price}
                  onChange={handleFormChange}
                />
              </div>
              {formErrors.price && (
                <p className="text-xs text-red-400 mt-1">{formErrors.price}</p>
              )}
            </div>

            {/* Min Stock Threshold */}
            <div>
              <label htmlFor="form-min-threshold" className="label">
                Min Stock Threshold
              </label>
              <input
                id="form-min-threshold"
                name="min_stock_threshold"
                type="number"
                min="0"
                step="1"
                className={`input w-full ${
                  formErrors.min_stock_threshold ? 'border-red-500' : ''
                }`}
                placeholder="e.g. 10"
                value={form.min_stock_threshold}
                onChange={handleFormChange}
              />
              {formErrors.min_stock_threshold && (
                <p className="text-xs text-red-400 mt-1">
                  {formErrors.min_stock_threshold}
                </p>
              )}
              <p className="text-xs text-slate-600 mt-1">
                Alert triggers when stock falls at or below this value.
              </p>
            </div>

            {/* Warehouse */}
            <div>
              <label htmlFor="form-warehouse" className="label">
                Warehouse
              </label>
              <div className="relative">
                <Warehouse
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <select
                  id="form-warehouse"
                  name="warehouse_id"
                  className="input w-full pl-9 pr-8 appearance-none"
                  value={form.warehouse_id}
                  onChange={handleFormChange}
                >
                  <option value="">No warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={String(wh.id)}>{wh.name}</option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
              </div>
            </div>

            {/* Supplier */}
            <div>
              <label htmlFor="form-supplier" className="label">
                Supplier
              </label>
              <div className="relative">
                <Truck
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <select
                  id="form-supplier"
                  name="supplier_id"
                  className="input w-full pl-9 pr-8 appearance-none"
                  value={form.supplier_id}
                  onChange={handleFormChange}
                >
                  <option value="">No supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label htmlFor="form-description" className="label">
                Description
              </label>
              <textarea
                id="form-description"
                name="description"
                rows={3}
                className="input w-full resize-none"
                placeholder="Optional product notes or description…"
                value={form.description}
                onChange={handleFormChange}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
            <button
              id="products-form-cancel-btn"
              type="button"
              className="btn-secondary flex-1"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              id="products-form-submit-btn"
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  {editProduct ? 'Saving…' : 'Creating…'}
                </>
              ) : (
                <>
                  {editProduct ? <Edit2 size={14} /> : <Plus size={14} />}
                  {editProduct ? 'Save Changes' : 'Create Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.sku})? This action cannot be undone.`
            : undefined
        }
        loading={deleting}
      />
    </div>
  );
}
