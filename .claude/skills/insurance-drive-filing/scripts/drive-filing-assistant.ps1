param(
    [Parameter(Mandatory = $true)]
    [string]$InboxPath,
    [Parameter(Mandatory = $true)]
    [string]$CustomerRoot,
    [string]$ReportPath = (Join-Path (Get-Location) "drive-filing-suggestions.csv"),
    [switch]$MoveApproved
)

$ErrorActionPreference = "Stop"

$Categories = @{
    "理賠" = @(
        "理賠", "理賠申請", "診斷證明", "診斷書", "收據", "醫療費用",
        "費用明細", "門診", "急診", "住院", "病歷", "醫療", "證明書"
    )
    "保全" = @(
        "保全", "契約變更", "契變", "變更申請", "變更地址", "地址變更",
        "受益人", "要保人變更", "繳別", "簽名樣式", "簽名", "印鑑"
    )
    "新契約" = @(
        "新契約", "要保書", "投保", "保險契約", "保單", "契約書",
        "聲明書", "告知事項", "健康告知"
    )
    "個人文件" = @(
        "身分證", "身份證", "健保卡", "存摺", "戶籍", "戶口名簿",
        "駕照", "居留證", "護照"
    )
}

$ManualFamilyMap = @{}

$ManualOcrNameAliases = @{}

$ManualFilePersonOverrides = @{}

$ManualClaimDiseaseOverrides = @{}

function Normalize-Text {
    param([string]$Text)
    if ($null -eq $Text) { return "" }
    $Text = $Text -replace "鵔", "駿"
    return ($Text -replace "\s+", "" -replace "[^\p{L}\p{Nd}]", "")
}

function Get-ManualDestinationGuess {
    param(
        [string]$Text,
        [string]$Category,
        [string]$Root
    )

    if ([string]::IsNullOrWhiteSpace($Category)) { return $null }

    $normalized = Normalize-Text $Text
    foreach ($personName in $ManualFamilyMap.Keys) {
        if ($normalized.Contains((Normalize-Text $personName))) {
            $customerName = $ManualFamilyMap[$personName]
            $destination = Join-Path (Join-Path (Join-Path $Root $customerName) $personName) $Category
            return [pscustomobject]@{
                MatchName = $personName
                Customer = $customerName
                FamilyMember = $personName
                Category = $Category
                Destination = $destination
                MatchWeight = 3
            }
        }
    }

    return $null
}

function Get-NaturalSortKey {
    param([System.IO.FileInfo]$File)
    if ($File.BaseName -match "(\d+)$") {
        return "{0:D10}" -f [int]$Matches[1]
    }
    return $File.Name
}

function Remove-InvalidPathPart {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
    $clean = $Text.Trim()
    foreach ($char in [System.IO.Path]::GetInvalidFileNameChars()) {
        $clean = $clean.Replace($char, " ")
    }
    return (($clean -replace "\s+", " ").Trim())
}

function Get-ClaimCaseInfo {
    param(
        [string]$Text,
        [string]$PersonName
    )

    $flat = Normalize-Text $Text
    $date = ""
    $disease = ""

    $dateMatches = [regex]::Matches($Text, "(?:民\s*國\s*)?(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日")
    foreach ($match in $dateMatches) {
        $year = [int]$match.Groups[1].Value
        if ($year -ge 110) {
            $date = "{0}.{1:00}.{2:00}" -f $year, [int]$match.Groups[2].Value, [int]$match.Groups[3].Value
            break
        }
    }

    if ([string]::IsNullOrWhiteSpace($date) -and $flat -match "(11\d)(\d{2})(\d{2})") {
        $date = "{0}.{1}.{2}" -f $Matches[1], $Matches[2], $Matches[3]
    }

    if ($flat -match "本號(.{2,32}?)(?:以下空白|院碼|該員|該病患)") {
        $disease = $Matches[1]
    }
    if ([string]::IsNullOrWhiteSpace($disease) -and $flat -match "(?:診斷證明書|證明書).{0,80}?($PersonName)?(.{2,36}?)(?:以下空白|以上病人|該病患)") {
        $disease = $Matches[2]
    }
    if ([string]::IsNullOrWhiteSpace($disease) -and $flat -match "(?:診斷|病名|疾病)(.{2,24}?)(?:以下空白|以上病人|醫師)") {
        $disease = $Matches[1]
    }

    $disease = $disease -replace "姓名|性別|職業|年齡|民國|科別|病歷|號碼|日期|本號|院碼|印或|診斷證明書|證明書|診書|診字", ""
    if ($disease.Length -gt 18) { $disease = $disease.Substring(0, 18) }
    if ([string]::IsNullOrWhiteSpace($disease)) { $disease = "病名待確認" }
    if ([string]::IsNullOrWhiteSpace($date)) { $date = "日期待確認" }

    $overrideKey = "{0}|{1}" -f $PersonName, $date
    if ($ManualClaimDiseaseOverrides.ContainsKey($overrideKey)) {
        $disease = $ManualClaimDiseaseOverrides[$overrideKey]
    }

    return [pscustomobject]@{
        Date = Remove-InvalidPathPart $date
        Disease = Remove-InvalidPathPart $disease
    }
}

