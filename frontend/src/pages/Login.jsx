import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fill = (email, pw) => setForm({ email, password: pw });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-glow mb-4">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">WarehouseIQ</h1>
          <p className="text-slate-400 mt-1 text-sm">Smart Inventory & Warehouse Management</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Sign in to your account</h2>
          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input id="email" type="email" className="input" placeholder="you@warehouseiq.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input id="password" type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="Enter your password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" id="login-btn" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 card p-4">
          <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Demo Credentials</p>
          <div className="space-y-2">
            {[
              { role: 'Admin', email: 'admin@warehouseiq.com', pw: 'Admin@123', color: 'text-brand-400' },
              { role: 'Manager', email: 'manager@warehouseiq.com', pw: 'Manager@123', color: 'text-emerald-400' },
              { role: 'Staff', email: 'staff@warehouseiq.com', pw: 'Staff@123', color: 'text-yellow-400' },
            ].map(d => (
              <button key={d.role} onClick={() => fill(d.email, d.pw)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors group">
                <span className={`text-xs font-bold ${d.color}`}>{d.role}</span>
                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
