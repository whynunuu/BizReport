"""
=============================================================================
Foxe Studio — Telegram AI CRM & Lead Conversion Daily Reporter
=============================================================================
Modul pelaporan otomatis harian untuk metrik AI CRM, konversi leads, 
performa shift CS (Admin 1 & Admin 2), dan status antrean raw files ke Telegram.
Terkoneksi via Bot: @NunuFxBot ke Owner Telegram ID: 1608969830
=============================================================================
"""

import os
import sys
import json
import urllib.request
import urllib.parse
import datetime

DEFAULT_TOKEN = "8809193335:AAER1t9MAnVSyIRJSWqHpFwaoFe4hYmcZ1s"
DEFAULT_CHAT_ID = 1608969830

BASE_APP_URL = "https://foxe-studio-id.vercel.app"
STATS_ENDPOINT = f"{BASE_APP_URL}/api/reports/stats"
JOBS_ENDPOINT = f"{BASE_APP_URL}/api/raw-files/jobs"

def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FoxeCRM-Reporter/1.0"})
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"[WARN] Gagal mengambil data dari {url}: {e}")
        return None

def format_rupiah(val):
    try:
        n = int(round(float(val)))
        return f"Rp {n:,.0f}".replace(",", ".")
    except Exception:
        return "Rp 0"

def build_crm_telegram_message():
    # 1. Ambil data analitik live dari API Vercel
    stats_res = fetch_json(STATS_ENDPOINT) or {}
    jobs_res = fetch_json(JOBS_ENDPOINT) or {}

    stats_data = stats_res.get("data", {})
    conversion_kpi = stats_data.get("conversionKpi", {})
    cs_perf = conversion_kpi.get("csPerformance", [])
    reminders = conversion_kpi.get("reminders", [])

    total_leads = conversion_kpi.get("totalLeads", 0)
    converted_leads = conversion_kpi.get("convertedLeads", 0)
    conversion_rate = conversion_kpi.get("conversionRate", 0)
    total_rev = conversion_kpi.get("totalConvertedRevenue", 0)

    jobs_stats = jobs_res.get("stats", {})
    total_jobs = jobs_stats.get("total", 0)
    kilat_jobs = jobs_stats.get("kilatCount", 0)
    ready_jobs = jobs_stats.get("readyToSend", 0)
    editing_jobs = jobs_stats.get("editingCount", 0)

    # 2. Waktu WIB sekarang
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    wib_time = now_utc + datetime.timedelta(hours=7)
    date_str = wib_time.strftime("%d %b %Y")
    time_str = wib_time.strftime("%H:%M WIB")

    # 3. Ekstraksi performa Admin 1 & Admin 2
    admin1 = {"handled": 0, "converted": 0, "rate": 0, "rev": 0}
    admin2 = {"handled": 0, "converted": 0, "rate": 0, "rev": 0}

    for cs in cs_perf:
        name = cs.get("adminName", "")
        if "1" in name or "09:00" in name:
            admin1["handled"] = cs.get("handledLeads", 0)
            admin1["converted"] = cs.get("convertedLeads", 0)
            admin1["rate"] = cs.get("conversionRate", 0)
            admin1["rev"] = cs.get("totalRevenue", 0)
        elif "2" in name or "15:00" in name:
            admin2["handled"] = cs.get("handledLeads", 0)
            admin2["converted"] = cs.get("convertedLeads", 0)
            admin2["rate"] = cs.get("conversionRate", 0)
            admin2["rev"] = cs.get("totalRevenue", 0)

    # 4. Susun Pesan HTML Telegram
    msg = []
    msg.append("🤖 <b>FOXE STUDIO — LAPORAN HARIAN AI CRM & LEADS</b>")
    msg.append(f"<i>Closing Shift Malam • {date_str} ({time_str})</i>")
    msg.append("━━━━━━━━━━━━━━━━━━━━━━━━━")
    msg.append("")
    msg.append("📥 <b>RINGKASAN LEADS & KONVERSI</b>")
    msg.append(f"• Total Leads Masuk   : <b>{total_leads} Leads</b>")
    msg.append(f"• Booking Terkonfirmasi: <b>{converted_leads} Klien</b>")
    msg.append(f"• Closing Rate Global  : <b>{conversion_rate}%</b>")
    msg.append(f"• Omzet Terverifikasi  : <b>{format_rupiah(total_rev)}</b>")
    msg.append("")
    msg.append("👥 <b>PERFORMA CS PER SHIFT (COUNTABLE)</b>")
    msg.append(f"☀️ <b>Admin 1 (09:00 - 15:00 WIB)</b>")
    msg.append(f"  └ Tangani: <b>{admin1['handled']}</b> | Closing: <b>{admin1['converted']} ({admin1['rate']}%)</b> | Omzet: <b>{format_rupiah(admin1['rev'])}</b>")
    msg.append(f"🌙 <b>Admin 2 (15:00 - 21:00 WIB)</b>")
    msg.append(f"  └ Tangani: <b>{admin2['handled']}</b> | Closing: <b>{admin2['converted']} ({admin2['rate']}%)</b> | Omzet: <b>{format_rupiah(admin2['rev'])}</b>")
    msg.append("")
    msg.append("📁 <b>STATUS ANTREAN FOTO MENTAH (RAW FILES)</b>")
    msg.append(f"• Total Job Aktif   : <b>{total_jobs} Sesi</b>")
    msg.append(f"• Siap Dikirim (WA) : <b>{ready_jobs} Job</b>")
    msg.append(f"• Sedang Diedit     : <b>{editing_jobs} Job</b>")
    msg.append(f"• Prioritas Kilat   : <b>{kilat_jobs} Job (24H)</b>")
    msg.append("")

    if reminders and len(reminders) > 0:
        msg.append("⚠️ <b>ACTION REQUIRED CS (PERLU RESPON):</b>")
        for r in reminders[:3]:
            c_name = r.get("name", "Customer")
            c_rev = format_rupiah(r.get("revenue", 0))
            c_admin = r.get("assignedAdmin", "CS")
            msg.append(f"• <b>{c_name}</b> ({c_rev}) - <i>{c_admin}</i>")
        msg.append("")
    else:
        msg.append("✅ <i>Semua bukti bayar & reminder follow up hari ini telah beres.</i>")
        msg.append("")

    msg.append("━━━━━━━━━━━━━━━━━━━━━━━━━")
    msg.append("🔗 <b>PORTAL MANAJEMEN LIVE:</b>")
    msg.append(f"• <a href='{BASE_APP_URL}/crm'>Buka WhatsApp AI CRM</a>")
    msg.append(f"• <a href='{BASE_APP_URL}/dashboard'>Buka Dashboard Owner & KPI</a>")
    msg.append(f"• <a href='{BASE_APP_URL}/raw-files'>Pusat Antrean File Mentah</a>")
    msg.append(f"• <a href='https://docs.google.com/spreadsheets/d/11a5G5Dk18s_VgJ9pkFMhC6XJ6KwTq67CNcrDJlmqLwI/edit'>Buka Google Sheet Leads 2026</a>")

    return "\n".join(msg)

