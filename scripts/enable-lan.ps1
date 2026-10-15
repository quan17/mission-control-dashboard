#Requires -RunAsAdministrator
param([Parameter(Mandatory=$true)][string]$LocalAddress)
$ErrorActionPreference='Stop'
$taskParsedAddress=[System.Net.IPAddress]::Parse($LocalAddress)
if ($taskParsedAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or $LocalAddress -notmatch '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)') { throw 'Only an RFC1918 local IPv4 address is allowed.' }
if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress $LocalAddress -ErrorAction SilentlyContinue)) { throw 'The chosen address is not assigned to this computer.' }
$taskRuleName='Mission Control LAN 4317'
$taskExisting=Get-NetFirewallRule -DisplayName $taskRuleName -ErrorAction SilentlyContinue
if ($taskExisting) {
  $taskPorts=$taskExisting | Get-NetFirewallPortFilter
  $taskAddresses=$taskExisting | Get-NetFirewallAddressFilter
  if ($taskPorts.LocalPort -ne '4317' -or $taskAddresses.RemoteAddress -ne 'LocalSubnet' -or $taskAddresses.LocalAddress -ne $LocalAddress) { throw 'An existing rule has a different scope. Inspect it before changing it.' }
  $taskExisting | Enable-NetFirewallRule | Out-Null
} else {
  New-NetFirewallRule -DisplayName $taskRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4317 -LocalAddress $LocalAddress -RemoteAddress LocalSubnet -Profile Any | Out-Null
}
$taskDashboardRoot=Split-Path -Parent $PSScriptRoot
$taskPrivateDir=Join-Path $taskDashboardRoot 'personal-os/private'
New-Item -ItemType Directory -Force -Path $taskPrivateDir | Out-Null
@{status='configured';localAddress=$LocalAddress;port=4317;remoteScope='LocalSubnet';observedAt=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskPrivateDir 'firewall-status.json')
Write-Output "Firewall rule configured for local subnet only. On your phone open http://${LocalAddress}:4317 and enter the pairing code from the computer dashboard."
