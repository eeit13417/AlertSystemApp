import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosConfig";
import StockForm from "../components/StockForm";
import StockList from "../components/StockList";

export default function Inventory() {
  const { admin } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [lowSet, setLowSet] = useState(() => new Set());

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const res = await axiosInstance.get("/api/stock/get", {
          headers: { Authorization: `Bearer ${admin.token}` },
        });
        setStocks(Array.isArray(res.data) ? res.data : []);
      } catch {
        alert("Failed to load stocks.");
      }
    };
    if (admin?.token) fetchStocks();
  }, [admin?.token]);

  const refreshLow = async () => {
    try {
      const res = await axiosInstance.get("/api/stock/check", {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      const ids = new Set((Array.isArray(res.data) ? res.data : []).map((x) => x._id));
      setLowSet(ids);
    } catch {
      setLowSet(new Set());
    }
  };

  useEffect(() => {
    if (admin?.token) refreshLow();
    console.log(localStorage)
  }, [admin?.token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks
      .filter((s) => {
        const matches = q === "" || (s.title || "").toLowerCase().includes(q);
        const isLow = lowSet.has(s._id);
        return matches && (!onlyLow || isLow);
      })
      .sort((a, b) => {
        const aLow = lowSet.has(a._id) ? 1 : 0;
        const bLow = lowSet.has(b._id) ? 1 : 0;
        if (aLow !== bLow) return bLow - aLow;
        return (a.title || "").localeCompare(b.title || "");
      });
  }, [stocks, query, onlyLow, lowSet]);

  const totalSkus = stocks.length;
  const lowCount = stocks.filter((s) => lowSet.has(s._id)).length;

  const handleCreated = (created) => {
    setStocks((prev) => [...prev, created]);
    refreshLow();
  };
  const handleUpdated = (updated) => {
    setStocks((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    refreshLow();
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 text-slate-100 bg-black min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">Inventory</h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-zinc-900 px-3 py-1 text-sm">
            SKUs: {totalSkus}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm border ${lowCount ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-slate-800 bg-zinc-900"}`}>
            Low stock: {lowCount}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative min-w-64 grow sm:grow-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none">🔎</span>
          <input
            className="w-full rounded-xl border border-slate-800 bg-zinc-900 pl-8 pr-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
            placeholder="Search by title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="inline-flex items-center gap-2 select-none">
          <input type="checkbox" className="size-4 accent-indigo-500" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Only low stock
        </label>
      </div>

      <StockForm onCreated={handleCreated} />

      <StockList
        stocks={filtered}
        lowSet={lowSet}
        onUpdated={handleUpdated}
        onEdit={setEditing}
        onDeleted={(id) => {
          setStocks((prev) => prev.filter((s) => s._id !== id));
          refreshLow();
        }}
      />

      {editing && (
        <div className="mt-6">
          <StockForm
            editing={editing}
            onUpdated={(u) => {
              handleUpdated(u);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
    </main>
  );
}