function Get-WinRtTaskResult {
    param($Operation, [type]$ResultType)
    if (-not $script:AsTaskGeneric) {
        $script:AsTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
            Where-Object {
                $_.Name -eq "AsTask" -and
                $_.IsGenericMethodDefinition -and
                $_.GetParameters().Count -eq 1 -and
                $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
            } |
            Select-Object -First 1)
        if ($null -eq $script:AsTaskGeneric) {
            throw "Cannot find Windows Runtime AsTask helper."
        }
    }
    $task = $script:AsTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

function Initialize-Ocr {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
    [Windows.Storage.FileAccessMode, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
    [Windows.Globalization.Language, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null

    $language = [Windows.Globalization.Language]::new("zh-Hant-TW")
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
    if ($null -eq $engine) {
        throw "Windows OCR cannot create a zh-Hant-TW OCR engine."
    }
    return $engine
}

function Read-OcrText {
    param([string]$Path, $Engine)
    $file = Get-WinRtTaskResult ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Path)) ([Windows.Storage.StorageFile])
    $stream = Get-WinRtTaskResult ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
        $decoder = Get-WinRtTaskResult ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Get-WinRtTaskResult ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $result = Get-WinRtTaskResult ($Engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
        return $result.Text
    }
    finally {
        if ($stream) { $stream.Dispose() }
    }
}

function Get-CategoryGuess {
    param([string]$Text)
    $normalized = Normalize-Text $Text
    $bestCategory = ""
    $bestScore = 0
    $bestHits = @()

    if (($normalized.Contains("姓名") -and
         $normalized.Contains("出生年月日") -and
         ($normalized.Contains("性別") -or $normalized.Contains("發證日期"))) -or
        ($normalized.Contains("中華民國") -and
         ($normalized.Contains("出生年月日") -or $normalized.Contains("發證日期")))) {
        return [pscustomobject]@{
            Category = "個人文件"
            Score = 2
            Hits = "身分證版面"
        }
    }

    foreach ($category in $Categories.Keys) {
        $hits = @()
        foreach ($keyword in $Categories[$category]) {
            if ($normalized.Contains((Normalize-Text $keyword))) {
                $hits += $keyword
            }
        }
        if ($hits.Count -gt $bestScore) {
            $bestScore = $hits.Count
            $bestCategory = $category
            $bestHits = $hits
        }
    }

    return [pscustomobject]@{
        Category = $bestCategory
        Score = $bestScore
        Hits = ($bestHits -join "|")
    }
}

function Get-CustomerIndex {
    param([string]$Root)
    $categoryNames = @("個人文件", "保全", "新契約", "理賠")
    $rows = New-Object System.Collections.Generic.List[object]

    Get-ChildItem -LiteralPath $Root -Directory | ForEach-Object {
        $customer = $_
        $directCategoryFolders = Get-ChildItem -LiteralPath $customer.FullName -Directory -ErrorAction SilentlyContinue |
            Where-Object { $categoryNames -contains $_.Name }

        if ($directCategoryFolders.Count -gt 0) {
            foreach ($categoryFolder in $directCategoryFolders) {
                $rows.Add([pscustomobject]@{
                    MatchName = $customer.Name
                    Customer = $customer.Name
                    FamilyMember = ""
                    Category = $categoryFolder.Name
                    Destination = $categoryFolder.FullName
                    MatchWeight = 1
                })
            }
        }

        Get-ChildItem -LiteralPath $customer.FullName -Directory -ErrorAction SilentlyContinue |
            Where-Object { $categoryNames -notcontains $_.Name } |
            ForEach-Object {
                $family = $_
                Get-ChildItem -LiteralPath $family.FullName -Directory -ErrorAction SilentlyContinue |
                    Where-Object { $categoryNames -contains $_.Name } |
                    ForEach-Object {
                        $rows.Add([pscustomobject]@{
                            MatchName = $family.Name
                            Customer = $customer.Name
                            FamilyMember = $family.Name
                            Category = $_.Name
                            Destination = $_.FullName
                            MatchWeight = 2
                        })
                    }
            }
    }

    return $rows
}

