[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDirectory,

    [Parameter(Mandatory = $true)]
    [ValidateRange(5, 8)]
    [int]$ExpectedCount
)

$ErrorActionPreference = 'Stop'
$myDriveFolder = -join ([char[]]@(0x6211, 0x7684, 0x96F2, 0x7AEF, 0x786C, 0x789F))
$carouselFolder = -join ([char[]]@(0x8F2A, 0x64AD, 0x5716, 0x6587))
$driveRoot = Join-Path (Join-Path 'G:\' $myDriveFolder) $carouselFolder
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputRoot = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot 'output'))

if (-not (Test-Path -LiteralPath $SourceDirectory -PathType Container)) {
    throw "Source directory does not exist: $SourceDirectory"
}

$sourcePath = (Resolve-Path -LiteralPath $SourceDirectory).Path
$outputPrefix = $outputRoot.TrimEnd('\') + '\'
if (-not $sourcePath.StartsWith($outputPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Source directory must be inside the workspace output folder: $outputRoot"
}

$folderName = Split-Path -Leaf $sourcePath
if ([string]::IsNullOrWhiteSpace($folderName) -or $folderName -in @('.', '..')) {
    throw 'The output folder name is invalid.'
}

if ($folderName.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
    throw "The output folder name contains invalid characters: $folderName"
}

$slides = @(Get-ChildItem -LiteralPath $sourcePath -File -Filter 'slide-*.png' | Sort-Object Name)
if ($slides.Count -ne $ExpectedCount) {
    throw "Expected $ExpectedCount slide images, found $($slides.Count)."
}

$expectedNames = @(1..$ExpectedCount | ForEach-Object { 'slide-{0:D2}.png' -f $_ })
$actualNames = @($slides | ForEach-Object { $_.Name })
if ((Compare-Object -ReferenceObject $expectedNames -DifferenceObject $actualNames).Count -ne 0) {
    throw "Slide names are not continuous: $($actualNames -join ', ')"
}

if (-not (Test-Path -LiteralPath $driveRoot -PathType Container)) {
    throw "Google Drive root is unavailable: $driveRoot"
}

$resolvedDriveRoot = (Resolve-Path -LiteralPath $driveRoot).Path.TrimEnd('\')
$destinationPath = [System.IO.Path]::GetFullPath((Join-Path $resolvedDriveRoot $folderName))
$drivePrefix = $resolvedDriveRoot + '\'
if (-not $destinationPath.StartsWith($drivePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Destination escaped the configured Drive root: $destinationPath"
}

if (-not (Test-Path -LiteralPath $destinationPath)) {
    New-Item -ItemType Directory -Path $destinationPath | Out-Null
}

$extraSlides = @(
    Get-ChildItem -LiteralPath $destinationPath -File -Filter 'slide-*.png' |
        Where-Object { $_.Name -notin $expectedNames }
)
if ($extraSlides.Count -gt 0) {
    throw "Drive folder contains unexpected slide files: $($extraSlides.Name -join ', ')"
}

$copied = 0
$unchanged = 0
foreach ($slide in $slides) {
    $destinationFile = Join-Path $destinationPath $slide.Name
    $sourceHash = (Get-FileHash -LiteralPath $slide.FullName -Algorithm SHA256).Hash

    if (Test-Path -LiteralPath $destinationFile) {
        $destinationHash = (Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256).Hash
        if ($sourceHash -eq $destinationHash) {
            $unchanged++
            continue
        }
    }

    Copy-Item -LiteralPath $slide.FullName -Destination $destinationFile -Force
    $copied++
}

$deliveredSlides = @(Get-ChildItem -LiteralPath $destinationPath -File -Filter 'slide-*.png' | Sort-Object Name)
if ($deliveredSlides.Count -ne $ExpectedCount) {
    throw "Drive verification expected $ExpectedCount files, found $($deliveredSlides.Count)."
}

foreach ($slide in $slides) {
    $destinationFile = Join-Path $destinationPath $slide.Name
    if (-not (Test-Path -LiteralPath $destinationFile -PathType Leaf)) {
        throw "Drive file is missing: $destinationFile"
    }

    $sourceItem = Get-Item -LiteralPath $slide.FullName
    $destinationItem = Get-Item -LiteralPath $destinationFile
    if ($sourceItem.Length -ne $destinationItem.Length) {
        throw "File size mismatch: $($slide.Name)"
    }

    $sourceHash = (Get-FileHash -LiteralPath $slide.FullName -Algorithm SHA256).Hash
    $destinationHash = (Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256).Hash
    if ($sourceHash -ne $destinationHash) {
        throw "SHA-256 mismatch: $($slide.Name)"
    }
}

[pscustomobject]@{
    status = 'complete'
    source = $sourcePath
    destination = $destinationPath
    expected_count = $ExpectedCount
    delivered_count = $deliveredSlides.Count
    copied = $copied
    unchanged = $unchanged
} | ConvertTo-Json -Depth 3
