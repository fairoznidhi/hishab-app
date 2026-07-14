"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Plus,
  Minus,
  FileText,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  MonthData,
  Expense,
  Income,
  Person,
  getAllMonths,
  getMonth,
  upsertMonth,
  getSuggestions,
  addSuggestions,
  getIncomeSuggestions,
  addIncomeSuggestions,
  getPeople,
  addPerson,
  PERSON_COLORS,
  makeKey,
  fmtBDT,
  parseAmount,
  BANGLA_MONTHS,
  ENGLISH_MONTHS,
} from "@/lib/supabase";
import ExpenseRow from "@/components/ExpenseRow";
import ReportView from "@/components/ReportView";

const CUR_YEAR = new Date().getFullYear();
const YEARS = [CUR_YEAR - 1, CUR_YEAR, CUR_YEAR + 1].map(String);

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string>(
    BANGLA_MONTHS[new Date().getMonth()],
  );
  const [activeYear, setActiveYear] = useState<string>(String(CUR_YEAR));
  const [data, setData] = useState<MonthData | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showSelector, setShowSelector] = useState(true);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState("");
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [addSugFiltered, setAddSugFiltered] = useState<string[]>([]);
  const [showAddSug, setShowAddSug] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");
  const [incomeSuggestions, setIncomeSuggestions] = useState<string[]>([]);
  const [incomeSugFiltered, setIncomeSugFiltered] = useState<string[]>([]);
  const [showIncomeSug, setShowIncomeSug] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!showAddPerson && !showAddIncome && !showAddExpense) return;
    window.history.pushState({ modal: true }, "");
    const handlePopState = () => {
      setShowAddPerson(false);
      setNewPersonName("");
      setShowAddIncome(false);
      setNewIncomeName("");
      setNewIncomeAmount("");
      setShowAddExpense(false);
      setNewExpenseName("");
      setNewExpenseAmount("");
      setShowAddSug(false);
      setShowIncomeSug(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddPerson, showAddIncome, showAddExpense]);

  async function init() {
    try {
      const [ppl, sugs, incomeSugs] = await Promise.all([
        getPeople(),
        getSuggestions(),
        getIncomeSuggestions(),
      ]);
      setPeople(
        process.env.NODE_ENV === "development"
          ? ppl
          : ppl.filter((p) => p.name.trim().toLowerCase() !== "test"),
      );
      setSuggestions([...sugs].sort((a, b) => a.localeCompare(b, "bn")));
      setIncomeSuggestions(
        [...incomeSugs].sort((a, b) => a.localeCompare(b, "bn")),
      );
      setDbReady(true);
    } catch {
      setDbReady(false);
    }
  }

  async function selectPerson(p: Person) {
    setActivePerson(p);
    setActiveKey(null);
    setData(null);
    setShowReport(false);
    setShowSelector(true);
    setLoading(true);
    try {
      const months = await getAllMonths(p.id);
      setAllMonths(months);
    } catch {
      showToast("লোড হয়নি, আবার চেষ্টা করুন");
    }
    setLoading(false);
  }

  async function handleAddPerson() {
    if (addingPerson) return;
    const name = newPersonName.trim();
    if (!name) return;
    const color = PERSON_COLORS[people.length % PERSON_COLORS.length];
    setAddingPerson(true);
    try {
      const p = await addPerson(name, color);
      setPeople([...people, p]);
      setNewPersonName("");
      window.history.back();
      await selectPerson(p);
    } catch {
      showToast("যোগ হয়নি, আবার চেষ্টা করুন");
    }
    setAddingPerson(false);
  }

  function computeOpening(key: string, months: MonthData[]): number | null {
    const [year, engMonth] = key.split("_");
    const monthIdx = ENGLISH_MONTHS.indexOf(engMonth);
    if (monthIdx < 0) return null;
    const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
    const prevYear = monthIdx === 0 ? String(Number(year) - 1) : year;
    const prevKey = `${prevYear}_${ENGLISH_MONTHS[prevMonthIdx]}`;
    const prev = months.find((m) => m.key === prevKey);
    if (!prev) return null;
    const totalIn =
      (prev.opening || 0) +
      (prev.incomes || []).reduce((s, e) => s + (e.amount || 0), 0);
    const totalEx = (prev.expenses || []).reduce(
      (s, e) => s + (e.amount || 0),
      0,
    );
    return totalIn - totalEx;
  }

  async function selectMonth(month: string) {
    if (!activePerson) return;
    const key = makeKey(month, activeYear);
    setActiveMonth(month);
    setActiveKey(key);
    setShowReport(false);
    setData(null);
    setLoading(true);
    try {
      const [m, months] = await Promise.all([
        getMonth(key, activePerson.id),
        getAllMonths(activePerson.id),
      ]);
      setAllMonths(months);
      if (m) {
        const computed = computeOpening(key, months);
        if (computed !== null && computed !== m.opening) {
          m.opening = computed;
          upsertMonth(m).catch(() => {});
        }
        setData(m);
        setShowSelector(false);
      }
    } catch {
      showToast("লোড হয়নি, আবার চেষ্টা করুন");
    }
    setLoading(false);
  }

  async function selectYear(year: string) {
    if (!activePerson) return;
    setActiveYear(year);
    const key = makeKey(activeMonth, year);
    setActiveKey(key);
    setShowReport(false);
    setData(null);
    setLoading(true);
    try {
      const [m, months] = await Promise.all([
        getMonth(key, activePerson.id),
        getAllMonths(activePerson.id),
      ]);
      setAllMonths(months);
      if (m) {
        const computed = computeOpening(key, months);
        if (computed !== null && computed !== m.opening) {
          m.opening = computed;
          upsertMonth(m).catch(() => {});
        }
        setData(m);
        setShowSelector(false);
      }
    } catch {
      showToast("লোড হয়নি, আবার চেষ্টা করুন");
    }
    setLoading(false);
  }

  async function createMonth() {
    if (!activePerson) return;
    const key = makeKey(activeMonth, activeYear);
    const newMonth: MonthData = {
      person_id: activePerson.id,
      key,
      month: activeMonth,
      year: activeYear,
      opening: 0,
      incomes: [],
      expenses: [],
    };
    const merged = [...allMonths, newMonth].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    const computed = computeOpening(key, merged);
    if (computed !== null) newMonth.opening = computed;
    try {
      await upsertMonth(newMonth);
      const updated = await getAllMonths(activePerson.id);
      setAllMonths(updated);
      setData(newMonth);
      setActiveKey(key);
      setShowReport(false);
      setShowSelector(false);
    } catch {
      showToast("তৈরি হয়নি, আবার চেষ্টা করুন");
    }
  }

  function updateExpense(
    i: number,
    field: keyof Expense,
    value: string | number,
  ) {
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
    } catch {
      showToast("সংরক্ষণ হয়নি");
    }
  }

  async function addExpense() {
    if (!data || !activeKey || !activePerson || !newExpenseName.trim()) return;
    const name = newExpenseName.trim();
    if (data.expenses.some((e) => e.name.trim() === name)) {
      showToast("এই নামে খরচ আগে থেকেই আছে");
      return;
    }
    const updated = {
      ...data,
      expenses: [
        ...data.expenses,
        { name, amount: parseAmount(newExpenseAmount) },
      ],
    };
    setData(updated);
    setNewExpenseName("");
    setNewExpenseAmount("");
    window.history.back();
    try {
      await upsertMonth(updated);
      await addSuggestions([name]);
      const [months, sugs] = await Promise.all([
        getAllMonths(activePerson.id),
        getSuggestions(),
      ]);
      setAllMonths(months);
      setSuggestions([...sugs].sort((a, b) => a.localeCompare(b, "bn")));
      showToast("খরচ যোগ হয়েছে");
    } catch {
      showToast("সংরক্ষণ হয়নি");
    }
  }

  async function removeExpense(i: number) {
    if (!data || !activeKey) return;
    const updated = {
      ...data,
      expenses: data.expenses.filter((_, idx) => idx !== i),
    };
    setData(updated);
    try {
      await upsertMonth(updated);
      showToast("খরচ মুছে গেছে");
    } catch {
      showToast("মুছা হয়নি");
    }
  }

  async function addIncome() {
    if (!data || !activeKey || !newIncomeName.trim()) return;
    const name = newIncomeName.trim();
    if ((data.incomes || []).some((e) => e.name.trim() === name)) {
      showToast("এই নামে আয় আগে থেকেই আছে");
      return;
    }
    const updated = {
      ...data,
      incomes: [
        ...(data.incomes || []),
        { name, amount: parseAmount(newIncomeAmount) },
      ],
    };
    setData(updated);
    setNewIncomeName("");
    setNewIncomeAmount("");
    window.history.back();
    try {
      await upsertMonth(updated);
      await addIncomeSuggestions([name]);
      const sugs = await getIncomeSuggestions();
      setIncomeSuggestions([...sugs].sort((a, b) => a.localeCompare(b, "bn")));
      showToast("আয় যোগ হয়েছে");
    } catch {
      showToast("সংরক্ষণ হয়নি");
    }
  }

  async function saveIncomeEdit(i: number, name: string, amount: number) {
    if (!data) return;
    const incomes = [...(data.incomes || [])];
    incomes[i] = { name, amount };
    const updated = { ...data, incomes };
    setData(updated);
    try {
      await upsertMonth(updated);
      showToast("আয় আপডেট হয়েছে");
    } catch {
      showToast("সংরক্ষণ হয়নি");
    }
  }

  async function removeIncome(i: number) {
    if (!data || !activeKey) return;
    const updated = {
      ...data,
      incomes: (data.incomes || []).filter((_, idx) => idx !== i),
    };
    setData(updated);
    try {
      await upsertMonth(updated);
      showToast("আয় মুছে গেছে");
    } catch {
      showToast("মুছা হয়নি");
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const totalIncome = data
    ? (data.incomes || []).reduce((s, e) => s + (e.amount || 0), 0)
    : 0;
  const totalExpense = data
    ? data.expenses.reduce((s, e) => s + (e.amount || 0), 0)
    : 0;
  const balance = (data ? data.opening || 0 : 0) + totalIncome - totalExpense;

  const existsInDb = (month: string) =>
    allMonths.some((m) => m.month === month && m.year === activeYear);

  return (
    <div className="min-h-screen bg-stone-150 pb-20">
      {/* Header */}
      {!showReport && (
        <div className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 py-4 px-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-end gap-2">
              <Image
                src="/logo.svg"
                alt="হিসাব খাতা"
                width={36}
                height={36}
                className="w-9 h-9 shrink-0 block"
              />
              <h1 className="text-2xl font-extrabold tracking-tight text-blue-700 leading-none">
                হিসাব খাতা
              </h1>
            </div>
            {activePerson && (
              <button
                onClick={() => {
                  setShowSelector((v) => !v);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-right leading-tight"
              >
                <div className="text-sm font-bold text-gray-800">
                  {activePerson.name}
                </div>
                {activeKey && (
                  <span className="text-xs font-semibold text-gray-600">
                    {activeMonth} {activeYear}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`max-w-2xl mx-auto px-4 ${!showReport ? "pt-24" : "mt-5"}`}
      >
        {dbReady === false && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-lg">
            ⚠️ Supabase সংযোগ নেই। <strong>.env.local</strong> ফাইলে
            NEXT_PUBLIC_SUPABASE_URL ও NEXT_PUBLIC_SUPABASE_ANON_KEY দিন।
          </div>
        )}

        {/* Personnel selector */}
        {!showReport && showSelector && (
          <div className="flex gap-4 mb-5 overflow-x-auto p-2 -m-2">
            {people.map((p) => {
              const isActive = activePerson?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectPerson(p)}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white transition-all ${
                      isActive
                        ? "bg-blue-600 ring-4 ring-blue-200"
                        : "bg-gray-400"
                    }`}
                  >
                    {p.name.slice(0, 1)}
                  </div>
                  <span
                    className={`text-sm ${isActive ? "text-blue-600 font-bold" : "text-gray-400"}`}
                  >
                    {p.name}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setShowAddPerson(true)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-gray-500 text-gray-400 hover:border-blue-400 hover:text-blue-400">
                <Plus size={22} />
              </div>
              <span className="text-sm text-gray-400">নতুন</span>
            </button>
          </div>
        )}

        {/* No person selected */}
        {!showReport && showSelector && !activePerson && (
          <div className="text-center text-xl text-gray-400 py-12">
            উপরে ব্যক্তি বেছে নিন
          </div>
        )}

        {/* Navigation */}
        {!showReport && showSelector && activePerson && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            {/* Year selector */}
            <div className="flex gap-2 mb-3">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => selectYear(y)}
                  className={`px-4 py-2 rounded-xl text-base font-medium border transition-colors ${
                    y === activeYear
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
            {/* Month grid */}
            <div className="grid grid-cols-4 gap-2">
              {BANGLA_MONTHS.map((m) => {
                const isActive =
                  m === activeMonth && makeKey(m, activeYear) === activeKey;
                const hasData = existsInDb(m);
                return (
                  <button
                    key={m}
                    onClick={() => selectMonth(m)}
                    className={`py-2 px-1 rounded-xl text-base font-medium border transition-colors relative ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : hasData
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
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
        {loading && (
          <div className="flex justify-center items-center gap-2 py-10 text-gray-400 text-lg">
            <Loader2 className="animate-spin" size={24} /> লোড হচ্ছে...
          </div>
        )}

        {/* No month selected */}
        {!loading && showSelector && activePerson && !activeKey && (
          <div className="text-center text-xl text-gray-400 py-12">
            উপরে মাস বেছে নিন
          </div>
        )}

        {/* Month not in DB yet */}
        {!loading && activeKey && !data && !showReport && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-xl text-gray-500 mb-5">
              {activeMonth} {activeYear} এর কোনো হিসাব নেই
            </p>
            <button
              onClick={createMonth}
              className="text-xl px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
            >
              <Plus size={18} className="inline mr-1" />
              {activeMonth} {activeYear} তৈরি করুন
            </button>
          </div>
        )}

        {/* Editor / Report */}
        {!loading &&
          data &&
          (showReport ? (
            <ReportView data={data} onBack={() => setShowReport(false)} />
          ) : (
            <>
              {/* Previous balance */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
                <span className="text-base text-blue-700 font-medium">
                  গত মাসের ব্যালেন্স
                </span>
                <span className="text-lg font-bold text-blue-700">
                  ৳{(data.opening || 0).toLocaleString("bn-BD")}
                </span>
              </div>

              {/* Income */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-600" />
                  আয়
                </h2>
                {(data.incomes || []).map((e, i) => (
                  <ExpenseRow
                    key={i}
                    index={i}
                    expense={e}
                    suggestions={[]}
                    onChange={() => {}}
                    onSave={saveIncomeEdit}
                    onRemove={removeIncome}
                  />
                ))}
              </div>

              {/* Expenses */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-blue-600" />
                  খরচ
                </h2>
                {data.expenses.map((e, i) => (
                  <ExpenseRow
                    key={i}
                    index={i}
                    expense={e}
                    suggestions={suggestions}
                    onChange={updateExpense}
                    onSave={saveExpenseEdit}
                    onRemove={removeExpense}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <SRow
                  label="গত মাসের ব্যালেন্স"
                  value={fmtBDT(data.opening || 0)}
                />
                <SRow label="মোট আয়" value={fmtBDT(totalIncome)} />
                <SRow
                  label="মোট (ব্যালেন্স + আয়)"
                  value={fmtBDT((data.opening || 0) + totalIncome)}
                  bold
                />
                <SRow label="মোট খরচ" value={fmtBDT(totalExpense)} bold />
                <div
                  className={`flex justify-between mt-3 pt-3 border-t-2 border-gray-200 text-2xl font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}
                >
                  <span>ব্যালেন্স</span>
                  <span>{fmtBDT(balance)}</span>
                </div>
              </div>

              {/* Bottom action bar */}
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
                <div className="max-w-2xl mx-auto flex items-stretch">
                  <button
                    onClick={() => setShowAddIncome(true)}
                    className="flex-1 py-6 bg-green-600 text-white font-bold hover:bg-green-700 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={20} />
                    আয়
                  </button>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="flex-1 py-6 bg-red-600 text-white font-bold hover:bg-red-700 flex items-center justify-center gap-1.5"
                  >
                    <Minus size={20} />
                    খরচ
                  </button>
                  <button
                    onClick={() => setShowReport(true)}
                    className="flex-1 text-sm py-6 bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5"
                  >
                    <FileText size={16} />
                    রিপোর্ট
                  </button>
                </div>
              </div>
            </>
          ))}
      </div>

      {/* Add person modal */}
      {showAddPerson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (!addingPerson) window.history.back();
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">নতুন ব্যক্তি যোগ করুন</h3>
            <div className="mb-5">
              <label className="text-base text-gray-500 block mb-1">নাম</label>
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="যেমন: রাহাত"
                disabled={addingPerson}
                className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => window.history.back()}
                disabled={addingPerson}
                className="px-5 py-3 rounded-xl border border-gray-200 text-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                বাতিল
              </button>
              <button
                onClick={handleAddPerson}
                disabled={!newPersonName.trim() || addingPerson}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
              >
                {addingPerson && <Loader2 size={18} className="animate-spin" />}
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add income modal */}
      {showAddIncome && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 px-4"
          onClick={() => window.history.back()}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold">নতুন আয় যোগ করুন</h3>
              <span className="text-sm text-gray-400">{activePerson?.name}</span>{" "}
              <span className="text-xs text-gray-400">
                · {activeMonth} {activeYear}
              </span>
            </div>
            <div className="mb-3">
              <label className="text-base text-gray-500 block mb-1">
                আয়ের নাম
              </label>
              <input
                type="text"
                value={newIncomeName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewIncomeName(val);
                  const f =
                    val.length > 0
                      ? incomeSuggestions.filter((s) => s.includes(val))
                      : incomeSuggestions;
                  setIncomeSugFiltered(f);
                  setShowIncomeSug(f.length > 0);
                }}
                onFocus={() => {
                  setIncomeSugFiltered(incomeSuggestions);
                  setShowIncomeSug(true);
                }}
                placeholder="যেমন: ভাড়া"
                className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              {showIncomeSug && (
                <ul className="border border-gray-200 rounded-xl mt-1 overflow-y-auto">
                  {incomeSugFiltered.map((s) => (
                    <li
                      key={s}
                      onMouseDown={() => {
                        setNewIncomeName(s);
                        setShowIncomeSug(false);
                      }}
                      className="px-4 py-3 text-xl cursor-pointer hover:bg-green-50 hover:text-green-700"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mb-5">
              <label className="text-base text-gray-500 block mb-1">
                টাকার পরিমাণ
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={newIncomeAmount}
                onChange={(e) => setNewIncomeAmount(e.target.value)}
                placeholder="০"
                className="w-full text-xl px-4 py-3 rounded-xl border border-gray-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => window.history.back()}
                className="px-5 py-3 rounded-xl border border-gray-200 text-lg text-gray-600 hover:bg-gray-50"
              >
                বাতিল
              </button>
              <button
                onClick={addIncome}
                disabled={
                  !newIncomeName.trim() || parseAmount(newIncomeAmount) <= 0
                }
                className="px-5 py-3 rounded-xl bg-green-600 text-white text-lg font-bold hover:bg-green-700 disabled:opacity-40"
              >
                যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add expense modal */}
      {showAddExpense && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 px-4"
          onClick={() => window.history.back()}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold">নতুন খরচ যোগ করুন</h3>
              <span className="text-sm text-gray-400">{activePerson?.name}</span>{" "}
              <span className="text-xs text-gray-400">
                · {activeMonth} {activeYear}
              </span>
            </div>

            <div className="mb-3">
              <label className="text-base text-gray-500 block mb-1">
                খরচের নাম
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newExpenseName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewExpenseName(val);
                    const f = (
                      val.length > 0
                        ? suggestions.filter((s) =>
                            s.toLowerCase().includes(val.toLowerCase()),
                          )
                        : suggestions
                    )
                      .sort((a, b) => a.localeCompare(b, "bn"))
                      .slice(0, 8);
                    setAddSugFiltered(f);
                    setShowAddSug(f.length > 0);
                  }}
                  onFocus={() => {
                    const f =
                      newExpenseName.length > 0
                        ? suggestions
                            .filter((s) =>
                              s
                                .toLowerCase()
                                .includes(newExpenseName.toLowerCase()),
                            )
                            .slice(0, 8)
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
                      <li
                        key={s}
                        onMouseDown={() => {
                          setNewExpenseName(s);
                          setShowAddSug(false);
                        }}
                        className="px-4 py-3 text-xl cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-base text-gray-500 block mb-1">
                টাকার পরিমাণ
              </label>
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
              <button
                onClick={() => window.history.back()}
                className="px-5 py-3 rounded-xl border border-gray-200 text-lg text-gray-600 hover:bg-gray-50"
              >
                বাতিল
              </button>
              <button
                onClick={addExpense}
                disabled={
                  !newExpenseName.trim() || parseAmount(newExpenseAmount) <= 0
                }
                className="px-5 py-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:opacity-40"
              >
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

function SRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-2 text-lg border-b border-gray-100 ${bold ? "font-bold" : ""}`}
    >
      <span className={bold ? "" : "text-gray-500"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
