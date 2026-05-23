import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Warehouse,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Package,
  LayoutGrid,
  CheckCircle,
} from 'lucide-react';
import { warehousesApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import StatCard from '../components/ui/StatCard';

// ─── Capacity Bar ─────────────────────────────────────────────────────────────
function CapacityBar({ used, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  let fillColor;
  let labelColor;
  if (pct >= 90) {
    fillColor = 'bg-red-500';
    labelColor = 'text-red-400';
  } else if (pct >= 70) {
    fillColor = 'bg-yellow-400';
    labelColor = 'text-yellow-400';
  } else {
    fillColor = 'bg-emerald-500';
    labelColor = 'text-emerald-400';
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">Capacity Usage</span>
        <span className={`font-bold ${labelColor}`}>{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Warehouse Card ───────────────────────────────────────────────────────────
function WarehouseCard({ warehouse, isAdmin, onEdit, onDelete }) {
  const { name, location, capacity = 0, available_space = 0, description } = warehouse;
  const used = capacity - available_space;
  const usedSafe = Math.max(0, used);

  return (
    <div className="card flex flex-col gap-4 hover:border-slate-600 transition-all duration-200 border border-slate-800">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Warehouse size={20} className="text-brand-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-slate-100 font-bold text-lg leading-tight truncate">{name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin size={13} className="text-slate-500 flex-shrink-0" />
              <span className="text-slate-400 text-sm truncate">{location}</span>
            </div>
          </div>
        </div>

        {/* Admin action buttons */}
        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              id={`wh-edit-${warehouse.id}`}
              onClick={() => onEdit(warehouse)}
              className="btn-ghost p-2 rounded-lg"
              title="Edit warehouse"
            >
              <Pencil size={15} />
            </button>
            <button
              id={`wh-delete-${warehouse.id}`}
              onClick={() => onDelete(warehouse)}
              className="btn-ghost p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title="Delete warehouse"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{description}</p>
      )}

      {/* Capacity Bar */}
      <CapacityBar used={usedSafe} total={capacity} />

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
        <div className="text-center">
          <p className="text-slate-100 font-bold text-sm">
            {capacity.toLocaleString()}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">Total Cap.</p>
        </div>
        <div className="text-center border-x border-slate-800">
          <p className="text-emerald-400 font-bold text-sm">
            {available_space.toLocaleString()}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">Available</p>
        </div>
        <div className="text-center">
          <p className="text-orange-400 font-bold text-sm">
            {usedSafe.toLocaleString()}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">Used</p>
        </div>
      </div>
    </div>
  );
}

// ─── Default form state ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  location: '',
  capacity: '',
  available_space: '',
  description: '',
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Warehouses() {
  const { isAdmin } = useAuth();

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create mode
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehousesApi.getAll();
      setWarehouses(res.data.data ?? res.data ?? []);
    } catch (err) {
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity ?? 0), 0);
  const totalAvailable = warehouses.reduce((s, w) => s + (w.available_space ?? 0), 0);
  const totalUsed = totalCapacity - totalAvailable;

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (wh) => {
    setEditTarget(wh);
    setForm({
      name: wh.name ?? '',
      location: wh.location ?? '',
      capacity: wh.capacity ?? '',
      available_space: wh.available_space ?? '',
      description: wh.description ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  // ── Form change ────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Warehouse name is required.';
    if (!form.location.trim()) errs.location = 'Location is required.';

    const cap = Number(form.capacity);
    const avail = Number(form.available_space);

    if (form.capacity !== '' && (isNaN(cap) || cap < 0)) {
      errs.capacity = 'Capacity must be a non-negative number.';
    }
    if (form.available_space !== '' && (isNaN(avail) || avail < 0)) {
      errs.available_space = 'Available space must be a non-negative number.';
    }
    if (form.capacity !== '' && form.available_space !== '' && !errs.capacity && !errs.available_space) {
      if (avail > cap) {
        errs.available_space = 'Available space cannot exceed total capacity.';
      }
    }

    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim(),
        capacity: form.capacity !== '' ? Number(form.capacity) : 0,
        available_space: form.available_space !== '' ? Number(form.available_space) : 0,
        description: form.description.trim(),
      };

      if (editTarget) {
        await warehousesApi.update(editTarget.id, payload);
        toast.success('Warehouse updated successfully');
      } else {
        await warehousesApi.create(payload);
        toast.success('Warehouse created successfully');
      }

      closeModal();
      fetchWarehouses();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to save warehouse';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const openDelete = (wh) => setDeleteTarget(wh);
  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await warehousesApi.delete(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchWarehouses();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Failed to delete warehouse';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your warehouse locations and capacity
          </p>
        </div>
        {isAdmin && (
          <button
            id="wh-add-btn"
            onClick={openCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Warehouse
          </button>
        )}
      </div>

      {/* Summary Stats */}
      {!loading && warehouses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={LayoutGrid}
            label="Total Warehouses"
            value={warehouses.length}
            color="brand"
          />
          <StatCard
            icon={Package}
            label="Total Capacity"
            value={totalCapacity.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="Total Available Space"
            value={totalAvailable.toLocaleString()}
            sub={`${totalUsed.toLocaleString()} units in use`}
            color="green"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : warehouses.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="No Warehouses Found"
          description={
            isAdmin
              ? 'Add your first warehouse to start managing locations and capacity.'
              : 'No warehouses have been set up yet.'
          }
          action={
            isAdmin ? (
              <button id="wh-empty-add-btn" onClick={openCreate} className="btn-primary flex items-center gap-2 mt-2">
                <Plus size={15} /> Add Warehouse
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <WarehouseCard
              key={wh.id}
              warehouse={wh}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Warehouse' : 'Add Warehouse'}
        size="md"
      >
        <form id="wh-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name */}
          <div>
            <label htmlFor="wh-name" className="label">
              Warehouse Name <span className="text-red-400">*</span>
            </label>
            <input
              id="wh-name"
              name="name"
              type="text"
              className={`input w-full ${errors.name ? 'border-red-500 focus:ring-red-500/30' : ''}`}
              placeholder="e.g. Main Distribution Center"
              value={form.name}
              onChange={handleChange}
              disabled={saving}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="wh-location" className="label">
              Location <span className="text-red-400">*</span>
            </label>
            <input
              id="wh-location"
              name="location"
              type="text"
              className={`input w-full ${errors.location ? 'border-red-500 focus:ring-red-500/30' : ''}`}
              placeholder="e.g. Chicago, IL"
              value={form.location}
              onChange={handleChange}
              disabled={saving}
            />
            {errors.location && (
              <p className="text-red-400 text-xs mt-1">{errors.location}</p>
            )}
          </div>

          {/* Capacity + Available Space */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="wh-capacity" className="label">Total Capacity</label>
              <input
                id="wh-capacity"
                name="capacity"
                type="number"
                min="0"
                className={`input w-full ${errors.capacity ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                placeholder="e.g. 10000"
                value={form.capacity}
                onChange={handleChange}
                disabled={saving}
              />
              {errors.capacity && (
                <p className="text-red-400 text-xs mt-1">{errors.capacity}</p>
              )}
            </div>
            <div>
              <label htmlFor="wh-available" className="label">Available Space</label>
              <input
                id="wh-available"
                name="available_space"
                type="number"
                min="0"
                className={`input w-full ${errors.available_space ? 'border-red-500 focus:ring-red-500/30' : ''}`}
                placeholder="e.g. 4500"
                value={form.available_space}
                onChange={handleChange}
                disabled={saving}
              />
              {errors.available_space && (
                <p className="text-red-400 text-xs mt-1">{errors.available_space}</p>
              )}
            </div>
          </div>

          {/* Live capacity hint */}
          {form.capacity !== '' && form.available_space !== '' &&
            !errors.capacity && !errors.available_space && (
              <div className="bg-slate-800 rounded-lg p-3">
                <CapacityBar
                  used={Math.max(0, Number(form.capacity) - Number(form.available_space))}
                  total={Number(form.capacity)}
                />
              </div>
            )}

          {/* Description */}
          <div>
            <label htmlFor="wh-description" className="label">Description</label>
            <textarea
              id="wh-description"
              name="description"
              rows={3}
              className="input w-full resize-none"
              placeholder="Optional notes about this warehouse…"
              value={form.description}
              onChange={handleChange}
              disabled={saving}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              id="wh-form-cancel"
              type="button"
              onClick={closeModal}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              id="wh-form-submit"
              type="submit"
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving
                ? editTarget ? 'Saving…' : 'Creating…'
                : editTarget ? 'Save Changes' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={closeDelete}
        onConfirm={handleDelete}
        title="Delete Warehouse"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        loading={deleting}
      />
    </div>
  );
}
