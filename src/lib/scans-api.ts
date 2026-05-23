import { supabase } from "@/integrations/supabase/client";
import type { ScanResult } from "@/lib/scanner";
import { getRecommendations } from "@/lib/scanner";

export interface SavedScan {
  id: string;
  user_id: string;
  input_text: string;
  input_char_count: number;
  risk_score: number;
  status: string;
  created_at: string;
}

export interface SavedSummary {
  scan_id: string;
  direct_count: number;
  indirect_count: number;
  correlation_count: number;
  social_count: number;
  total_findings: number;
}

export async function saveScan(userId: string, inputText: string, result: ScanResult) {
  const { data: scan, error: scanErr } = await supabase
    .from("scans")
    .insert({
      user_id: userId,
      input_text: inputText,
      input_char_count: inputText.length,
      risk_score: result.score,
      status: "completed",
    })
    .select()
    .single();
  if (scanErr) throw scanErr;

  const scanId = scan.id as string;

  if (result.findings.length > 0) {
    const { error } = await supabase.from("findings").insert(
      result.findings.map((f) => ({
        scan_id: scanId,
        user_id: userId,
        type: f.type,
        category: f.category,
        masked_value: f.maskedValue,
        risk_level: f.riskLevel,
        position_start: f.start,
        position_end: f.end,
      }))
    );
    if (error) throw error;
  }

  const recs = getRecommendations(result);
  const priorityFor = (r: string) =>
    /\bHIGH\b/.test(r) ? "high" : /Remove|Mask|Never/.test(r) ? "high" : "medium";
  if (recs.length > 0) {
    const { error } = await supabase.from("recommendations").insert(
      recs.map((r) => ({
        scan_id: scanId,
        user_id: userId,
        title: r.split(" — ")[0].slice(0, 80),
        description: r,
        priority: priorityFor(r),
      }))
    );
    if (error) throw error;
  }

  const { error: sumErr } = await supabase.from("scan_summaries").insert({
    scan_id: scanId,
    direct_count: result.counts.direct,
    indirect_count: result.counts.indirect,
    correlation_count: result.counts.correlation,
    social_count: result.counts.social,
    total_findings: result.totalFound,
  });
  if (sumErr) throw sumErr;

  return scan as SavedScan;
}

export async function listScans(userId: string) {
  const { data, error } = await supabase
    .from("scans")
    .select("*, scan_summaries(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getScanDetail(scanId: string) {
  const [{ data: scan, error: e1 }, { data: findings, error: e2 }, { data: recs, error: e3 }, { data: summary, error: e4 }] =
    await Promise.all([
      supabase.from("scans").select("*").eq("id", scanId).single(),
      supabase.from("findings").select("*").eq("scan_id", scanId).order("position_start"),
      supabase.from("recommendations").select("*").eq("scan_id", scanId),
      supabase.from("scan_summaries").select("*").eq("scan_id", scanId).maybeSingle(),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (e4) throw e4;
  return { scan, findings: findings ?? [], recommendations: recs ?? [], summary };
}

export async function deleteScan(scanId: string) {
  const { error } = await supabase.from("scans").delete().eq("id", scanId);
  if (error) throw error;
}
