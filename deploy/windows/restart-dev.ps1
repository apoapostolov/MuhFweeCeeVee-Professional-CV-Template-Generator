param(
  [int]$Port = 10004,
  [string]$BindHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "stop-dev.ps1")
& (Join-Path $PSScriptRoot "start-dev.ps1") -Port $Port -BindHost $BindHost
