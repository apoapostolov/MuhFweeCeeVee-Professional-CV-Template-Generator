$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$statePath = Join-Path $repoRoot "work\fweecv-windows-dev.json"

if (-not (Test-Path -LiteralPath $statePath)) {
  Write-Output "No tracked MuhFweeCeeVee Windows dev server is running."
  exit 0
}

$state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
$rootPid = [int]$state.pid
$processes = @(Get-CimInstance Win32_Process)
$rootProcess = $processes | Where-Object { $_.ProcessId -eq $rootPid }

if (-not $rootProcess) {
  Remove-Item -LiteralPath $statePath -Force
  Write-Output "Removed stale Windows dev-server state."
  exit 0
}

$expectedNextPath = Join-Path $repoRoot "node_modules\next\dist\bin\next"
if (-not $rootProcess.CommandLine.Contains($expectedNextPath)) {
  throw "Tracked PID $rootPid is no longer this repository's Next.js process. Refusing to stop it."
}

$targetIds = [System.Collections.Generic.List[int]]::new()
$pendingIds = [System.Collections.Generic.Queue[int]]::new()
$pendingIds.Enqueue($rootPid)
while ($pendingIds.Count -gt 0) {
  $parentId = $pendingIds.Dequeue()
  $children = $processes | Where-Object { $_.ParentProcessId -eq $parentId }
  foreach ($child in $children) {
    $pendingIds.Enqueue([int]$child.ProcessId)
    $targetIds.Add([int]$child.ProcessId)
  }
}

for ($index = $targetIds.Count - 1; $index -ge 0; $index--) {
  Stop-Process -Id $targetIds[$index] -Force -ErrorAction SilentlyContinue
}
Stop-Process -Id $rootPid -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $statePath -Force
Write-Output "Stopped MuhFweeCeeVee Windows dev server (PID $rootPid)."
