[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$YtDlpArgs
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$python = if ($env:YTDLP_PYTHON) {
    $env:YTDLP_PYTHON
}
else {
    (Get-Command python -ErrorAction SilentlyContinue).Source
}
if (-not $python -or -not (Test-Path -LiteralPath $python)) {
    Write-Error 'Python with yt-dlp is unavailable. Set YTDLP_PYTHON or install python on PATH.'
    exit 2
}

& $python -m yt_dlp @YtDlpArgs
exit $LASTEXITCODE
