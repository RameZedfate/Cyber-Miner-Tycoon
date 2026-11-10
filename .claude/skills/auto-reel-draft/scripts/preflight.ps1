[CmdletBinding()]
param(
    [Parameter()]
    [string]$Workspace = (Get-Location).Path,

    [Parameter()]
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$resolvedWorkspace = (Resolve-Path -LiteralPath $Workspace).Path

function Test-PathSafe {
    param([string]$LiteralPath)
    if (-not $LiteralPath) { return $false }
    try {
        $exists = Test-Path -LiteralPath $LiteralPath -ErrorAction Stop
        return [bool]$exists
    }
    catch {
        return $false
    }
}

$pythonCandidates = @(
    $env:AUTO_REEL_PYTHON,
    (Join-Path $resolvedWorkspace '.venv-jianying\Scripts\python.exe'),
    ((Get-Command python -ErrorAction SilentlyContinue).Source)
) | Where-Object { $_ }
$pythonPath = $pythonCandidates | Where-Object { Test-PathSafe $_ } | Select-Object -First 1

$jianyingCandidates = @(
    $env:JY_SKILL_ROOT,
    (Join-Path $resolvedWorkspace '.claude\skills\jianying-editor'),
    (Join-Path $resolvedWorkspace '.agents\skills\jianying-editor')
) | Where-Object { $_ }
$jianyingPath = $jianyingCandidates |
    Where-Object { Test-PathSafe (Join-Path $_ 'scripts\jy_wrapper.py') } |
    Select-Object -First 1
$assetseekerCandidates = @(
    $env:ASSETSEEKER_SCRIPT,
    (Join-Path $resolvedWorkspace '.claude\skills\assetseeker\scripts\seek_assets.py'),
    (Join-Path $resolvedWorkspace '.agents\skills\assetseeker\scripts\seek_assets.py')
) | Where-Object { $_ }
$assetseekerPath = $assetseekerCandidates | Where-Object { Test-PathSafe $_ } | Select-Object -First 1
$agentReachCandidates = @(
    $env:AGENT_REACH_EXE,
    ((Get-Command agent-reach -ErrorAction SilentlyContinue).Source)
) | Where-Object { $_ }
$agentReachPath = $agentReachCandidates | Where-Object { Test-PathSafe $_ } | Select-Object -First 1
$youtubeBackendPath = if ($agentReachPath) {
    Join-Path (Split-Path -Parent $agentReachPath) 'yt-dlp.exe'
}
$driveInbox = $env:AUTO_REEL_DRIVE_INBOX

$draftCandidates = @($env:JY_PROJECTS_ROOT)
if ($env:LOCALAPPDATA) {
    $draftCandidates += Join-Path $env:LOCALAPPDATA 'JianyingPro\User Data\Projects\com.lveditor.draft'
    $draftCandidates += Join-Path $env:LOCALAPPDATA 'CapCut\User Data\Projects\com.lveditor.draft'
}
$draftCandidates = $draftCandidates | Where-Object { $_ }
$draftPath = $draftCandidates | Where-Object { Test-PathSafe $_ } | Select-Object -First 1
if (-not $draftPath) {
    $draftPath = $draftCandidates | Select-Object -First 1
}

$assetSourcesChecked = $false
$assetSourcesAvailable = $false
if ($pythonPath -and (Test-PathSafe $assetseekerPath)) {
    $previousUtf8 = $env:PYTHONUTF8
    try {
        $env:PYTHONUTF8 = '1'
        & $pythonPath $assetseekerPath sources *> $null
        $assetSourcesChecked = $true
        $assetSourcesAvailable = $LASTEXITCODE -eq 0
    }
    finally {
        $env:PYTHONUTF8 = $previousUtf8
    }
}

$missing = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
if (-not $pythonPath) { $missing.Add('python') }
if (-not $jianyingPath -or -not (Test-PathSafe (Join-Path $jianyingPath 'scripts\jy_wrapper.py'))) {
    $missing.Add('jianying_skill')
}
if (-not $draftPath -or -not (Test-PathSafe $draftPath)) {
    $missing.Add('jianying_drafts_root')
}
if (-not (Test-PathSafe $assetseekerPath)) { $missing.Add('assetseeker') }
if (-not $agentReachPath) { $missing.Add('agent_reach') }
if (-not (Test-PathSafe $driveInbox)) { $warnings.Add('drive_inbox_unavailable') }
if (-not $assetSourcesAvailable) { $warnings.Add('asset_sources_check_failed') }
$jianyingAvailable = [bool]($jianyingPath -and (Test-PathSafe (Join-Path $jianyingPath 'scripts\jy_wrapper.py')))

$report = [ordered]@{
    ok = $missing.Count -eq 0
    python = [ordered]@{ available = [bool]$pythonPath; path = $pythonPath }
    jianying_skill = [ordered]@{
        available = $jianyingAvailable
        path = $jianyingPath
    }
    jianying_drafts_root = [ordered]@{
        available = [bool]($draftPath -and (Test-PathSafe $draftPath))
        path = $draftPath
    }
    agent_reach = [ordered]@{
        available = [bool]$agentReachPath
        path = $agentReachPath
        youtube_backend_available = Test-PathSafe $youtubeBackendPath
    }
    assetseeker = [ordered]@{
        available = Test-PathSafe $assetseekerPath
        path = $assetseekerPath
    }
    asset_sources = [ordered]@{
        checked = $assetSourcesChecked
        available = $assetSourcesAvailable
    }
    drive_inbox = [ordered]@{
        available = Test-PathSafe $driveInbox
        path = $driveInbox
    }
    api_keys = [ordered]@{
        pexels = [bool]$env:PEXELS_API_KEY
        unsplash = [bool]$env:UNSPLASH_ACCESS_KEY
        pixabay = [bool]$env:PIXABAY_API_KEY
        freesound = [bool]$env:FREESOUND_API_KEY
        google_fonts = [bool]$env:GOOGLE_FONTS_API_KEY
    }
    missing = @($missing)
    warnings = @($warnings)
}

if ($Json) {
    $report | ConvertTo-Json -Depth 6 -Compress
}
else {
    $report
}
