"use client";
import { useRef } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { MonthData, fmtBDT } from "@/lib/supabase";

export default function ReportView({ data, onBack }: { data: MonthData; onBack: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const totalIncome = (data.opening || 0) + (data.rental || 0) + (data.other_income || 0);
  const totalExpense = (data.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  async function handleDownload() {
    if (!printRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(printRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // if content fits in one page place it; otherwise scale to fit
    const finalH = imgH > pageH ? pageH : imgH;
    const finalW = imgH > pageH ? (pageW * pageH) / imgH : pageW;
    const offsetX = (pageW - finalW) / 2;

    pdf.addImage(imgData, "PNG", offsetX, 0, finalW, finalH);
    pdf.save(`hishab-${data.year}-${data.month}.pdf`);
  }

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-2 text-xl px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50">
          <ArrowLeft size={20} /> ফিরে যান
        </button>
        <button onClick={handleDownload} className="flex items-center gap-2 text-xl px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">
          <Download size={20} /> ডাউনলোড করুন
        </button>
      </div>

      {/* On-screen preview card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center">{data.month} {data.year}</h2>
        <p className="text-center text-gray-400 mb-6">মাসিক হিসাব</p>

        <p className="text-lg font-bold text-blue-700 mb-2">আয়:</p>
        <Row label="ওপেনিং বালেন্স" value={fmtBDT(data.opening || 0)} />
        {data.rental > 0 && <Row label="ভাড়া" value={fmtBDT(data.rental)} />}
        {data.other_income > 0 && <Row label="অন্যান্য আয়" value={fmtBDT(data.other_income)} />}
        <Row label="মোট" value={fmtBDT(totalIncome)} bold />

        <div className="my-4 border-t border-dashed border-gray-300" />

        <p className="text-lg font-bold text-red-700 mb-2">খরচ:</p>
        {(data.expenses || []).map((e, i) => (
          <Row key={i} label={e.name || "—"} value={fmtBDT(e.amount)} />
        ))}
        {data.expenses.length === 0 && <p className="text-gray-400 text-lg">কোনো খরচ নেই</p>}
        <Row label="মোট খরচ" value={fmtBDT(totalExpense)} bold />

        <div className={`flex justify-between mt-4 pt-4 border-t-2 border-gray-300 text-2xl font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}>
          <span>বালেন্স</span>
          <span>{fmtBDT(balance)}</span>
        </div>
      </div>

      {/* Hidden A4 layout captured for PDF — not visible to user */}
      <div
        ref={printRef}
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "794px",        // A4 at 96dpi
          minHeight: "1123px",
          backgroundColor: "#ffffff",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          padding: "48px 56px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827", marginBottom: "6px" }}>
            {data.month} {data.year}
          </div>
          <div style={{ fontSize: "15px", color: "#6b7280" }}>মাসিক হিসাব</div>
        </div>

        {/* Income section */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#1d4ed8", marginBottom: "10px", paddingBottom: "6px", borderBottom: "2px solid #bfdbfe" }}>
            আয়
          </div>
          <PDFRow label="ওপেনিং বালেন্স" value={fmtBDT(data.opening || 0)} />
          {data.rental > 0 && <PDFRow label="ভাড়া" value={fmtBDT(data.rental)} />}
          {data.other_income > 0 && <PDFRow label="অন্যান্য আয়" value={fmtBDT(data.other_income)} />}
          <PDFRow label="মোট আয়" value={fmtBDT(totalIncome)} total />
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px dashed #d1d5db", marginBottom: "28px" }} />

        {/* Expenses section */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#b91c1c", marginBottom: "10px", paddingBottom: "6px", borderBottom: "2px solid #fecaca" }}>
            খরচ
          </div>
          {data.expenses.length === 0
            ? <div style={{ color: "#9ca3af", fontSize: "14px" }}>কোনো খরচ নেই</div>
            : data.expenses.map((e, i) => <PDFRow key={i} label={e.name || "—"} value={fmtBDT(e.amount)} />)
          }
          <PDFRow label="মোট খরচ" value={fmtBDT(totalExpense)} total />
        </div>

        {/* Balance */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderRadius: "10px",
          backgroundColor: balance >= 0 ? "#f0fdf4" : "#fff1f2",
          border: `2px solid ${balance >= 0 ? "#22c55e" : "#f43f5e"}`,
          marginTop: "8px",
        }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: balance >= 0 ? "#15803d" : "#be123c" }}>বালেন্স</span>
          <span style={{ fontSize: "20px", fontWeight: "700", color: balance >= 0 ? "#15803d" : "#be123c" }}>{fmtBDT(balance)}</span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "48px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>{new Date().toLocaleDateString("bn-BD")}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-lg py-1 ${bold ? "font-bold border-t border-gray-100 mt-1 pt-2" : ""}`}>
      <span className={bold ? "" : "text-gray-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PDFRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: total ? "10px 0 4px 0" : "8px 0",
      borderTop: total ? "1px solid #e5e7eb" : "none",
      marginTop: total ? "6px" : "0",
      fontWeight: total ? "700" : "400",
      fontSize: "15px",
      color: total ? "#111827" : "#374151",
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
