$path = "C:\Users\valen\Aberamentho-s-Pleroma-music\src\ui\deck-controller.js"
$content = Get-Content $path -Raw

$oldDrop = @'
      const meta = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        bpm: 128,
        key: deckId === 'alpha' ? '8A' : '9A',
      };
'@

$newDrop = @'
      const analysis = SoundGenerator.analyzeAudioBuffer(buffer, deckId === 'alpha' ? '8A' : '9A');
      const meta = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        bpm: analysis.bpm,
        key: analysis.camelotKey,
        isUserFile: true,
      };
'@

if ($content.Contains($oldDrop)) {
    $content = $content.Replace($oldDrop, $newDrop)
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "deck-controller.js actualizado exitosamente con SoundGenerator.analyzeAudioBuffer" -ForegroundColor Green
} else {
    Write-Host "Target content not found in deck-controller.js" -ForegroundColor Yellow
}
