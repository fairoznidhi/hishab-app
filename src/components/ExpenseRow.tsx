"use client";
import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Expense, parseAmount } from "@/lib/supabase";

interface Props {
  expense: Expense;
  index: number;
  suggestions: string[];
  onChange: (i: number, field: keyof Expense, value: string | number) => void;
  onSave: (i: number, name: string, amount: number) => void;
  onRemove: (i: number) => void;
}

export default function ExpenseRow({ expense, index, suggestions, onChange, onSave, onRemove }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(expense.name);
  const [editAmount, setEditAmount] = useState(String(expense.amount || ""));
  const [filtered, setFiltered] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);
  const sugRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node))
        setShowSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!showEdit && !confirmDelete) return;
    window.history.pushState({ modal: true }, "");
    const handlePopState = () => {
      setShowEdit(false);
      setConfirmDelete(false);
      setShowSug(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEdit, confirmDelete]);

  function openEdit() {
    setEditName(expense.name);
    setEditAmount(String(expense.amount || ""));
    setShowSug(false);
    setShowEdit(true);
  }

  function handleEditName(val: string, forceShow = false) {
    setEditName(val);
    const f = (val.length > 0
      ? suggestions.filter((s) => s.toLowerCase().includes(val.toLowerCase()))
      : suggestions).sort((a, b) => a.localeCompare(b, "bn")).slice(0, 8);
    setFiltered(f);
    setShowSug(f.length > 0 || forceShow);
  }

  function saveEdit() {
    onSave(index, editName.trim(), parseAmount(editAmount));
    setShowEdit(false);
  }

  const canSave = editName.trim() !== "" && parseAmount(editAmount) > 0;

  return (
    <>
      {/* Display row */}
      <div className="flex items-center gap-2 py-2 px-3 mb-2 bg-white border border-gray-100 rounded-xl">
        <span className="text-sm text-gray-400 w-6 shrink-0">{index + 1}.</span>
        <span className="flex-1 text-base text-gray-800 truncate">{expense.name || "—"}</span>
        <span className="text-base font-semibold text-blue-700 shrink-0">৳{expense.amount ? expense.amount.toLocaleString("bn-BD") : "০"}</span>
        <div className="flex gap-1 shrink-0">
          <button onClick={openEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">খরচ সম্পাদনা</h3>

            <div className="mb-3">
              <label className="text-base text-gray-500 block mb-1">খরচের নাম</label>
              <div className="relative" ref={sugRef}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => handleEditName(e.target.value)}
                  onFocus={() => handleEditName(editName, true)}
                  placeholder="যেমন: বিদ্যুৎ বিল"
                  className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {showSug && (
                  <ul className="border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto">
                    {filtered.map((s) => (
                      <li key={s} onMouseDown={() => { setEditName(s); setShowSug(false); }}
                        className="px-4 py-3 text-xl cursor-pointer hover:bg-blue-50 hover:text-blue-700">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-base text-gray-500 block mb-1">টাকার পরিমাণ</label>
              <input
                type="text"
                inputMode="numeric"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="০"
                className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowEdit(false)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-lg text-gray-600 hover:bg-gray-50">
                বাতিল
              </button>
              <button onClick={saveEdit} disabled={!canSave}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:opacity-40">
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2">খরচ মুছবেন?</h3>
            <p className="text-gray-500 mb-6">
              <strong>{expense.name || `খরচ ${index + 1}`}</strong> মুছে ফেলা হবে।
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-lg text-gray-600 hover:bg-gray-50">
                বাতিল
              </button>
              <button onClick={() => { setConfirmDelete(false); onRemove(index); }}
                className="px-5 py-3 rounded-xl bg-red-500 text-white text-lg font-bold hover:bg-red-600">
                মুছুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
