param([string]$Stamp)
$ErrorActionPreference='Stop'
if ($env:NETLIFY_SITE_ID -ne '0c36e849-7617-4665-a657-1eb2b60da3d2') { throw 'Discovery sandbox site required' }
if ($Stamp -notmatch '^[a-z0-9-]+$') { throw 'Invalid stamp' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive=Join-Path (Get-Location) '.netlify/functions/disc031-minimal.zip'
$taskZip=[IO.Compression.ZipFile]::Open($taskArchive,[IO.Compression.ZipArchiveMode]::Update)
try {
  $taskEntry=$taskZip.GetEntry('disc031-minimal.mjs')
  $taskReader=[IO.StreamReader]::new($taskEntry.Open())
  try { $taskSource=$taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
  $taskSource=$taskSource -replace '^void "disc031:[^\r\n]+\r?\n',''
  $taskEntry.Delete()
  $taskNew=$taskZip.CreateEntry('disc031-minimal.mjs',[IO.Compression.CompressionLevel]::Optimal)
  $taskWriter=[IO.StreamWriter]::new($taskNew.Open(),[Text.UTF8Encoding]::new($false))
  try { $taskWriter.Write("void `"disc031:$Stamp`";`n$taskSource") } finally { $taskWriter.Dispose() }
} finally { $taskZip.Dispose() }