function Get-DestinationGuess {
    param(
        [string]$Text,
        [string]$Category,
        $CustomerIndex
    )

    if ([string]::IsNullOrWhiteSpace($Category)) {
        return $null
    }

    $normalized = Normalize-Text $Text
    $matches = $CustomerIndex |
        Where-Object {
            $_.Category -eq $Category -and
            $normalized.Contains((Normalize-Text $_.MatchName))
        } |
        Sort-Object -Property `
            @{ Expression = { $_.MatchWeight }; Descending = $true },
            @{ Expression = { $_.MatchName.Length }; Descending = $true }

    if (-not ($matches | Select-Object -First 1)) {
        $matches = $CustomerIndex |
            Where-Object {
                $_.Category -eq $Category -and
                (Normalize-Text $_.MatchName).Length -ge 3 -and
                $normalized.Contains((Normalize-Text $_.MatchName).Substring((Normalize-Text $_.MatchName).Length - 2))
            } |
            Sort-Object -Property `
                @{ Expression = { $_.MatchWeight }; Descending = $true },
            @{ Expression = { $_.MatchName.Length }; Descending = $true }
    }

    if (-not ($matches | Select-Object -First 1)) {
        foreach ($matchName in $ManualOcrNameAliases.Keys) {
            $aliases = $ManualOcrNameAliases[$matchName]
            $aliasMatched = $false
            foreach ($alias in $aliases) {
                if ($normalized.Contains((Normalize-Text $alias))) {
                    $aliasMatched = $true
                    break
                }
            }
            if (-not $aliasMatched) { continue }

            $matches = $CustomerIndex |
                Where-Object {
                    $_.Category -eq $Category -and
                    $_.MatchName -eq $matchName
                } |
                Sort-Object -Property `
                    @{ Expression = { $_.MatchWeight }; Descending = $true }
            if ($matches | Select-Object -First 1) { break }
        }
    }

    return $matches | Select-Object -First 1
}

function Get-Confidence {
    param(
        [int]$CategoryScore,
        [bool]$HasDestination,
        [bool]$Inherited
    )

    if ($Inherited -and $HasDestination) { return "medium" }
    if ($CategoryScore -ge 2 -and $HasDestination) { return "high" }
    if ($CategoryScore -ge 1 -and $HasDestination) { return "medium" }
    if ($CategoryScore -ge 1) { return "low" }
    return "review"
}

if ($MoveApproved) {
    if (-not (Test-Path -LiteralPath $ReportPath)) {
        throw "Report not found: $ReportPath"
    }
    $approvedRows = Import-Csv -LiteralPath $ReportPath | Where-Object {
        $_.ApproveMove -match "^(Y|YES|OK|1)$" -and
        (-not [string]::IsNullOrWhiteSpace($_.SuggestedDestination) -or -not [string]::IsNullOrWhiteSpace($_.SuggestedCaseFolderPath)) -and
        (Test-Path -LiteralPath $_.SourcePath)
    }

    foreach ($row in $approvedRows) {
        $destination = if (-not [string]::IsNullOrWhiteSpace($row.SuggestedCaseFolderPath)) {
            $row.SuggestedCaseFolderPath
        } else {
            $row.SuggestedDestination
        }
        New-Item -ItemType Directory -Force -Path $destination | Out-Null
        $target = Join-Path $destination (Split-Path $row.SourcePath -Leaf)
        if (Test-Path -LiteralPath $target) {
            $base = [System.IO.Path]::GetFileNameWithoutExtension($target)
            $ext = [System.IO.Path]::GetExtension($target)
            $target = Join-Path $destination ("{0}_{1:yyyyMMddHHmmss}{2}" -f $base, (Get-Date), $ext)
        }
        Move-Item -LiteralPath $row.SourcePath -Destination $target
    }
    Write-Host ("Moved {0} approved file(s)." -f $approvedRows.Count)
    exit
}

if (-not (Test-Path -LiteralPath $InboxPath)) { throw "Inbox path not found: $InboxPath" }
if (-not (Test-Path -LiteralPath $CustomerRoot)) { throw "Customer root not found: $CustomerRoot" }

$engine = Initialize-Ocr
$customerIndex = Get-CustomerIndex $CustomerRoot
$files = Get-ChildItem -LiteralPath $InboxPath -File |
    Where-Object { $_.Extension -match "^\.(jpg|jpeg|png|bmp|tif|tiff)$" } |
    Sort-Object @{ Expression = { Get-NaturalSortKey $_ } }, Name

$rows = New-Object System.Collections.Generic.List[object]
$lastDestination = $null
$lastCategory = ""
$lastCaseFolderName = ""
$lastCaseFolderPath = ""
$lastSequenceNumber = $null
$pendingClaimRows = New-Object System.Collections.Generic.List[object]

foreach ($file in $files) {
    $currentSequenceNumber = $null
    if ($file.BaseName -match "(\d+)$") {
        $currentSequenceNumber = [int]$Matches[1]
    }
    if ($null -ne $lastSequenceNumber -and
        $null -ne $currentSequenceNumber -and
        $currentSequenceNumber -ne ($lastSequenceNumber + 1)) {
        $lastDestination = $null
        $lastCategory = ""
        $lastCaseFolderName = ""
        $lastCaseFolderPath = ""
        $pendingClaimRows.Clear()
    }
    $lastSequenceNumber = $currentSequenceNumber

    Write-Host ("OCR: {0}" -f $file.Name)
    $ocrText = ""
    $errorText = ""

    try {
        $ocrText = Read-OcrText $file.FullName $engine
    }
    catch {
        $errorText = $_.Exception.Message
    }

    $flatOcr = Normalize-Text $ocrText
    $isClaimApplication = $flatOcr.Contains("理賠申請書") -or $flatOcr.Contains("保險金申請書")
    $isClaimLeadDocument = $isClaimApplication -or $flatOcr.Contains("理賠案件聯繫通知單")
    $categoryGuess = Get-CategoryGuess $ocrText
    if ($isClaimLeadDocument) {
        $categoryGuess.Category = "理賠"
        $categoryGuess.Score = [Math]::Max(2, $categoryGuess.Score)
        $categoryGuess.Hits = "理賠主文件"
    }
    $destinationGuess = Get-DestinationGuess $ocrText $categoryGuess.Category $customerIndex
    if ($null -eq $destinationGuess) {
        $destinationGuess = Get-ManualDestinationGuess $ocrText $categoryGuess.Category $CustomerRoot
    }
    if ($ManualFilePersonOverrides.ContainsKey($file.Name)) {
        $manualOverride = $ManualFilePersonOverrides[$file.Name]
        $categoryGuess.Category = $manualOverride.Category
        $categoryGuess.Score = 3
        $categoryGuess.Hits = "User-confirmed sequence"
        $destinationGuess = $customerIndex |
            Where-Object {
                $_.Category -eq $manualOverride.Category -and
                $_.MatchName -eq $manualOverride.PersonName
            } |
            Sort-Object -Property `
                @{ Expression = { $_.MatchWeight }; Descending = $true } |
            Select-Object -First 1
    }
    $inherited = $false

    if ($null -ne $destinationGuess -and
        $null -ne $lastDestination -and
        $destinationGuess.Destination -ne $lastDestination.Destination) {
        $lastCaseFolderName = ""
        $lastCaseFolderPath = ""
        $pendingClaimRows.Clear()
    }

    if ($null -eq $destinationGuess -and
        $null -ne $lastDestination -and
        $lastCategory -eq "理賠" -and
        -not $isClaimApplication -and
        ($categoryGuess.Category -eq "個人文件" -or [string]::IsNullOrWhiteSpace($categoryGuess.Category))) {
        $destinationGuess = $lastDestination
        $categoryGuess.Category = "理賠"
        $inherited = $true
    }
    elseif ($null -eq $destinationGuess -and
        -not [string]::IsNullOrWhiteSpace($categoryGuess.Category) -and
        $categoryGuess.Category -eq $lastCategory -and
        $null -ne $lastDestination -and
        -not $isClaimApplication) {
        $destinationGuess = $lastDestination
        $inherited = $true
    }
    elseif ($null -eq $destinationGuess -and
        [string]::IsNullOrWhiteSpace($categoryGuess.Category) -and
        $null -ne $lastDestination -and
        -not $isClaimApplication) {
        $destinationGuess = $lastDestination
        $inherited = $true
    }

    if ($inherited -and [string]::IsNullOrWhiteSpace($categoryGuess.Category) -and -not [string]::IsNullOrWhiteSpace($lastCategory)) {
        $categoryGuess.Category = $lastCategory
    }

    if ($null -ne $destinationGuess -and -not $inherited) {
        $lastDestination = $destinationGuess
        $lastCategory = $categoryGuess.Category
    }

    $personName = ""
    if ($destinationGuess) {
        $personName = if (-not [string]::IsNullOrWhiteSpace($destinationGuess.FamilyMember)) {
            $destinationGuess.FamilyMember
        } else {
            $destinationGuess.Customer
        }
    }

    $caseFolderName = ""
    $caseFolderPath = ""
    $isClaim = $categoryGuess.Category -eq "理賠" -or $flatOcr.Contains("理賠") -or $pendingClaimRows.Count -gt 0
    $isDiagnosis = $flatOcr.Contains("診斷證明") -or $flatOcr.Contains("診斷書") -or $flatOcr.Contains("診書") -or $flatOcr.Contains("診字第")

    if ($isClaimApplication -and -not $isDiagnosis) {
        $lastCaseFolderName = ""
        $lastCaseFolderPath = ""
        $pendingClaimRows.Clear()
    }

    if ($isClaim -and $destinationGuess) {
        if ($isDiagnosis -and -not [string]::IsNullOrWhiteSpace($personName)) {
            $caseInfo = Get-ClaimCaseInfo $ocrText $personName
            $caseFolderName = Remove-InvalidPathPart ("理賠 {0} {1} {2}" -f $personName, $caseInfo.Date, $caseInfo.Disease)
            $caseFolderPath = Join-Path $destinationGuess.Destination $caseFolderName
            $lastCaseFolderName = $caseFolderName
            $lastCaseFolderPath = $caseFolderPath

            foreach ($pendingRow in $pendingClaimRows) {
                if ([string]::IsNullOrWhiteSpace($pendingRow.SuggestedCaseFolderPath)) {
                    $pendingRow.SuggestedCustomer = $destinationGuess.Customer
                    $pendingRow.SuggestedFamilyMember = $destinationGuess.FamilyMember
                    $pendingRow.SuggestedDestination = $destinationGuess.Destination
                    $pendingRow.SuggestedCaseFolderName = $caseFolderName
                    $pendingRow.SuggestedCaseFolderPath = $caseFolderPath
                }
            }
            $pendingClaimRows.Clear()
        }
        elseif (-not [string]::IsNullOrWhiteSpace($lastCaseFolderPath)) {
            $caseFolderName = $lastCaseFolderName
            $caseFolderPath = $lastCaseFolderPath
        }
    }

    $summary = ($ocrText -replace "\s+", " ").Trim()
    if ($summary.Length -gt 160) { $summary = $summary.Substring(0, 160) }

    $row = [pscustomobject]@{
        ApproveMove = ""
        FileName = $file.Name
        SourcePath = $file.FullName
        SuggestedCategory = $categoryGuess.Category
        SuggestedCustomer = if ($destinationGuess) { $destinationGuess.Customer } else { "" }
        SuggestedFamilyMember = if ($destinationGuess) { $destinationGuess.FamilyMember } else { "" }
        SuggestedDestination = if ($destinationGuess) { $destinationGuess.Destination } else { "" }
        SuggestedCaseFolderName = $caseFolderName
        SuggestedCaseFolderPath = $caseFolderPath
        Confidence = Get-Confidence $categoryGuess.Score ($null -ne $destinationGuess) $inherited
        Reason = if ($inherited) { "Inherited from previous photo" } else { $categoryGuess.Hits }
        OcrPreview = $summary
        Error = $errorText
    }

    $rows.Add($row)
    if ($isClaim -and [string]::IsNullOrWhiteSpace($row.SuggestedCaseFolderPath)) {
        $pendingClaimRows.Add($row)
    }
}

$rows | Export-Csv -LiteralPath $ReportPath -NoTypeInformation -Encoding UTF8
Write-Host ("Report written: {0}" -f $ReportPath)









