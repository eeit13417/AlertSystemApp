import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../axiosConfig';

export default function AdminSettings() {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'admins'

  // ---------- Profile ----------
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    notification: true,
  });
  const emailOk = useMemo(() => /.+@.+\..+/.test(formData.email), [formData.email]);
  const pwdOk = useMemo(() => {
    if (!formData.password && !formData.password2) return true;
    return formData.password === formData.password2;
  }, [formData.password, formData.password2]);

  // ---------- Admins tab ----------
  const [profileRole, setProfileRole] = useState(null);
  const isSuper = (admin?.role === 'super') || profileRole === 'super';
  const [admins, setAdmins] = useState([]);
  const [alistLoading, setAlistLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savingRoleId, setSavingRoleId] = useState(null);

  // Load profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get('/api/auth/profile', {
          headers: { Authorization: `Bearer ${admin.token}` },
        });
        setFormData((prev) => ({
          ...prev,
          email: res.data.email || '',
          notification: Boolean(res.data.notification),
        }));
        setProfileRole(res.data.role || 'admin');
      } catch {
        alert('Failed to fetch profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (admin) fetchProfile();
  }, [admin]);

  // Load admin list (only for super)
  const loadAdmins = async () => {
    if (!isSuper) return;
    setAlistLoading(true); 
    try {
      const res = await axiosInstance.get('/api/auth/list', {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      setAdmins(res.data || []);
    } catch {
      alert('Failed to load admins. Please try again later.');
    } finally {
      setAlistLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'admins') loadAdmins();
  }, [activeTab, isSuper]);

  // Profile submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOk || !pwdOk) return;
    setLoading(true);
    try {
      const payload = { email: formData.email, notification: formData.notification };
      if (formData.password) payload.password = formData.password;
      await axiosInstance.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      alert('Changes saved.');
      setFormData((f) => ({ ...f, password: '', password2: '' }));
    } catch {
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Soft delete admin
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    setDeletingId(id);
    try {
      await axiosInstance.put(
        '/api/auth/profile',
        { id, status: 0 },
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
      setAdmins((prev) => prev.filter((a) => a._id !== id));
    } catch (e) {
      const msg = e?.response?.data?.message || 'Deletion failed. Please try again later.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // Change role (super <-> admin)
  const handleRoleChange = async (id, newRole) => {
    setSavingRoleId(id);
    try {
      await axiosInstance.put(
        '/api/auth/profile',
        { id, role: newRole },
        { headers: { Authorization: `Bearer ${admin.token}` } }
      );
      setAdmins((prev) => prev.map(a => a._id === id ? { ...a, role: newRole } : a));
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to update role.';
      alert(msg);
    } finally {
      setSavingRoleId(null);
    }
  };

  if (loading && activeTab === 'profile') {
    return <div className="text-center mt-20 text-slate-200">Loading...</div>;
  }

  return (
    <div className="bg-black min-h-screen px-4 py-10 text-slate-100">
      <main className="w-full max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Admin Settings</h1>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`rounded-xl border px-4 py-2 ${activeTab==='profile' ? 'border-indigo-500 bg-indigo-500/15' : 'border-slate-800 hover:bg-zinc-900'}`}
          >
            Profile
          </button>
          {isSuper && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`rounded-xl border px-4 py-2 ${activeTab==='admins' ? 'border-indigo-500 bg-indigo-500/15' : 'border-slate-800 hover:bg-zinc-900'}`}
            >
              Admins
            </button>
          )}
        </div>

        {activeTab === 'profile' && (
          <section className="w-full max-w-lg">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl">
              <h2 className="text-xl font-semibold mb-4 text-center">Profile</h2>

              <label className="block text-sm text-slate-300 mb-1">Email</label>
              <input
                className="w-full rounded-xl border border-slate-800 bg-white/5 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((f)=>({ ...f, email: e.target.value }))}
              />
              {!emailOk && <div className="mt-1 text-amber-200">Please enter a valid email address.</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">New Password</label>
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-white/5 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={formData.password}
                    onChange={(e) => setFormData((f)=>({ ...f, password: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Confirm Password</label>
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-white/5 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
                    type="password"
                    value={formData.password2}
                    onChange={(e) => setFormData((f)=>({ ...f, password2: e.target.value }))}
                  />
                </div>
              </div>
              {!pwdOk && <div className="mt-1 text-rose-200">Passwords do not match.</div>}

              <div className="my-3 h-px bg-slate-800" />

              <label className="inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="size-4 accent-indigo-500"
                  checked={Boolean(formData.notification)}
                  onChange={(e)=>setFormData((f) => ({ ...f, notification: e.target.checked }))}
                />
                Receive restock notifications
              </label>

              <div className="mt-6 flex justify-center">
                <button
                  className="rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 px-6 py-2 text-white disabled:opacity-50"
                  type="submit"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'admins' && isSuper && (
          <section className="rounded-2xl border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h2 className="text-xl font-semibold">All Admins</h2>
              <button
                className="rounded-xl border border-slate-700 px-3 py-1.5 hover:bg-zinc-900"
                onClick={loadAdmins}
              >
                Refresh
              </button>
            </div>
            {alistLoading ? (
              <div className="p-4 text-slate-300">Loading…</div>
            ) : (
              <table className="w-full border-separate border-spacing-0 text-slate-100">
                <thead>
                  <tr className="bg-black">
                    <th className="text-left px-4 py-3 border-b border-slate-800">Name</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800">Email</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800 w-40">Role</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800 w-48">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a._id}>
                      <td className="px-4 py-3">{a.name || '-'}</td>
                      <td className="px-4 py-3">{a.email}</td>
                      <td className="px-4 py-3">
                        <select
                          className="rounded-lg border border-slate-800 bg-white/5 px-2 py-1 disabled:opacity-50"
                          value={a.role || 'admin'}
                          onChange={(e) => handleRoleChange(a._id, e.target.value)}
                          disabled={savingRoleId === a._id}
                          title="Change role"
                        >
                          <option value="admin">admin</option>
                          <option value="super">super</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="rounded-xl border border-red-700/60 px-3 py-1.5 hover:bg-red-900/30 disabled:opacity-50"
                          disabled={deletingId === a._id}
                          onClick={() => handleDelete(a._id)}
                          title="Are you sure you want to delete this admin?"
                        >
                          {deletingId === a._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-400">No admins</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
