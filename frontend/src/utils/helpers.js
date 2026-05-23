export const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getStockStatus = (qty, min) => {
  if (qty === 0) return { label: 'Out of Stock', cls: 'badge-red' };
  if (qty <= min) return { label: 'Low Stock', cls: 'badge-yellow' };
  return { label: 'In Stock', cls: 'badge-green' };
};

export const getPOStatusBadge = (status) => {
  const map = {
    pending:   { label: 'Pending',   cls: 'badge-yellow' },
    approved:  { label: 'Approved',  cls: 'badge-blue' },
    delivered: { label: 'Delivered', cls: 'badge-green' },
    cancelled: { label: 'Cancelled', cls: 'badge-gray' },
  };
  return map[status] || { label: status, cls: 'badge-gray' };
};

export const exportCsv = (url, filename) => {
  const link = document.createElement('a');
  link.href = `${url}?format=csv`;
  link.download = filename;
  link.click();
};

export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
