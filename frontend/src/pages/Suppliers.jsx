import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { suppliersApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import StatCard from '../components/ui/StatCard';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  is_active: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Supplier name is required.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid email address.';
  return errors;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Single form field row used inside the Add/Edit modal */
function FormField({ id, label, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Toggle switch for is_active */
function ActiveToggle({ id, checked, onChange }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
        checked ? 'bg-emerald-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Suppliers() {
  const { isManager } = useAuth();

  // ── Data state ──
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Search & pagination ──
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ── Modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Delete state ──
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suppliersApi.getAll();
      setSuppliers(res.data.data ?? res.data ?? []);
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to load suppliers.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Reset to page 1 whenever search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.is_active).length;
    return { total, active };
  }, [suppliers]);

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (supplier) => {
    setEditTarget(supplier);
    setForm({
      name: supplier.name ?? '',
      contact_person: supplier.contact_person ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
      is_active: supplier.is_active ?? true,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ── Save (Create / Update) ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        is_active: form.is_active,
      };

      if (editTarget) {
        const res = await suppliersApi.update(editTarget.id, payload);
        const updated = res.data.data ?? res.data;
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editTarget.id ? { ...s, ...updated } : s))
        );
        toast.success('Supplier updated successfully.');
      } else {
        const res = await suppliersApi.create(payload);
        const created = res.data.data ?? res.data;
        setSuppliers((prev) => [created, ...prev]);
        toast.success('Supplier added successfully.');
      }
      closeModal();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to save supplier.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const openDelete = (supplier) => {
    setDeleteTarget(supplier);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await suppliersApi.delete(deleteTarget.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to delete supplier.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your supplier directory and contact information.
          </p>
        </div>
        {isManager && (
          <button
            id="suppliers-add-btn"
            className="btn-primary flex items-center gap-2"
            onClick={openAdd}
          >
            <Plus size={16} />
            Add Supplier
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Total Suppliers"
          value={stats.total}
          color="brand"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Suppliers"
          value={stats.active}
          sub={`${stats.total - stats.active} inactive`}
          color="green"
        />
      </div>

      {/* ── Search bar ── */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            id="suppliers-search"
            type="text"
            placeholder="Search by name, contact, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 px-5 py-3 bg-red-500/10 border-b border-red-500/20">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button
              id="suppliers-retry-btn"
              className="ml-auto text-xs text-red-400 underline hover:text-red-300"
              onClick={fetchSuppliers}
            >
              Retry
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={search ? 'No suppliers match your search' : 'No suppliers yet'}
            description={
              search
                ? 'Try a different name, contact or email.'
                : isManager
                ? 'Add your first supplier to get started.'
                : 'No suppliers have been added yet.'
            }
            action={
              isManager && !search ? (
                <button
                  id="suppliers-empty-add-btn"
                  className="btn-primary flex items-center gap-2 mt-2"
                  onClick={openAdd}
                >
                  <Plus size={15} />
                  Add Supplier
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Status</th>
                    {isManager && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((supplier) => (
                    <tr key={supplier.id} id={`supplier-row-${supplier.id}`}>
                      {/* Name */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <Truck size={14} className="text-brand-400" />
                          </div>
                          <span className="font-medium text-slate-200 whitespace-nowrap">
                            {supplier.name}
                          </span>
                        </div>
                      </td>

                      {/* Contact person */}
                      <td>
                        {supplier.contact_person ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <User size={13} className="text-slate-500 flex-shrink-0" />
                            <span className="whitespace-nowrap">{supplier.contact_person}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td>
                        {supplier.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone size={13} className="text-slate-500 flex-shrink-0" />
                            <span className="whitespace-nowrap">{supplier.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td>
                        {supplier.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-500 flex-shrink-0" />
                            <a
                              href={`mailto:${supplier.email}`}
                              className="text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {supplier.email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td>
                        {supplier.address ? (
                          <div className="flex items-start gap-1.5 text-slate-400 max-w-[200px]">
                            <MapPin
                              size={13}
                              className="text-slate-500 flex-shrink-0 mt-0.5"
                            />
                            <span className="leading-snug line-clamp-2">
                              {supplier.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        {supplier.is_active ? (
                          <span className="badge-green flex items-center gap-1 w-fit">
                            <CheckCircle2 size={11} />
                            Active
                          </span>
                        ) : (
                          <span className="badge-gray flex items-center gap-1 w-fit">
                            <XCircle size={11} />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      {isManager && (
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              id={`suppliers-edit-btn-${supplier.id}`}
                              title="Edit supplier"
                              className="btn-ghost p-2 text-slate-400 hover:text-slate-200"
                              onClick={() => openEdit(supplier)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              id={`suppliers-delete-btn-${supplier.id}`}
                              title="Delete supplier"
                              className="btn-ghost p-2 text-slate-400 hover:text-red-400"
                              onClick={() => openDelete(supplier)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination + row count */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                Showing{' '}
                <span className="text-slate-300 font-medium">
                  {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)}
                </span>{' '}
                of{' '}
                <span className="text-slate-300 font-medium">{filtered.length}</span>{' '}
                suppliers
              </p>
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
      >
        <form id="supplier-form" onSubmit={handleSave} noValidate>
          <div className="space-y-4">
            {/* Name */}
            <FormField
              id="supplier-name"
              label={
                <>
                  Name <span className="text-red-400">*</span>
                </>
              }
              error={formErrors.name}
            >
              <input
                id="supplier-name"
                type="text"
                className={`input w-full ${formErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="e.g. Acme Supplies Ltd."
                value={form.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                autoFocus
              />
            </FormField>

            {/* Contact person */}
            <FormField id="supplier-contact-person" label="Contact Person">
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  id="supplier-contact-person"
                  type="text"
                  className="input w-full pl-9"
                  placeholder="e.g. Jane Doe"
                  value={form.contact_person}
                  onChange={(e) => handleFieldChange('contact_person', e.target.value)}
                />
              </div>
            </FormField>

            {/* Phone + Email side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="supplier-phone" label="Phone">
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    id="supplier-phone"
                    type="tel"
                    className="input w-full pl-9"
                    placeholder="+1 555 000 0000"
                    value={form.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                  />
                </div>
              </FormField>

              <FormField id="supplier-email" label="Email" error={formErrors.email}>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  />
                  <input
                    id="supplier-email"
                    type="email"
                    className={`input w-full pl-9 ${
                      formErrors.email ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    placeholder="contact@supplier.com"
                    value={form.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                </div>
              </FormField>
            </div>

            {/* Address */}
            <FormField id="supplier-address" label="Address">
              <div className="relative">
                <MapPin
                  size={14}
                  className="absolute left-3 top-3.5 text-slate-500 pointer-events-none"
                />
                <textarea
                  id="supplier-address"
                  rows={3}
                  className="input w-full pl-9 resize-none"
                  placeholder="Street, City, Country…"
                  value={form.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                />
              </div>
            </FormField>

            {/* Is Active toggle */}
            <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Active Status</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inactive suppliers won't appear in purchase order suggestions.
                </p>
              </div>
              <ActiveToggle
                id="supplier-is-active"
                checked={form.is_active}
                onChange={(val) => handleFieldChange('is_active', val)}
              />
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 pt-2">
              <button
                id="supplier-form-cancel"
                type="button"
                className="btn-secondary flex-1"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                id="supplier-form-submit"
                type="submit"
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {editTarget ? 'Saving…' : 'Adding…'}
                  </>
                ) : editTarget ? (
                  'Save Changes'
                ) : (
                  'Add Supplier'
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={closeDelete}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Supplier"
        message={
          deleteTarget ? (
            <span>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-200">{deleteTarget.name}</span>?{' '}
              <br />
              <span className="text-yellow-400 inline-flex items-center gap-1 mt-2 text-xs">
                <AlertTriangle size={12} className="flex-shrink-0" />
                Products linked to this supplier will lose their supplier reference.
              </span>
            </span>
          ) : null
        }
      />
    </div>
  );
}
