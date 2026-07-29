param(
  [int]$Port = 10004,
  [string]$BindHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$webRoot = Join-Path $repoRoot "apps\web"
$nextCli = Join-Path $repoRoot "node_modules\next\dist\bin\next"
$stateDir = Join-Path $repoRoot "work"
$logDir = Join-Path $repoRoot "logs"
$statePath = Join-Path $stateDir "fweecv-windows-dev.json"
$stdoutPath = Join-Path $logDir "fweecv-windows-dev.out.log"
$stderrPath = Join-Path $logDir "fweecv-windows-dev.err.log"

if (-not (Test-Path -LiteralPath $nextCli)) {
  throw "Next.js is not installed. Run npm run bootstrap from the repository root."
}

if (Test-Path -LiteralPath $statePath) {
  $existingState = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
  $existingProcess = Get-Process -Id ([int]$existingState.pid) -ErrorAction SilentlyContinue
  if ($existingProcess) {
    if (
      [int]$existingState.port -ne $Port -or
      [string]$existingState.bindHost -ne $BindHost
    ) {
      throw "A tracked server is already running at http://$($existingState.bindHost):$($existingState.port)."
    }
    Write-Output "MuhFweeCeeVee Windows dev server is already running (PID $($existingState.pid))."
    Write-Output "URL: http://$($existingState.bindHost):$($existingState.port)"
    exit 0
  }
  Remove-Item -LiteralPath $statePath -Force
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  $ownerIds = ($listener | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
  throw "Port $Port is already in use by PID(s) $ownerIds. Refusing to stop an untracked process."
}

New-Item -ItemType Directory -Force -Path $stateDir, $logDir | Out-Null

$nodePath = (Get-Command node -ErrorAction Stop).Source
$process = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @($nextCli, "dev", "--webpack", "-p", "$Port", "-H", $BindHost) `
  -WorkingDirectory $webRoot `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath `
  -WindowStyle Hidden `
  -PassThru

@{
  pid = $process.Id
  port = $Port
  bindHost = $BindHost
  repoRoot = $repoRoot
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8

$healthUrl = "http://${BindHost}:$Port/api/health"
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
  if ($process.HasExited) {
    Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
    throw "Windows dev server exited during startup. See $stderrPath"
  }
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
    if ($health.ok -eq $true) {
      Write-Output "MuhFweeCeeVee Windows dev server started (PID $($process.Id))."
      Write-Output "URL: http://${BindHost}:$Port"
      Write-Output "Logs: $stdoutPath and $stderrPath"
      exit 0
    }
  } catch {
    Start-Sleep -Milliseconds 750
  }
}

& (Join-Path $PSScriptRoot "stop-dev.ps1")
throw "Windows dev server did not become healthy within 90 seconds. See $stderrPath"
