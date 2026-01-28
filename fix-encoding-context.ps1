$filePath = "d:/project/fluxlocal-storage/contexts/FileSystemContext.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Fix the malformed arrow function
$content = $content -replace '=& gt;', '=>'
$content = $content -replace '=&amp;gt;', '=>'
$content = $content -replace '&gt;', '>'
$content = $content -replace '&amp;', '&'

# Write back
$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "FileSystemContext.tsx fixed successfully"
