import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../axiosConfig";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StockForm({ editing, onCreated, onUpdated, onCancel }) {
  const { admin } = useAuth();
  const [form, setForm] = useState({ title: "", quantity: 0 });
  const isEditing = Boolean(editing);

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title ?? "",
        quantity: Number(editing.quantity ?? 0),
      });
    } else {
      setForm({ title: "", quantity: 0 });
    }
  }, [editing]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title,
      quantity: Number(form.quantity),
      status: 1,                 // always enabled
      createDate: isEditing      // dates are not shown; set automatically
        ? (editing.createDate ? editing.createDate.slice(0, 10) : today())
        : today(),
      updateDate: today(),
    };

    try {
      if (isEditing) {
        const res = await axiosInstance.put(`/api/stock/${editing._id}`, payload, {
          headers: { Authorization: `Bearer ${admin.token}` },
        });
        onUpdated?.(res.data);
      } else {
        const res = await axiosInstance.post(`/api/stock/add`, payload, {
          headers: { Authorization: `Bearer ${admin.token}` },
        });
        onCreated?.(res.data);
      }
      setForm({ title: "", quantity: 0 });
    } catch {
      alert(isEditing ? "Failed to update." : "Failed to add.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-black border border-slate-800 text-slate-100 p-5 shadow-2xl rounded-2xl mb-6"
    >
      <h2 className="text-base font-medium mb-4">{isEditing ? "Edit Item" : "Add Item"}</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-xl border border-slate-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25 md:col-span-2"
          required
        />
        <input
          type="number"
          min={0}
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Math.max(0, Number(e.target.value || 0)) })}
          className="w-full rounded-xl border border-slate-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-500/25"
          required
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">
          {isEditing ? "Update" : "Create"}
        </button>
        {isEditing && (
          <button
            type="button"
            className="rounded-xl border border-slate-800 bg-transparent px-4 py-2 hover:bg-zinc-900"
            onClick={() => onCancel?.()}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
