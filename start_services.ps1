# Launch live FastAPI backend and Vite dev server detached via WMI
Set-Location "C:\Users\Dina\GIOS"

$pythonExe = "C:\Users\Dina\AppData\Local\Programs\Python\Python313\python.exe"
$scriptPath = "C:\Users\Dina\GIOS\start_persistent_services.py"

Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = "$pythonExe $scriptPath"
    CurrentDirectory = "C:\Users\Dina\GIOS"
} | Out-Null

Start-Sleep -Seconds 6

Get-NetTCPConnection -LocalPort 8000, 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess
