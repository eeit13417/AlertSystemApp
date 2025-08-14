import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../axiosConfig';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const emailOk = useMemo(() => /.+@.+\..+/.test(form.email), [form.email]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!emailOk) return setError('Please enter a valid email address.');
    setSubmitting(true);
    try {
      await axiosInstance.post('/api/auth/register', form);
      alert('Registration successful. Please log in.');
      navigate('/login');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-zinc-900 to-black shadow-2xl p-6">
          <h1 className="text-2xl font-semibold text-center mb-1">Create your account</h1>
          <p className="text-center text-slate-400 mb-6">Join the dashboard to manage inventory and alerts.</p>

          {error && <div className="mb-4 rounded-lg border border-rose-800/60 bg-rose-900/20 px-3 py-2 text-rose-200">{error}</div>}

          <form onSubmit={onSubmit} className="grid gap-3">
            <label className="text-sm">Name</label>
            <input
              className="rounded-xl border border-slate-800 bg-white/5 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
              placeholder="Jane Doe"
              value={form.name}
              onChange={(e)=>setForm({...form, name: e.target.value})}
              required
            />
            <label className="text-sm mt-2">Email</label>
            <input
              type="email"
              className="rounded-xl border border-slate-800 bg-white/5 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e)=>setForm({...form, email: e.target.value})}
              required
            />
            {!emailOk && form.email && <div className="text-amber-200 text-sm">Invalid email format.</div>}

            <label className="text-sm mt-2">Password</label>
            <input
              type="password"
              className="rounded-xl border border-slate-800 bg-white/5 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
              placeholder=""
              value={form.password}
              onChange={(e)=>setForm({...form, password: e.target.value})}
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <div className="text-center mt-4 text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
