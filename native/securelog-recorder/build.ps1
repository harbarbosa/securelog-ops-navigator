param(
  [Parameter(Mandatory=$true)][string]$SdkRoot,
  [string]$Configuration = "Release"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$include = Get-ChildItem -LiteralPath $SdkRoot -Recurse -Filter dhnetsdk.h | Select-Object -First 1
$lib = Get-ChildItem -LiteralPath $SdkRoot -Recurse -Filter dhnetsdk.lib | Where-Object { $_.FullName -match "win32" } | Select-Object -First 1
$bin = Get-ChildItem -LiteralPath $SdkRoot -Recurse -Filter dhnetsdk.dll | Select-Object -First 1
if (!$include -or !$lib -or !$bin) { throw "SDK Intelbras incompleto: dhnetsdk.h, dhnetsdk.lib win32 e dhnetsdk.dll são necessários." }
$out = Join-Path $root "bin\win-x86"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$cl = Get-ChildItem "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" -Recurse -Filter cl.exe | Where-Object { $_.FullName -match "Hostx64\\x86" } | Select-Object -First 1
if (!$cl) { throw "cl.exe não encontrado. Instale o workload de C++." }
$vsdev = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
if (!(Test-Path $vsdev)) { throw "VsDevCmd.bat não encontrado." }
foreach ($line in (& cmd.exe /d /c "call `"$vsdev`" -host_arch=x64 -arch=x86 >nul && set")) {
  if ($line -match '^([^=]+)=(.*)$') { Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2] }
}
Push-Location $cl.Directory.FullName
try {
  & $cl.FullName /nologo /std:c++17 /EHsc /O2 /DUNICODE /D_UNICODE "/I$($include.Directory.FullName)" "/Fo$out\" "$root\main.cpp" /link "/LIBPATH:$($lib.Directory.FullName)" dhnetsdk.lib "/OUT:$out\securelog-recorder.exe"
  if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar securelog-recorder.exe" }
} finally { Pop-Location }
Get-ChildItem (Join-Path $bin.Directory.FullName "*.dll") | Copy-Item -Destination $out -Force
Write-Host "Helper compilado em $out"