def trigger_google_sheets_sync():
    """Otomatis memicu sinkronisasi batch seluruh leads ke Google Sheets"""
    try:
        url = f"{BASE_APP_URL}/api/crm/sync-google-sheets"
        req = urllib.request.Request(
            url,
            data=b"{}",
            headers={
                "User-Agent": "FoxeCRM-Reporter/1.0",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print(f"[OK] Google Sheets Auto-Sync: {res_data.get('message', 'Sukses')}")
    except Exception as e:
        print(f"[WARN] Google Sheets Auto-Sync dilewati/gagal: {e}")

def trigger_log_order_ingestion():
    """Trigger Google Apps Script Log Order reader via CRM API (backup trigger)"""
    try:
        url = f"{BASE_APP_URL}/api/crm/sync-log-order"
        req = urllib.request.Request(
            url,
            data=b"{}",
            headers={
                "User-Agent": "FoxeCRM-Reporter/1.0",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print(f"[OK] Log Order Sync: {res_data.get('message', 'Sukses')}")
    except Exception as e:
        print(f"[WARN] Log Order Sync dilewati/gagal: {e}")

def send_telegram_crm_report(token=DEFAULT_TOKEN, chat_id=DEFAULT_CHAT_ID):
    # 0a. Sinkronisasi Log Order kasir (dari JSON statis yang sudah ada)
    trigger_log_order_ingestion()

    # 0b. Memicu sinkronisasi harian ke Google Sheets secara otomatis
    trigger_google_sheets_sync()

    text = build_crm_telegram_message()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }
    data = urllib.parse.urlencode(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "FoxeCRM-Reporter/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            if res_data.get("ok"):
                print(f"[OK] Laporan AI CRM & Leads berhasil dikirim ke Telegram (Chat ID: {chat_id})!")
                return True
            else:
                print(f"[ERROR] Respons error dari Telegram API: {res_data}")
                return False
    except Exception as e:
        print(f"[ERROR] Gagal mengirim pesan ke Telegram: {e}")
        return False

if __name__ == "__main__":
    send_telegram_crm_report()

