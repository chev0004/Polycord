param([string]$Stamp)
$ErrorActionPreference='Stop'
if ($env:NETLIFY_SITE_ID -ne '0c36e849-7617-4665-a657-1eb2b60da3d2') { throw 'Discovery sandbox site required' }
if ($Stamp -notmatch '^[a-z0-9-]+$') { throw 'Invalid trial stamp' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive=Join-Path (Get-Location) '.netlify/functions/___netlify-server-handler.zip'
$taskZip=[IO.Compression.ZipFile]::Open($taskArchive,[IO.Compression.ZipArchiveMode]::Update)
try {
  $taskEntry=$taskZip.GetEntry('___netlify-server-handler.mjs')
  if (-not $taskEntry) { throw 'Expected server handler entry' }
  $taskReader=[IO.StreamReader]::new($taskEntry.Open())
  try { $taskSource=$taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
  $taskSource=$taskSource -replace '^// DISC027 independent package: [^\r\n]+\r?\n',''
  $taskEntry.Delete()
  $taskNew=$taskZip.CreateEntry('___netlify-server-handler.mjs',[IO.Compression.CompressionLevel]::Optimal)
  $taskWriter=[IO.StreamWriter]::new($taskNew.Open(),[Text.UTF8Encoding]::new($false))
  try { $taskWriter.Write("// DISC027 independent package: $Stamp`n$taskSource") } finally { $taskWriter.Dispose() }
} finally { $taskZip.Dispose() }
$taskManifest=Join-Path (Get-Location) '.netlify/functions/manifest.json'
$taskCache=Get-Content -Raw -LiteralPath $taskManifest | ConvertFrom-Json
$taskCache.timestamp=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
[IO.File]::WriteAllText($taskManifest,($taskCache | ConvertTo-Json -Depth 16),[Text.UTF8Encoding]::new($false))
