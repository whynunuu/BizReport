@echo off
title Kirim Laporan Harian AI CRM & Leads ke Telegram
cd /d "%~dp0"
echo ==========================================================
echo    MENGIRIM LAPORAN AI CRM & LEADS KE TELEGRAM (@NunuFxBot)
echo ==========================================================
echo.
python telegram_crm_notifier.py
echo.
echo Selesai!
timeout /t 5 >nul
