# WarehouseIQ 🏭

> Smart Inventory & Warehouse Management System — full-stack, dark-themed, role-based.

![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Stack](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js)
![Stack](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite)

---

## 📸 Features

| Feature | Description |
|---|---|
| 🔐 JWT Auth | Login with role-based access (Admin / Manager / Staff) |
| 📦 Products | Full CRUD — SKU, category, price, stock threshold |
| 📊 Dashboard | Live stats, charts, low-stock alerts, recent movements |
| 📥📤 Stock | Stock IN / OUT with negative-stock prevention & full history |
| 🏢 Suppliers | Supplier management with product linkage |
| 🛒 Purchase Orders | Create POs with line items, approve & receive workflow |
| 🏗️ Warehouses | Manage warehouse locations with capacity tracking |
| 📈 Reports | Inventory, low-stock, movements & supplier analytics |
| 🔍 Audit Logs | Immutable audit trail of every action (admin only) |

---

## 🏗️ Architecture

```
warehouseiq/
├── frontend/          # React + Vite + Tailwind CSS
│   └── src/
│       ├── api/       # Axios client + all endpoint functions
│       ├── components/ # Layout, UI components (Modal, StatCard, etc.)
│       ├── context/   # AuthContext (JWT + RBAC)
│       ├── pages/     # Dashboard, Products, Stock, Suppliers…
│       └── utils/     # formatCurrency, formatDateTime helpers
│
└── backend/           # Express.js REST API
    └── src/
        ├── controllers/ # Business logic per resource
        ├── db/          # SQLite init + seed data
        ├── middleware/  # JWT auth, error handler, logger
        ├── routes/      # Express routers
        └── validations/ # Input validation rules
```

---

## 🚀 Quick Start

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
| **Admin** | admin@warehouseiq.com | Admin@123 |
| **Manager** | manager@warehouseiq.com | Manager@123 |
| **Staff** | staff@warehouseiq.com | Staff@123 |

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
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## 🚢 Production Deployment

1. Set `NODE_ENV=production` and a strong `JWT_SECRET`
2. Build frontend: `cd frontend && npm run build`
3. Serve the `frontend/dist` folder as static files from Express:
   ```js
   app.use(express.static(path.join(__dirname, '../frontend/dist')));
   ```
4. Use a process manager: `pm2 start server.js --name warehouseiq`

---

## 📝 License

MIT — free to use and modify.
