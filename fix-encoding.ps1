$filePath = "d:/project/fluxlocal-storage/server/index.ts"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Fix the malformed arrow function
$content = $content -replace '\(req, file, cb\) =& gt;', '(req, file, cb) =>'

# Write back
$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "File fixed successfully"
