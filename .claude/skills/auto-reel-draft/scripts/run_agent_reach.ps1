[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$AgentReachArgs
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$agentReach = if ($env:AGENT_REACH_EXE) {
    $env:AGENT_REACH_EXE
}
else {
    (Get-Command agent-reach -ErrorAction SilentlyContinue).Source
}
if (-not $agentReach -or -not (Test-Path -LiteralPath $agentReach)) {
    Write-Error 'Agent Reach is unavailable. Set AGENT_REACH_EXE or install agent-reach on PATH.'
    exit 2
}

& $agentReach @AgentReachArgs
exit $LASTEXITCODE
