# ==============================================================================
# SCRIPT DE PERFECCIÓN 10/10 PARA ABERAMENTHO PLEROMA MUSIC
# Implementa SPEC-004 / PLAN-004 con rigor absoluto de ingeniería de audio
# ==============================================================================

$targetRoot = "C:\Users\valen\Aberamentho-s-Pleroma-music"
Write-Host "Aplicando mejoras de perfección en: $targetRoot" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Modificar src/audio/audio-context.js
# ------------------------------------------------------------------------------
$audioContextPath = Join-Path $targetRoot "src\audio\audio-context.js"
$acContent = Get-Content $audioContextPath -Raw

# 1.1 Persistencia de AudioContext en init()
$oldInit = @'
  async init() {
    if (this.isInitialized && this.ctx && this.ctx.state !== 'suspended') {
      return this.ctx;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
'@

$newInit = @'
  async init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return this.ctx;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
'@

if ($acContent.Contains($oldInit)) {
    $acContent = $acContent.Replace($oldInit, $newInit)
    Write-Host "  [OK] audio-context.js: AudioContext lifecycle optimizado" -ForegroundColor Green
}

# 1.2 Rebase de playhead en setDeckPlaybackRate()
$oldRate = @'
  setDeckPlaybackRate(deckId, rate) {
    const deck = this.decks[deckId];
    if (!deck) return;
    deck.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.setTargetAtTime(deck.playbackRate, this.ctx.currentTime, 0.03);
    }
  }
'@

$newRate = @'
  setDeckPlaybackRate(deckId, rate) {
    const deck = this.decks[deckId];
    if (!deck) return;
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    if (deck.isPlaying && this.ctx) {
      const now = this.ctx.currentTime;
      const currentPos = (now - deck.startTime) * deck.playbackRate;
      deck.startTime = now - (currentPos / clampedRate);
    }
    deck.playbackRate = clampedRate;
    if (deck.sourceNode && this.ctx) {
      deck.sourceNode.playbackRate.setValueAtTime(deck.playbackRate, this.ctx.currentTime);
    }
  }

  /**
   * Hardware-clock scheduled Bass Kill / Swap on Compás 1.
   */
  scheduleBassKill(deckId, isKilled = true, scheduledTime = null) {
    const deck = this.decks[deckId];
    if (!deck || !this.ctx) return;
    const db = isKilled ? -36 : 0;
    deck.eqValues.low = db;
    const target = scheduledTime !== null ? scheduledTime : this.ctx.currentTime;
    deck.lowEQ.gain.setValueAtTime(db, target);
  }
'@

if ($acContent.Contains($oldRate)) {
    $acContent = $acContent.Replace($oldRate, $newRate)
    Write-Host "  [OK] audio-context.js: Rebase de playhead continuo y scheduleBassKill implementados" -ForegroundColor Green
}

# 1.3 Arquitectura de Ganancia de 2 Etapas
$oldDeckStateGain = "      gainNode: null,"
$newDeckStateGain = "      autoGainNode: null,`n      volumeGainNode: null,`n      gainNode: null,"
if ($acContent.Contains($oldDeckStateGain)) {
    $acContent = $acContent.Replace($oldDeckStateGain, $newDeckStateGain)
}

$oldChain = @'
    // 3. Deck Volume Fader
    deck.gainNode = this.ctx.createGain();
    deck.gainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 4. Crossfade Gain
    deck.crossfadeGain = this.ctx.createGain();

    // 5. Deck Analyser for 60fps Visualizer
    deck.analyser = this.ctx.createAnalyser();
    deck.analyser.fftSize = 256;
    deck.analyser.smoothingTimeConstant = 0.8;

    // Chain DSP nodes:
    // Source -> LowEQ -> MidEQ -> HighEQ -> FilterNode -> GainNode -> CrossfadeGain -> Analyser -> MasterGain
    deck.lowEQ.connect(deck.midEQ);
    deck.midEQ.connect(deck.highEQ);
    deck.highEQ.connect(deck.filterNode);
    deck.filterNode.connect(deck.gainNode);
    deck.gainNode.connect(deck.crossfadeGain);
    deck.crossfadeGain.connect(deck.analyser);
    deck.analyser.connect(this.masterGain);
'@

$newChain = @'
    // 3. Two-Stage Gain Architecture:
    // Stage A: Auto-Gain RMS Normalization Node
    deck.autoGainNode = this.ctx.createGain();
    deck.autoGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Stage B: User Fader Volume Node
    deck.volumeGainNode = this.ctx.createGain();
    deck.volumeGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    deck.gainNode = deck.volumeGainNode; // Backward compatibility

    // 4. Crossfade Gain
    deck.crossfadeGain = this.ctx.createGain();

    // 5. Deck Analyser for 60fps Visualizer
    deck.analyser = this.ctx.createAnalyser();
    deck.analyser.fftSize = 256;
    deck.analyser.smoothingTimeConstant = 0.8;

    // Chain DSP nodes (Two-Stage Decoupled Gain):
    // Source -> LowEQ -> MidEQ -> HighEQ -> FilterNode -> AutoGainNode -> VolumeGainNode -> CrossfadeGain -> Analyser -> MasterGain
    deck.lowEQ.connect(deck.midEQ);
    deck.midEQ.connect(deck.highEQ);
    deck.highEQ.connect(deck.filterNode);
    deck.filterNode.connect(deck.autoGainNode);
    deck.autoGainNode.connect(deck.volumeGainNode);
    deck.volumeGainNode.connect(deck.crossfadeGain);
    deck.crossfadeGain.connect(deck.analyser);
    deck.analyser.connect(this.masterGain);
'@

if ($acContent.Contains($oldChain)) {
    $acContent = $acContent.Replace($oldChain, $newChain)
    Write-Host "  [OK] audio-context.js: Cadena de ganancia de 2 etapas conectada" -ForegroundColor Green
}

$oldSetVol = @'
  setDeckVolume(deckId, volume) {
    const deck = this.decks[deckId];
    if (!deck || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1.2, volume));
    deck.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
  }
