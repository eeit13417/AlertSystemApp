import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosConfig";

export default function StockList({ stocks, lowSet, onUpdated, onEdit, onDeleted  }) {
  const { admin } = useAuth();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item？")) return;
    try {
      setDeletingId(id);
      const res = await axiosInstance.put(`/api/stock/${id}`, { status: 0 }, {
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      onDeleted?.(id);
    } catch (e) {
      alert("Deletion failed. Please try again later.");
    } finally {
      setDeletingId(null);
    }
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-black shadow-2xl overflow-hidden">
      <div className="overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-slate-100">
          <thead>
            <tr className="bg-black">
              <th className="sticky top-0 z-10 text-left px-4 py-3 border-b border-slate-800 w-20">Status</th>
              <th className="sticky top-0 z-10 text-left px-4 py-3 border-b border-slate-800">Title</th>
              <th className="sticky top-0 z-10 text-left px-4 py-3 border-b border-slate-800 w-40">Quantity</th>
              <th className="sticky top-0 z-10 text-left px-4 py-3 border-b border-slate-800 w-60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => {
              const low = lowSet?.has(s._id);
              return (
                <tr key={s._id} className={low ? "bg-gradient-to-r from-amber-500/10 to-transparent" : ""}>
                  <td className="px-4 py-3 align-top">
                    {low ? (
                      <span className="inline-block min-w-11 text-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                        LOW
                      </span>
                    ) : (
                      <span className="inline-block min-w-11 text-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col">
                      <strong>{s.title}</strong>
                      <small className="text-slate-400">ID: {s._id}</small>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-block w-16 text-center rounded-lg border border-slate-800 bg-zinc-900 px-2 py-1">
                      {s.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-xl border border-slate-800 bg-transparent px-3 py-1.5 hover:bg-zinc-900"
                        onClick={() => onEdit?.(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-xl border border-red-700/60 bg-transparent px-3 py-1.5 hover:bg-red-900/30 disabled:opacity-50"
                        onClick={() => handleDelete(s._id)}
                        disabled={deletingId === s._id}
                      >
                        {deletingId === s._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {stocks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">No items</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
