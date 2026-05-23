import { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Search, RefreshCw, Pause, Play, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { logsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/helpers';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';

// ── constants ─────────────────────────────────────────────────────────────────
const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'STOCK_IN', label: 'STOCK_IN' },
  { value: 'STOCK_OUT', label: 'STOCK_OUT' },
];

const LIMIT = 20;
const REFRESH_INTERVAL_MS = 30_000;

// ── helpers ───────────────────────────────────────────────────────────────────
function actionBadge(action) {
  const map = {
    LOGIN: 'badge-blue',
    CREATE: 'badge-green',
    UPDATE: 'badge-yellow',
    DELETE: 'badge-red',
    STOCK_IN: 'badge-green',
    STOCK_OUT: 'badge-red',
  };
  return map[action] ?? 'badge-gray';
}

function prettyDetails(details) {
  if (!details) return '—';
  try {
    const parsed = typeof details === 'string' ? JSON.parse(details) : details;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(details);
  }
}

// ── DetailsCell ───────────────────────────────────────────────────────────────
function DetailsCell({ details, rowId }) {
  const [expanded, setExpanded] = useState(false);
  const pretty = prettyDetails(details);
  const truncated = pretty.length > 60 ? pretty.slice(0, 60) + '…' : pretty;
  const canExpand = pretty.length > 60;

  return (
    <div className="flex flex-col gap-1">
      <span
        id={`details-cell-${rowId}`}
        className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-all leading-relaxed"
        style={{ fontFamily: "'Fira Mono', 'Cascadia Code', 'Consolas', monospace" }}
      >
        {expanded ? pretty : truncated}
      </span>
      {canExpand && (
        <button
          id={`details-toggle-${rowId}`}
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors w-fit"
          aria-expanded={expanded}
          aria-controls={`details-cell-${rowId}`}
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> Collapse
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Expand
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── AccessDenied ──────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card flex flex-col items-center gap-4 px-12 py-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <Lock size={32} className="text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">Admin Access Required</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          You do not have permission to view audit logs. Please contact your system administrator.
        </p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Logs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [logs, setLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const searchInputRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAdmin) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const params = { page, limit: LIMIT };
        if (search.trim()) params.search = search.trim();
        if (action) params.action = action;

        const res = await logsApi.getAll(params);
        // Support various API response shapes
        const data = res?.data ?? res ?? {};
        const items =
          data.logs ?? data.items ?? data.data ?? (Array.isArray(data) ? data : []);
        const total =
          data.totalPages ?? data.total_pages ?? Math.ceil((data.total ?? data.count ?? items.length) / LIMIT);

        setLogs(items);
        setTotalPages(total || 1);
        setTotalItems(data.total ?? data.count ?? items.length);
        setLastRefreshed(new Date());
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        setError(err?.message ?? 'Failed to load audit logs. Please try again.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isAdmin, page, search, action]
  );

  // Initial + dependency-driven fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh
  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    refreshTimerRef.current = setInterval(() => {
      fetchLogs({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(refreshTimerRef.current);
  }, [isAdmin, autoRefresh, fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, action]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSearchChange = (e) => setSearch(e.target.value);
  const handleActionChange = (e) => setAction(e.target.value);
  const handleManualRefresh = () => fetchLogs();
  const toggleAutoRefresh = () => setAutoRefresh((p) => !p);
  const handlePageChange = (p) => setPage(p);

  // ── guard ──────────────────────────────────────────────────────────────────
  if (!isAdmin) return <AccessDenied />;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <ClipboardList size={22} className="text-blue-400" />
          <div>
            <h1 className="page-title">Audit Logs</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalItems > 0 ? `${totalItems.toLocaleString()} entries` : 'Full system activity trail'}
              {lastRefreshed && (
                <span className="ml-2 text-slate-600">
                  · Last refreshed {formatDateTime(lastRefreshed)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Refresh controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-auto-refresh"
            type="button"
            onClick={toggleAutoRefresh}
            className={`btn-ghost flex items-center gap-2 text-sm px-3 py-1.5 ${
              autoRefresh ? 'text-green-400 hover:text-green-300' : 'text-slate-400 hover:text-slate-300'
            }`}
            title={autoRefresh ? 'Pause auto-refresh (30s)' : 'Resume auto-refresh (30s)'}
          >
            {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
            <span className="hidden sm:inline">{autoRefresh ? 'Auto (30s)' : 'Paused'}</span>
          </button>
          <button
            id="btn-manual-refresh"
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Refresh now"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              id="logs-search-input"
              ref={searchInputRef}
              type="text"
              className="input pl-9 w-full text-sm"
              placeholder="Search by entity, user ID, details…"
              value={search}
              onChange={handleSearchChange}
              aria-label="Search audit logs"
            />
          </div>

          {/* Action Filter */}
          <div className="sm:w-48">
            <select
              id="logs-action-filter"
              className="input w-full text-sm"
              value={action}
              onChange={handleActionChange}
              aria-label="Filter by action"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            id="btn-retry-fetch"
            type="button"
            onClick={handleManualRefresh}
            className="btn-secondary mt-4 text-sm"
          >
            Try Again
          </button>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No log entries found"
          description={
            search || action
              ? 'No logs match the current filters. Try adjusting your search or action filter.'
              : 'No audit events have been recorded yet.'
          }
        />
      ) : (
        <>
          {/* Table */}
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th id="col-timestamp" scope="col" className="w-44">
                    Timestamp
                  </th>
                  <th id="col-action" scope="col" className="w-28">
                    Action
                  </th>
                  <th id="col-entity" scope="col" className="w-28">
                    Entity
                  </th>
                  <th id="col-entity-id" scope="col" className="w-32">
                    Entity ID
                  </th>
                  <th id="col-details" scope="col">
                    Details
                  </th>
                  <th id="col-user-id" scope="col" className="w-32">
                    User ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => {
                  const rowId = log.id ?? log._id ?? idx;
                  return (
                    <tr key={rowId} id={`log-row-${rowId}`}>
                      {/* Timestamp */}
                      <td
                        headers="col-timestamp"
                        className="text-xs text-slate-400 whitespace-nowrap font-mono"
                        style={{ fontFamily: "'Consolas', 'Fira Mono', monospace" }}
                      >
                        {log.createdAt || log.timestamp || log.created_at
                          ? formatDateTime(log.createdAt ?? log.timestamp ?? log.created_at)
                          : '—'}
                      </td>

                      {/* Action Badge */}
                      <td headers="col-action">
                        <span
                          id={`action-badge-${rowId}`}
                          className={`badge ${actionBadge(log.action)} uppercase text-xs tracking-wide`}
                        >
                          {log.action ?? '—'}
                        </span>
                      </td>

                      {/* Entity */}
                      <td headers="col-entity" className="text-sm text-slate-300 capitalize">
                        {log.entity ?? log.resource ?? log.model ?? '—'}
                      </td>

                      {/* Entity ID */}
                      <td
                        headers="col-entity-id"
                        className="text-xs text-slate-400 font-mono break-all"
                        style={{ fontFamily: "'Consolas', 'Fira Mono', monospace" }}
                      >
                        {log.entityId ?? log.entity_id ?? log.resourceId ?? '—'}
                      </td>

                      {/* Details */}
                      <td headers="col-details" className="max-w-xs">
                        <DetailsCell
                          details={log.details ?? log.metadata ?? log.payload ?? null}
                          rowId={rowId}
                        />
                      </td>

                      {/* User ID */}
                      <td
                        headers="col-user-id"
                        className="text-xs text-slate-400 font-mono break-all"
                        style={{ fontFamily: "'Consolas', 'Fira Mono', monospace" }}
                      >
                        {log.userId ?? log.user_id ?? log.performedBy ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