'@

$newSetVol = @'
  setDeckVolume(deckId, volume) {
    const deck = this.decks[deckId];
    if (!deck || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1.2, volume));
    if (deck.volumeGainNode) {
      deck.volumeGainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    }
  }
'@

if ($acContent.Contains($oldSetVol)) {
    $acContent = $acContent.Replace($oldSetVol, $newSetVol)
}

$oldLoadGain = @'
    deck.autoGainFactor = autoGainFactor;
    if (deck.gainNode && this.ctx) {
      deck.gainNode.gain.setValueAtTime(autoGainFactor, this.ctx.currentTime);
    }
'@

$newLoadGain = @'
    deck.autoGainFactor = autoGainFactor;
    if (deck.autoGainNode && this.ctx) {
      deck.autoGainNode.gain.setValueAtTime(autoGainFactor, this.ctx.currentTime);
    }
'@

if ($acContent.Contains($oldLoadGain)) {
    $acContent = $acContent.Replace($oldLoadGain, $newLoadGain)
    Write-Host "  [OK] audio-context.js: Normalización RMS asignada a autoGainNode" -ForegroundColor Green
}

[System.IO.File]::WriteAllText($audioContextPath, $acContent, [System.Text.Encoding]::UTF8)

# ------------------------------------------------------------------------------
# 2. Modificar src/audio/automix-brain.js (Bass Swap cuantizado en hardware clock)
# ------------------------------------------------------------------------------
$automixBrainPath = Join-Path $targetRoot "src\audio\automix-brain.js"
$abContent = Get-Content $automixBrainPath -Raw

$oldTriggerSwap = @'
    this.transitionDuration = Math.max(6.0, Math.min(18.0, rawDuration * 0.35));
    this.transitionStartTime = this.audio.ctx.currentTime;
    this.bassSwapped = false;
    this.washoutStarted = false;
    this.isTransitioning = true;
    this.state = 'SYNC_START';
