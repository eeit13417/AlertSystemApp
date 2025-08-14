import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import AdminSettings from './pages/AdminSettings';
import Inventory from './pages/Inventory';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register'

function AppShell() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />


        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminSettings />} />
          <Route path="/inventory" element={<Inventory />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <div className="bg-black min-h-screen text-slate-100">
      <Router>
        <AppShell />
      </Router>
    </div>
  );
}
