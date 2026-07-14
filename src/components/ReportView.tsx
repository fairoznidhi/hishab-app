"use client";
import { useEffect, useRef } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { MonthData, fmtBDT } from "@/lib/supabase";

export default function ReportView({
  data,
  onBack,
}: {
  data: MonthData;
  onBack: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    window.history.pushState({ report: true }, "");
    const handlePopState = () => onBack();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalIncome = (data.incomes || []).reduce(
    (s, e) => s + (e.amount || 0),
    0,
  );
  const totalExpense = (data.expenses || []).reduce(
    (s, e) => s + (e.amount || 0),
    0,
  );
  const balance = (data.opening || 0) + totalIncome - totalExpense;

  async function handleDownload() {
    if (!printRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const el = printRef.current;
    const prev = el.style.width;
    el.style.width = "600px";
    const canvas = await html2canvas(el, {
      scale: 4,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    el.style.width = prev;

    const link = document.createElement("a");
    link.download = `hishab-${data.year}-${data.month}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }

  return (
    <div className="pb-12">
      <div>
        <button
          onClick={() => window.history.back()}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 text-lg px-5 py-4 rounded-full border border-gray-300 bg-white shadow-xl hover:bg-gray-50"
        >
          <ArrowLeft size={20} /> ফিরে যান
        </button>
        <button
          onClick={handleDownload}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center gap-2 text-lg px-5 py-4 rounded-full bg-blue-600 text-white font-bold shadow-xl hover:bg-blue-700"
        >
          <Download size={20} /> ডাউনলোড
        </button>
      </div>

      <div
        ref={printRef}
        className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md mx-auto"
      >
        <h2 className="text-2xl font-bold text-center">
          {data.month} {data.year}
        </h2>
        <p className="text-center text-gray-400 mb-6">মাসিক হিসাব</p>

        <p className="text-lg font-bold text-blue-700 mb-2">আয়:</p>
        <Row label="গত মাসের ব্যালেন্স" value={fmtBDT(data.opening || 0)} />
        {(data.incomes || []).map((e, i) => (
          <Row key={i} label={e.name} value={fmtBDT(e.amount)} />
        ))}
        <Row
          label="মোট"
          value={fmtBDT((data.opening || 0) + totalIncome)}
          bold
        />

        <div className="my-4 border-t border-dashed border-gray-300" />

        <p className="text-lg font-bold text-red-700 mb-2">খরচ:</p>
        {(data.expenses || []).map((e, i) => (
          <Row key={i} label={e.name || "—"} value={fmtBDT(e.amount)} />
        ))}
        {data.expenses.length === 0 && (
          <p className="text-gray-400 text-lg">কোনো খরচ নেই</p>
        )}
        <Row label="মোট খরচ" value={fmtBDT(totalExpense)} bold />

        <div
          className={`flex justify-between mt-4 pt-4 border-t-2 border-gray-300 text-2xl font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}
        >
          <span>বালেন্স</span>
          <span>{fmtBDT(balance)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({
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
      className={`flex justify-between text-lg py-1 ${bold ? "font-bold border-t border-gray-100 mt-1 pt-2" : ""}`}
    >
      <span className={bold ? "" : "text-gray-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