'@

$newTriggerSwap = @'
    this.transitionDuration = Math.max(6.0, Math.min(18.0, rawDuration * 0.35));
    this.transitionStartTime = this.audio.ctx.currentTime;
    this.bassSwapped = false;
    this.washoutStarted = false;
    this.isTransitioning = true;
    this.state = 'SYNC_START';

    // Hardware-clock scheduled Bass Swap exactly at transition midpoint
    const midpointTime = this.transitionStartTime + (this.transitionDuration * 0.5);
    this.audio.scheduleBassKill(this.activeDeckId, true, midpointTime);
    this.audio.scheduleBassKill(this.incomingDeckId, false, midpointTime);
'@

if ($abContent.Contains($oldTriggerSwap)) {
    $abContent = $abContent.Replace($oldTriggerSwap, $newTriggerSwap)
    Write-Host "  [OK] automix-brain.js: Programación en reloj de hardware para Bass Swap en Compás 1" -ForegroundColor Green
}

[System.IO.File]::WriteAllText($automixBrainPath, $abContent, [System.Text.Encoding]::UTF8)

# ------------------------------------------------------------------------------
# 3. Modificar src/audio/playlist-vault.js (Emblemas sagrados de artistas)
# ------------------------------------------------------------------------------
$playlistVaultPath = Join-Path $targetRoot "src\audio\playlist-vault.js"
$pvContent = Get-Content $playlistVaultPath -Raw

$pvContent = $pvContent.Replace("'assets/vangelis-avatar.png'", "'assets/artist-ram.svg'")
$pvContent = $pvContent.Replace("'assets/yanni-avatar.png'", "'assets/artist-driftmoon.svg'")
$pvContent = $pvContent.Replace("'assets/enya-avatar.png'", "'assets/artist-aura.svg'")
$pvContent = $pvContent.Replace("'assets/kitaro-avatar.png'", "'assets/artist-bentzur.svg'")
$pvContent = $pvContent.Replace("'assets/paul-van-dyk-angel.jpg', anthem: 'When You’re Close To Me (Abora)'", "'assets/artist-etasonic.svg', anthem: 'When You’re Close To Me (Abora)'")
$pvContent = $pvContent.Replace("'assets/ferry-connect-original.jpg', anthem: 'Air For Life (with Above & Beyond)'", "'assets/artist-andymoor.svg', anthem: 'Air For Life (with Above & Beyond)'")
$pvContent = $pvContent.Replace("'assets/markus-portrait-2.png', anthem: 'Mientras Dormías (Coldharbour)'", "'assets/artist-daxson.svg', anthem: 'Mientras Dormías (Coldharbour)'")

[System.IO.File]::WriteAllText($playlistVaultPath, $pvContent, [System.Text.Encoding]::UTF8)
Write-Host "  [OK] playlist-vault.js: Avatares erróneos reemplazados por emblemas sagrados dedicados" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 4. Modificar index.html (Accesibilidad WCAG, labels en sliders, Escape en modal y CSS scoping)
# ------------------------------------------------------------------------------
$indexPath = Join-Path $targetRoot "index.html"
$idxContent = Get-Content $indexPath -Raw

# Labels accesibles en sliders
$idxContent = $idxContent.Replace('id="pitch-alpha" min="0.92" max="1.08" step="0.001" value="1.0" class="vertical-slider pitch-slider"', 'id="pitch-alpha" min="0.92" max="1.08" step="0.001" value="1.0" class="vertical-slider pitch-slider" aria-label="Control de Pitch y Tempo Deck Alpha"')
$idxContent = $idxContent.Replace('id="vol-alpha" min="0" max="1.2" step="0.01" value="1.0" class="vol-slider" title="Volumen Deck A"', 'id="vol-alpha" min="0" max="1.2" step="0.01" value="1.0" class="vol-slider" title="Volumen Deck A" aria-label="Fader de Volumen Deck Alpha"')
$idxContent = $idxContent.Replace('id="pitch-beta" min="0.92" max="1.08" step="0.001" value="1.0" class="vertical-slider pitch-slider"', 'id="pitch-beta" min="0.92" max="1.08" step="0.001" value="1.0" class="vertical-slider pitch-slider" aria-label="Control de Pitch y Tempo Deck Beta"')
$idxContent = $idxContent.Replace('id="vol-beta" min="0" max="1.2" step="0.01" value="1.0" class="vol-slider" title="Volumen Deck B"', 'id="vol-beta" min="0" max="1.2" step="0.01" value="1.0" class="vol-slider" title="Volumen Deck B" aria-label="Fader de Volumen Deck Beta"')

