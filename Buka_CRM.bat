@echo off
title Foxe Studio - WhatsApp AI CRM

echo Memeriksa status server lokal...
netstat -ano | findstr ":3000" >nul
if %errorlevel% neq 0 (
    echo Menjalankan server lokal Foxe Studio...
    start "Foxe Studio Server" /min cmd /c "cd /d ""%~dp0"" && npm start"
    ping 127.0.0.1 -n 3 >nul
)

echo Membuka WhatsApp AI CRM di browser...
start "" "http://localhost:3000/crm"
exit
