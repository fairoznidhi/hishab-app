import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ---------- Types ----------
export interface Expense {
  name: string;
  amount: number;
}

export interface Income {
  name: string;
  amount: number;
}

export interface MonthData {
  id?: number;
  person_id: number;
  key: string;       // e.g. "2026_জুন"
  month: string;
  year: string;
  opening: number;
  incomes: Income[];
  expenses: Expense[];
}

export interface Person {
  id: number;
  name: string;
  color: string;
}

// ---------- Helpers ----------
export const BANGLA_MONTHS = [
  "জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর",
];

export const ENGLISH_MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

export const DEFAULT_SUGGESTIONS = [
  "সামিয়া আপু","রিপন","মনির","বোয়া","গাড়ি ভাড়া","গাড়ি তেল",
  "ডলার","বিদ্যুৎ ও গাস","বিকাশ","পাউডার","মরুগি সদগা","কোরআন খতম + সদগা",
];

export function makeKey(month: string, year: string) {
  const idx = BANGLA_MONTHS.indexOf(month);
  const engMonth = idx >= 0 ? ENGLISH_MONTHS[idx] : month.toLowerCase();
  return `${year}_${engMonth}`;
}

export function fmtBDT(n: number) {
  return Math.round(n).toLocaleString("bn-BD") + " টাকা";
}

export function parseAmount(val: string): number {
  const normalized = val.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  return parseFloat(normalized) || 0;
}

export const PERSON_COLORS = [
  "bg-gray-500", "bg-gray-500", "bg-gray-500",
  "bg-gray-500", "bg-gray-500", "bg-gray-500",
];

// ---------- DB functions (called directly from React, no backend) ----------

export async function getPeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addPerson(name: string, color: string): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllMonths(personId: number): Promise<MonthData[]> {
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .eq("person_id", personId)
    .order("key", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getMonth(key: string, personId: number): Promise<MonthData | null> {
  const { data, error } = await supabase
    .from("months")
    .select("*")
    .eq("key", key)
    .eq("person_id", personId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function upsertMonth(m: MonthData): Promise<void> {
  const payload = {
    person_id: m.person_id,
    key: m.key,
    month: m.month,
    year: m.year,
    opening: m.opening,
    incomes: m.incomes,
    expenses: m.expenses,
  };

  if (m.id) {
    const { error } = await supabase.from("months").update(payload).eq("id", m.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("months").upsert(payload, { onConflict: "person_id,key" });
    if (error) throw error;
  }
}

export async function deleteMonthByKey(key: string, personId: number): Promise<void> {
  const { error } = await supabase.from("months").delete().eq("key", key).eq("person_id", personId);
  if (error) throw error;
}

export async function getSuggestions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("suggestions")
    .select("name")
    .order("name");
  if (error) throw error;
  return data ? data.map((r: { name: string }) => r.name) : [];
}

export async function addSuggestions(names: string[]): Promise<void> {
  const rows = names.filter(Boolean).map((name) => ({ name }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("suggestions").upsert(rows, { onConflict: "name", ignoreDuplicates: true });
  if (error) throw error;
}