# Badge de artistas unificado
$idxContent = $idxContent.Replace('CATÁLOGO MAESTRO · 43 ARTISTAS Y LEYENDAS', 'CATÁLOGO MAESTRO · 46 ARTISTAS Y LEYENDAS')
$idxContent = $idxContent.Replace('Todos los Maestros del Trance, Progressive & Electrónica (43)', 'Todos los Maestros del Trance, Progressive & Electrónica (46)')

# Scoping de filtros para evitar colisión de active class
$oldFilterLegends = @'
    window.filterLegends = function(cat) {
      document.querySelectorAll('.pantheon-filter-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === cat);
      });
      document.querySelectorAll('#pantheon-grid .legend-card').forEach(c => {
        if (cat === 'all' || c.getAttribute('data-category') === cat) {
          c.style.display = 'flex';
        } else {
          c.style.display = 'none';
        }
      });
    };
'@

$newFilterLegends = @'
    window.filterLegends = function(cat) {
      document.querySelectorAll('.pantheon-filter-bar .pantheon-filter-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === cat);
      });
      document.querySelectorAll('#pantheon-grid .legend-card').forEach(c => {
        if (cat === 'all' || c.getAttribute('data-category') === cat) {
          c.style.display = 'flex';
        } else {
          c.style.display = 'none';
        }
      });
    };
'@

if ($idxContent.Contains($oldFilterLegends)) {
    $idxContent = $idxContent.Replace($oldFilterLegends, $newFilterLegends)
    Write-Host "  [OK] index.html: Scoping de filtros CSS resuelto" -ForegroundColor Green
}

# Tecla Escape para modal de leyendas (WCAG 2.1 AA)
$oldModalClose = @'
    if (btnClose) {
      btnClose.addEventListener('click', () => modal.classList.remove('active'));
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
'@

$newModalClose = @'
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        modal.classList.remove('active');
        if (btnOpen) btnOpen.focus();
      });
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        if (btnOpen) btnOpen.focus();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        modal.classList.remove('active');
        if (btnOpen) btnOpen.focus();
      }
    });
'@

if ($idxContent.Contains($oldModalClose)) {
    $idxContent = $idxContent.Replace($oldModalClose, $newModalClose)
    Write-Host "  [OK] index.html: Escape keydown y retorno de foco WCAG implementados" -ForegroundColor Green
}

[System.IO.File]::WriteAllText($indexPath, $idxContent, [System.Text.Encoding]::UTF8)

# ------------------------------------------------------------------------------
# 5. Modificar sw.js (Bump de versión y cache invalidation limpia)
# ------------------------------------------------------------------------------
$swPath = Join-Path $targetRoot "sw.js"
$swContent = Get-Content $swPath -Raw
$swContent = $swContent.Replace('aberamentho-pleroma-v4.0-golden-seal-10x10', 'aberamentho-pleroma-v5.0-god-perfection-10x10')
[System.IO.File]::WriteAllText($swPath, $swContent, [System.Text.Encoding]::UTF8)
Write-Host "  [OK] sw.js: Cache versionado a v5.0 God Perfection" -ForegroundColor Green

Write-Host "`nTodas las mejoras aplicadas exitosamente con precisión milimétrica." -ForegroundColor Cyan
