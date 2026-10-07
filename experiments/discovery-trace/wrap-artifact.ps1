$ErrorActionPreference='Stop'
if ($env:NETLIFY_SITE_ID -ne '0c36e849-7617-4665-a657-1eb2b60da3d2') { throw 'Discovery sandbox site required' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskArchive=Join-Path (Get-Location) '.netlify/functions/___netlify-server-handler.zip'
$taskZip=[IO.Compression.ZipFile]::Open($taskArchive,[IO.Compression.ZipArchiveMode]::Update)
try {
  if ($taskZip.GetEntry('disc031-framework.mjs')) { throw 'Already wrapped' }
  $taskEntry=$taskZip.GetEntry('___netlify-server-handler.mjs')
  $taskReader=[IO.StreamReader]::new($taskEntry.Open())
  try { $taskOriginal=$taskReader.ReadToEnd() } finally { $taskReader.Dispose() }
  $taskEntry.Delete()
  foreach($taskItem in @(@{name='disc031-framework.mjs';source=$taskOriginal},@{name='___netlify-server-handler.mjs';source=[IO.File]::ReadAllText((Join-Path (Get-Location) 'experiments/discovery-trace/runtime.mjs'))})) {
    $taskNew=$taskZip.CreateEntry($taskItem.name,[IO.Compression.CompressionLevel]::Optimal)
    $taskWriter=[IO.StreamWriter]::new($taskNew.Open(),[Text.UTF8Encoding]::new($false))
    try { $taskWriter.Write($taskItem.source) } finally { $taskWriter.Dispose() }
  }
} finally { $taskZip.Dispose() }
