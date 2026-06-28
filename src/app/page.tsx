"use client";
import { useState, useEffect } from "react";
import { BookOpen, Wallet, ShoppingCart, Plus, Pencil, FileText, Loader2 } from "lucide-react";
import {
  MonthData, Expense,
  getAllMonths, getMonth, upsertMonth,
  getSuggestions, addSuggestions,
  makeKey, fmtBDT, parseAmount, BANGLA_MONTHS,
} from "@/lib/supabase";
import ExpenseRow from "@/components/ExpenseRow";
import ReportView from "@/components/ReportView";

const CUR_YEAR = new Date().getFullYear();
const YEARS = [CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map(String);

export default function Home() {
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(BANGLA_MONTHS[new Date().getMonth()]);
  const [activeYear, setActiveYear] = useState<string>(String(CUR_YEAR));
  const [data, setData] = useState<MonthData | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState("");
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editOpening, setEditOpening] = useState("");
  const [editRental, setEditRental] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [addSugFiltered, setAddSugFiltered] = useState<string[]>([]);
  const [showAddSug, setShowAddSug] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const [months, sugs] = await Promise.all([getAllMonths(), getSuggestions()]);
      setAllMonths(months);
      setSuggestions([...sugs].sort((a, b) => a.localeCompare(b, "bn")));
      setDbReady(true);
    } catch {
      setDbReady(false);
    }
  }

  function computeOpening(key: string, months: MonthData[]): number {
    const sorted = [...months].sort((a, b) => a.key.localeCompare(b.key));
    const idx = sorted.findIndex((m) => m.key === key);
    if (idx <= 0) return 0;
    const prev = sorted[idx - 1];
    const totalIn = (prev.opening || 0) + (prev.rental || 0) + (prev.other_income || 0);
    const totalEx = (prev.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    return totalIn - totalEx;
  }

  async function selectMonth(month: string) {
    const key = makeKey(month, activeYear);
    setActiveMonth(month);
    setActiveKey(key);
    setShowReport(false);
    setData(null);
    setLoading(true);
    try {
      const m = await getMonth(key);
      if (m) {
        if (!m.opening) m.opening = computeOpening(key, allMonths);
        setData(m);
      }
    } catch { showToast("লোড হয়নি, আবার চেষ্টা করুন"); }
    setLoading(false);
  }

  async function selectYear(year: string) {
    setActiveYear(year);
    const key = makeKey(activeMonth, year);
    setActiveKey(key);
    setShowReport(false);
    setData(null);
    setLoading(true);
    try {
      const m = await getMonth(key);
      if (m) {
        if (!m.opening) m.opening = computeOpening(key, allMonths);
        setData(m);
      }
    } catch { showToast("লোড হয়নি, আবার চেষ্টা করুন"); }
    setLoading(false);
  }

  async function createMonth() {
    const key = makeKey(activeMonth, activeYear);
    const newMonth: MonthData = {
      key, month: activeMonth, year: activeYear,
      opening: 0, rental: 0, other_income: 0, expenses: [],
    };
    const merged = [...allMonths, newMonth].sort((a, b) => a.key.localeCompare(b.key));
    newMonth.opening = computeOpening(key, merged);
    try {
      await upsertMonth(newMonth);
      const updated = await getAllMonths();
      setAllMonths(updated);
      setData(newMonth);
      setActiveKey(key);
      setShowReport(false);
    } catch { showToast("তৈরি হয়নি, আবার চেষ্টা করুন"); }
  }


  function updateExpense(i: number, field: keyof Expense, value: string | number) {
    if (!data) return;
    const expenses = [...data.expenses];
    expenses[i] = { ...expenses[i], [field]: value };
    setData({ ...data, expenses });
  }

  async function saveExpenseEdit(i: number, name: string, amount: number) {
    if (!data) return;
    const expenses = [...data.expenses];
    expenses[i] = { name, amount };
    const updated = { ...data, expenses };
    setData(updated);
    try {
      await upsertMonth(updated);
      showToast("খরচ আপডেট হয়েছে");
    } catch { showToast("সংরক্ষণ হয়নি"); }
  }

  async function addExpense() {
    if (!data || !activeKey || !newExpenseName.trim()) return;
    const updated = { ...data, expenses: [...data.expenses, { name: newExpenseName.trim(), amount: parseAmount(newExpenseAmount) }] };
    setData(updated);
    setShowAddExpense(false);
    setNewExpenseName("");
    setNewExpenseAmount("");
    try {
      await upsertMonth(updated);
      await addSuggestions([newExpenseName.trim()]);
      const [months, sugs] = await Promise.all([getAllMonths(), getSuggestions()]);
      setAllMonths(months);
      setSuggestions([...sugs].sort((a, b) => a.localeCompare(b, "bn")));
      showToast("খরচ যোগ হয়েছে");
    } catch { showToast("সংরক্ষণ হয়নি"); }
  }

  async function removeExpense(i: number) {
    if (!data || !activeKey) return;
    const updated = { ...data, expenses: data.expenses.filter((_, idx) => idx !== i) };
    setData(updated);
    try {
      await upsertMonth(updated);
      showToast("খরচ মুছে গেছে");
    } catch { showToast("মুছা হয়নি"); }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const totalIncome = data ? (data.opening || 0) + (data.rental || 0) + (data.other_income || 0) : 0;
  const totalExpense = data ? data.expenses.reduce((s, e) => s + (e.amount || 0), 0) : 0;
  const balance = totalIncome - totalExpense;

  const existsInDb = (month: string) => allMonths.some((m) => m.month === month && m.year === activeYear);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Header */}
      {!showReport && (
        <div className="bg-blue-600 text-white text-center py-7 px-4">
          <BookOpen className="mx-auto mb-2 text-white" size={44} strokeWidth={1.5} />
          <h1 className="text-3xl font-bold">মাসিক হিসাব</h1>
          <p className="text-blue-200 mt-1 text-lg">আয়, খরচ ও ব্যালেন্স</p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 mt-5">

        {dbReady === false && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-lg">
            ⚠️ Supabase সংযোগ নেই। <strong>.env.local</strong> ফাইলে NEXT_PUBLIC_SUPABASE_URL ও NEXT_PUBLIC_SUPABASE_ANON_KEY দিন।
          </div>
        )}

        {/* Navigation */}
        {!showReport && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            {/* Year selector */}
            <div className="flex gap-2 mb-3">
              {YEARS.map((y) => (
                <button key={y} onClick={() => selectYear(y)}
                  className={`px-4 py-2 rounded-xl text-base font-medium border transition-colors ${
                    y === activeYear
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600"
                  }`}>
                  {y}
                </button>
              ))}
            </div>
            {/* Month grid */}
            <div className="grid grid-cols-4 gap-2">
              {BANGLA_MONTHS.map((m) => {
                const isActive = m === activeMonth && makeKey(m, activeYear) === activeKey;
                const hasData = existsInDb(m);
                return (
                  <button key={m} onClick={() => selectMonth(m)}
                    className={`py-2 px-1 rounded-xl text-base font-medium border transition-colors relative ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : hasData
                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                    }`}>
                    {m}
                    {hasData && !isActive && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <div className="flex justify-center items-center gap-2 py-10 text-gray-400 text-lg"><Loader2 className="animate-spin" size={24} /> লোড হচ্ছে...</div>}

        {/* No month selected */}
        {!loading && !activeKey && (
          <div className="text-center text-xl text-gray-400 py-12">
            উপরে মাস বেছে নিন
          </div>
        )}

        {/* Month not in DB yet */}
        {!loading && activeKey && !data && !showReport && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-xl text-gray-500 mb-5">{activeMonth} {activeYear} এর কোনো হিসাব নেই</p>
            <button onClick={createMonth}
              className="text-xl px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">
              <Plus size={18} className="inline mr-1" />{activeMonth} {activeYear} তৈরি করুন
            </button>
          </div>
        )}

        {/* Editor / Report */}
        {!loading && data && (
          showReport ? (
            <ReportView data={data} onBack={() => setShowReport(false)} />
          ) : (
            <>
              {/* Income */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Wallet size={20} className="text-blue-600" />আয়</h2>
                  <button onClick={() => { setEditOpening(String(data.opening || "")); setEditRental(String(data.rental || "")); setShowIncomeModal(true); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 py-2 border-b border-gray-100">
                  <span className="flex-1 text-base text-gray-500">ওপেনিং বালেন্স</span>
                  <span className="text-base font-semibold text-blue-700">৳{(data.opening || 0).toLocaleString("bn-BD")}</span>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <span className="flex-1 text-base text-gray-500">ভাড়া</span>
                  <span className="text-base font-semibold text-blue-700">৳{(data.rental || 0).toLocaleString("bn-BD")}</span>
                </div>
              </div>

              {/* Expenses */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ShoppingCart size={20} className="text-blue-600" />খরচ</h2>
                {data.expenses.map((e, i) => (
                  <ExpenseRow key={i} index={i} expense={e} suggestions={suggestions}
                    onChange={updateExpense}
                    onSave={saveExpenseEdit}
                    onRemove={removeExpense} />
                ))}
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="w-full text-xl py-3 mt-1 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                  <Plus size={18} className="inline mr-1" />নতুন খরচ যোগ করুন
                </button>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <SRow label="ওপেনিং বালেন্স" value={fmtBDT(data.opening || 0)} />
                {data.rental > 0 && <SRow label="ভাড়া" value={fmtBDT(data.rental)} />}

                <SRow label="মোট আয়" value={fmtBDT(totalIncome)} bold />
                <SRow label="মোট খরচ" value={fmtBDT(totalExpense)} bold />
                <div className={`flex justify-between mt-3 pt-3 border-t-2 border-gray-200 text-2xl font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                  <span>বালেন্স</span><span>{fmtBDT(balance)}</span>
                </div>
              </div>

              {/* Actions */}
              <button onClick={() => setShowReport(true)}
                className="w-full text-xl py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                <FileText size={20} />রিপোর্ট দেখুন
              </button>
            </>
          )
        )}
      </div>

      {/* Income edit modal */}
      {showIncomeModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowIncomeModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Wallet size={20} className="text-blue-600" />আয় সম্পাদনা</h3>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-base text-gray-500">ওপেনিং বালেন্স</label>
                <button
                  type="button"
                  onClick={() => setEditOpening(String(computeOpening(activeKey!, allMonths)))}
                  className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100">
                  আগের মাস থেকে আনুন
                </button>
              </div>
              <input type="text" inputMode="numeric" value={editOpening}
                onChange={(e) => setEditOpening(e.target.value)}
                placeholder="০"
                className="w-full text-xl px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="mb-5">
              <label className="text-base text-gray-500 block mb-1">ভাড়া</label>
              <input type="text" inputMode="numeric" value={editRental}
                onChange={(e) => setEditRental(e.target.value)}
                placeholder="০"
                className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowIncomeModal(false)}
                className="px-5 py-3 rounded-xl border border-gray-200 text-lg text-gray-600 hover:bg-gray-50">
                বাতিল
              </button>
              <button onClick={async () => {
                const updated = { ...data, opening: parseAmount(editOpening), rental: parseAmount(editRental) };
                setData(updated);
                setShowIncomeModal(false);
                try {
                  await upsertMonth(updated);
                  showToast("আয় সংরক্ষণ হয়েছে");
                } catch { showToast("সংরক্ষণ হয়নি"); }
              }}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700">
                সংরক্ষণ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add expense modal */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => { setShowAddExpense(false); setNewExpenseName(""); setNewExpenseAmount(""); setShowAddSug(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">নতুন খরচ যোগ করুন</h3>

            <div className="mb-3">
              <label className="text-base text-gray-500 block mb-1">খরচের নাম</label>
              <div className="relative">
                <input
                  type="text"
                  value={newExpenseName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewExpenseName(val);
                    const f = (val.length > 0
                      ? suggestions.filter((s) => s.toLowerCase().includes(val.toLowerCase()))
                      : suggestions).sort((a, b) => a.localeCompare(b, "bn")).slice(0, 8);
                    setAddSugFiltered(f);
                    setShowAddSug(f.length > 0);
                  }}
                  onFocus={() => {
                    const f = newExpenseName.length > 0
                      ? suggestions.filter((s) => s.toLowerCase().includes(newExpenseName.toLowerCase())).slice(0, 8)
                      : suggestions.slice(0, 8);
                    setAddSugFiltered(f);
                    setShowAddSug(true);
                  }}
                  placeholder="যেমন: বিদ্যুৎ বিল"
                  className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {showAddSug && (
                  <ul className="border border-gray-200 rounded-xl mt-1 max-h-48 overflow-y-auto">
                    {addSugFiltered.map((s) => (
                      <li key={s} onMouseDown={() => { setNewExpenseName(s); setShowAddSug(false); }}
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
                value={newExpenseAmount}
                onChange={(e) => setNewExpenseAmount(e.target.value)}
                placeholder="০"
                className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowAddExpense(false); setNewExpenseName(""); setNewExpenseAmount(""); setShowAddSug(false); }}
                className="px-5 py-3 rounded-xl border border-gray-200 text-lg text-gray-600 hover:bg-gray-50">
                বাতিল
              </button>
              <button onClick={addExpense}
                disabled={!newExpenseName.trim() || parseAmount(newExpenseAmount) <= 0}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:opacity-40">
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl text-xl shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}

function SRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-2 text-lg border-b border-gray-100 ${bold ? "font-bold" : ""}`}>
      <span className={bold ? "" : "text-gray-500"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
