export const pwshHook = String.raw`
if (-not $global:__ctxrOriginalPrompt) {
  $global:__ctxrOriginalPrompt = $function:prompt
  $global:__ctxrLastDir = ""
  $global:__ctxrLastBranch = ""
  $global:__ctxrLastId = 0
}

function global:prompt {
  $succeeded = $?
  $info = @(git rev-parse --path-format=absolute --git-common-dir --abbrev-ref HEAD 2>$null)
  if ($LASTEXITCODE -eq 0 -and $info.Count -ge 2) {
    $dir = $info[0]
    $branch = $info[$info.Count - 1]
    $entry = Get-History -Count 1
    if ($entry -and $entry.Id -ne $global:__ctxrLastId) {
      $global:__ctxrLastId = $entry.Id
      $code = if ($entry.ExecutionStatus -eq "Failed" -or -not $succeeded) { 1 } else { 0 }
      $ts = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
      $cmd = $entry.CommandLine -replace "[\r\n]+", " "
      $line = ($ts, $PWD.Path, $branch, $code, $cmd) -join [char]9
      [IO.File]::AppendAllText((Join-Path $dir "ctxr-log.tsv"), $line + [char]10)
    }
    if ($global:__ctxrLastDir -eq $dir -and $global:__ctxrLastBranch -ne $branch -and -not $env:CTXR_NO_AUTO) {
      if ($global:__ctxrLastBranch -ne "HEAD") { ctxr pause --auto --branch $global:__ctxrLastBranch *> $null }
      if ($branch -ne "HEAD") { ctxr resume --auto | Out-Host }
    }
    $global:__ctxrLastDir = $dir
    $global:__ctxrLastBranch = $branch
  } else {
    $global:__ctxrLastDir = ""
  }
  & $global:__ctxrOriginalPrompt
}
`.trimStart();
