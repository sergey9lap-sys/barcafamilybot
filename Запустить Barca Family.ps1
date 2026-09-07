$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) { $nodePath = 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js не найден.' }
$processInfo = Start-Process -FilePath $nodePath -ArgumentList @('--env-file=.env', 'scripts/supervisor.mjs') -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectPath 'data/supervisor.stdout.log') -RedirectStandardError (Join-Path $projectPath 'data/supervisor.stderr.log') -PassThru
Write-Output 'Barca Family запускается. Компьютер должен оставаться включённым.'
