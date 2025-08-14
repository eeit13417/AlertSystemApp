import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b border-slate-800/80 bg-slate-950/60">
      <div className="mx-auto max-w-5xl px-5 py-3 flex items-center justify-between text-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-sky-500 shadow-[0_2px_18px_rgba(99,102,241,0.6)] grid place-items-center">∎</div>
          <span className="font-semibold">Store Console</span>
        </div>
        <nav className="flex items-center gap-1 text-slate-300">
          {admin ? (
            <>
              <Link className="px-3 py-1.5 rounded-lg hover:bg-white/5" to="/inventory">Inventory</Link>
              <Link className="px-3 py-1.5 rounded-lg hover:bg-white/5" to="/admin">Admin Settings</Link>
              <Link className="px-3 py-1.5 rounded-lg hover:bg-white/5 opacity-70" to="/login" onClick={handleLogout}>Logout</Link>
            </>
          ) : (
            <>
              <Link className="px-3 py-1.5 rounded-lg hover:bg-white/5 opacity-70" to="/login">Login</Link>
              <Link className="px-3 py-1.5 rounded-lg hover:bg-white/5 opacity-70" to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
