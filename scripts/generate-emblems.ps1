$artists = @(
    @{ file="artist-ram.svg"; title="RAM"; sub="RAMELIA · UPLIFTING 138"; color1="#ffb703"; color2="#00f0ff"; sym="♈" },
    @{ file="artist-driftmoon.svg"; title="DRIFTMOON"; sub="HOWL AT THE MOON"; color1="#fbbf24"; color2="#8338ec"; sym="🌙" },
    @{ file="artist-aura.svg"; title="AURA"; sub="PLEROMA · 432Hz HARMONIC"; color1="#06d6a0"; color2="#ffb703"; sym="✦" },
    @{ file="artist-bentzur.svg"; title="BEN TZUR"; sub="BEN TZUR · KETER LIGHT"; color1="#ffd166"; color2="#8338ec"; sym="✡" },
    @{ file="artist-etasonic.svg"; title="ETASONIC"; sub="ABORA SACRED UPLIFTING"; color1="#00f0ff"; color2="#3a86ff"; sym="☀️" },
    @{ file="artist-andymoor.svg"; title="ANDY MOOR"; sub="AVA · AIR FOR LIFE"; color1="#38bdf8"; color2="#ec4899"; sym="⚡" },
    @{ file="artist-daxson.svg"; title="DAXSON"; sub="COLDHARBOUR TITAN"; color1="#f59e0b"; color2="#00f0ff"; sym="⚔" }
)

foreach ($a in $artists) {
    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <radialGradient id="bg-$($a.file)" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a1128" />
      <stop offset="70%" stop-color="#040714" />
      <stop offset="100%" stop-color="#020308" />
    </radialGradient>
    <linearGradient id="grad-$($a.file)" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="$($a.color1)" />
      <stop offset="100%" stop-color="$($a.color2)" />
    </linearGradient>
    <filter id="glow-$($a.file)" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="400" height="400" rx="40" fill="url(#bg-$($a.file))" />
  <circle cx="200" cy="200" r="175" fill="none" stroke="url(#grad-$($a.file))" stroke-width="2" stroke-dasharray="6,4" opacity="0.6" />
  <circle cx="200" cy="200" r="150" fill="none" stroke="$($a.color1)" stroke-width="1.5" opacity="0.3" />
  <polygon points="200,65 240,165 345,165 260,225 295,325 200,265 105,325 140,225 55,165 160,165" fill="none" stroke="url(#grad-$($a.file))" stroke-width="1.2" opacity="0.25" />
  <circle cx="200" cy="170" r="55" fill="#030712" stroke="url(#grad-$($a.file))" stroke-width="3" filter="url(#glow-$($a.file))" />
  <text x="200" y="185" font-family="'Space Grotesk', 'Outfit', sans-serif" font-size="42" font-weight="900" fill="$($a.color1)" text-anchor="middle" filter="url(#glow-$($a.file))">$($a.sym)</text>
  <text x="200" y="270" font-family="'Outfit', 'Space Grotesk', sans-serif" font-size="24" font-weight="900" fill="#ffffff" letter-spacing="2" text-anchor="middle">$($a.title)</text>
  <text x="200" y="300" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="$($a.color1)" letter-spacing="1.5" text-anchor="middle" opacity="0.9">$($a.sub)</text>
  <text x="200" y="335" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="600" fill="#64748b" letter-spacing="1.2" text-anchor="middle">ABERAMENTHO SACRED PANTHEON</text>
</svg>
"@
    $target = "C:\Users\valen\Aberamentho-s-Pleroma-music\assets\" + $a.file
    [System.IO.File]::WriteAllText($target, $svg, [System.Text.Encoding]::UTF8)
    Write-Host "Generado: $target"
}
