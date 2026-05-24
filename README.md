---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env    # edit JWT_SECRET
npm run seed            # seed demo data
npm run dev             # starts on :5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev             # starts on :5173
```

Open **http://localhost:5173** in your browser.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | sivadandem7@warehouseiq.com | Admin@123 |
| **Manager** | kutty@warehouseiq.com | Manager@123 |
| **Staff** | nitin@warehouseiq.com | Staff@123 |

---

## 🏭 Sample Data (Indian Companies)

| Type | Examples |
|------|---------|
| **Warehouses** | Mumbai Central Warehouse, Delhi NCR Hub, Bengaluru South Depot |
| **Suppliers** | Tata Electronics, Godrej Interio, Dixon Technologies, Mahindra Logistics, Bosch India |
| **Products** | Laptop Inspiron 15, Godrej Office Chair, Forklift Battery 48V, ISI Safety Helmet… |
| **Purchase Orders** | PO-2024-001 (Dixon Technologies), PO-2024-002 (Godrej Interio), PO-2024-003 (Mahindra Logistics) |

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List (search, category, warehouse filter) |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Stock
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stock/in` | Record stock in |
| POST | `/api/stock/out` | Record stock out (prevents negative) |
| GET | `/api/stock/history` | Movement history |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Create supplier |
| PUT | `/api/suppliers/:id` | Update supplier |
| DELETE | `/api/suppliers/:id` | Delete supplier |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchase-orders` | List POs |
| POST | `/api/purchase-orders` | Create PO with items |
| PATCH | `/api/purchase-orders/:id/status` | Update status |
| DELETE | `/api/purchase-orders/:id` | Delete PO |

### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/warehouses` | Create warehouse |
| PUT | `/api/warehouses/:id` | Update warehouse |
| DELETE | `/api/warehouses/:id` | Delete warehouse |

### Dashboard & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Stats + charts data |
| GET | `/api/reports/inventory` | Inventory report |
| GET | `/api/reports/low-stock` | Low stock report |
| GET | `/api/reports/movements` | Movement trends |
| GET | `/api/reports/suppliers` | Supplier analytics |
| GET | `/api/logs` | Audit logs (admin) |

---

## 🗄️ Database Schema

```sql
users              -- Auth + RBAC (admin/manager/staff)
warehouses         -- Physical warehouse locations
suppliers          -- Vendor/supplier records  
products           -- Inventory items (SKU unique)
stock_movements    -- IN/OUT transaction log
purchase_orders    -- PO header (status workflow)
purchase_order_items -- PO line items
inventory_logs     -- Immutable audit trail
```

---

## 🛡️ Role Permissions

| Feature | Admin | Manager | Staff |
|---------|-------|---------|-------|
| Login | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ |
| Create/Edit Products | ✅ | ✅ | ❌ |
| Delete Products | ✅ | ✅ | ❌ |
| Record Stock Movements | ✅ | ✅ | ✅ |
| Manage Suppliers | ✅ | ✅ | ❌ |
| Manage Purchase Orders | ✅ | ✅ | ❌ |
| Manage Warehouses | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ |
| View Audit Logs | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |

---

## 🔧 Environment Variables

### Backend `.env`
```env
PORT=5000
JWT_SECRET=your-super-secret-key-change-in-prod
JWT_EXPIRES_IN=7d
DB_PATH=./warehouseiq.db
FRONTEND_URL=https://warehouseiqd.netlify.app
NODE_ENV=production
```

### Frontend `.env`
```env
VITE_API_URL=https://warehouseiqd.onrender.com/api
```

---

## 🚢 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Netlify | https://warehouseiqd.netlify.app |
| Backend | Render | https://warehouseiqd.onrender.com |

### Netlify Settings
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Env variable: `VITE_API_URL=https://warehouseiqd.onrender.com/api`

### Render Settings
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Node version: `20`

---

## 📝 License

MIT — free to use and modify.