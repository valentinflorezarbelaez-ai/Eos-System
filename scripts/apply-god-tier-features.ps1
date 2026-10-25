# ==============================================================================
# SCRIPT DE ELEVACIÓN TRASCENDENTAL (MAXIMA GLORIA 10/10) PARA ABERAMENTHO
# ==============================================================================

$targetRoot = "C:\Users\valen\Aberamentho-s-Pleroma-music"
Write-Host "Iniciando elevación de Aberamentho hacia la Máxima Gloria en: $targetRoot" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Modificar src/audio/audio-context.js (Grabador Master Hi-Fi y Nudge)
# ------------------------------------------------------------------------------
$audioContextPath = Join-Path $targetRoot "src\audio\audio-context.js"
$acContent = Get-Content $audioContextPath -Raw

$oldMasterConn = @'
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
'@

$newMasterConn = @'
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Master Hi-Fi Live Recording Destination Node
    try {
      this.recDestination = this.ctx.createMediaStreamDestination ? this.ctx.createMediaStreamDestination() : null;
      if (this.recDestination) {
        this.masterLimiter.connect(this.recDestination);
      }
    } catch (e) {
      this.recDestination = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingStartTime = 0;
'@

if ($acContent.Contains($oldMasterConn)) {
    $acContent = $acContent.Replace($oldMasterConn, $newMasterConn)
    Write-Host "  [OK] audio-context.js: MediaStreamDestination conectado al Master Bus" -ForegroundColor Green
}

$oldClassEnd = @'
    return profile;
  }
}
'@

$newAudioMethods = @'
    return profile;
  }

  /**
   * Start live Hi-Fi set recording directly from the master bus.
   */
  startLiveRecording() {
    if (!this.ctx || !this.recDestination || this.isRecording) return false;

    this.recordedChunks = [];
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    let selectedMime = '';
    for (const m of mimeTypes) {
      if (typeof window !== 'undefined' && window.MediaRecorder && MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    try {
      this.mediaRecorder = selectedMime
        ? new MediaRecorder(this.recDestination.stream, { mimeType: selectedMime, audioBitsPerSecond: 320000 })
        : new MediaRecorder(this.recDestination.stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      return true;
    } catch (err) {
      console.warn('Live Recording initialization error:', err);
      return false;
    }
  }

  /**
   * Stop recording and return Blob + metadata for instant download.
   */
  async stopLiveRecording() {
    if (!this.mediaRecorder || !this.isRecording) return null;

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const mime = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        const durationSec = Math.round((Date.now() - this.recordingStartTime) / 1000);
        this.isRecording = false;
        this.mediaRecorder = null;
        resolve({
          blob,
          mime,
          durationSec,
          filename: `Aberamentho_Live_Set_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.webm`
        });
      };
      this.mediaRecorder.stop();
    });
  }

  /**
   * Temporary pitch nudge (Pioneer CDJ-3000 pitch bend).
   * @param {string} deckId - 'alpha' | 'beta'
   * @param {number} direction - +1 (accelerate) or -1 (decelerate)
   */
  nudgeDeck(deckId, direction = 1) {
    const deck = this.decks[deckId];
    if (!deck || !this.ctx || !deck.isPlaying) return;

    const baseRate = deck.playbackRate;
    const bendFactor = direction > 0 ? 1.028 : 0.972;
    const temporaryRate = baseRate * bendFactor;

    if (deck.sourceNode) {
      deck.sourceNode.playbackRate.setValueAtTime(temporaryRate, this.ctx.currentTime);
      setTimeout(() => {
        if (deck.isPlaying && deck.sourceNode && this.ctx) {
          deck.sourceNode.playbackRate.setTargetAtTime(baseRate, this.ctx.currentTime, 0.04);
        }
      }, 320);
    }
  }
}
'@

if ($acContent.Contains($oldClassEnd)) {
    $acContent = $acContent.Replace($oldClassEnd, $newAudioMethods)
    Write-Host "  [OK] audio-context.js: Métodos startLiveRecording, stopLiveRecording y nudgeDeck agregados" -ForegroundColor Green
}

[System.IO.File]::WriteAllText($audioContextPath, $acContent, [System.Text.Encoding]::UTF8)

# ------------------------------------------------------------------------------
# 2. Modificar src/ui/visualizer.js (Cimática Sagrada en Vivo)
# ------------------------------------------------------------------------------
$visualizerPath = Join-Path $targetRoot "src\ui\visualizer.js"
$visContent = Get-Content $visualizerPath -Raw

$oldDrawFFT = @'
    for (let i = 0; i < 64; i++) {
      const val = dataArray[i * 2] / 255;
      const barHeight = val * height;

      // Gradient from cyan to purple to gold
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, '#00f0ff');
      gradient.addColorStop(0.6, '#9d4edd');
      gradient.addColorStop(1, '#f5c518');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

      x += barWidth;
    }
  }
'@

$newDrawFFT = @'
    for (let i = 0; i < 64; i++) {
      const val = dataArray[i * 2] / 255;
      const barHeight = val * height;

      // Gradient from cyan to purple to gold
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, '#00f0ff');
      gradient.addColorStop(0.6, '#9d4edd');
      gradient.addColorStop(1, '#f5c518');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

      x += barWidth;
    }

    // Sacred Cymatics Harmonic Overlay (Flower of Life / Golden Ratio Resonator)
    const subEnergy = (dataArray[1] + dataArray[2] + dataArray[3]) / (255 * 3);
    const midEnergy = (dataArray[10] + dataArray[15] + dataArray[20]) / (255 * 3);
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = 14 + subEnergy * 24;

    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(255, 183, 3, ${0.25 + subEnergy * 0.55})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Golden Ratio Petals (PHI = 1.618)
    const phi = 1.618;
    const petalRadius = baseRadius * 0.618;
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + midEnergy * 0.5})`;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      const px = centerX + Math.cos(angle) * petalRadius;
      const py = centerY + Math.sin(angle) * petalRadius;
      ctx.beginPath();
      ctx.arc(px, py, petalRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shockwave pulse during Automix Bass Swap
    if (this.automix && this.automix.isTransitioning && this.automix.bassSwapped) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
'@

if ($visContent.Contains($oldDrawFFT)) {
    $visContent = $visContent.Replace($oldDrawFFT, $newDrawFFT)
    [System.IO.File]::WriteAllText($visualizerPath, $visContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] visualizer.js: Cimática Sagrada y Resonador Toroidal integrados" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 3. Modificar src/ui/deck-controller.js (Grabador, MediaSession, Nudge y Teclado)
# ------------------------------------------------------------------------------
$deckControllerPath = Join-Path $targetRoot "src\ui\deck-controller.js"
$dcContent = Get-Content $deckControllerPath -Raw

$oldInit = @'
    this._bindHeaderNavigation();
    if (this.vault) {
      this._bindMasterPillars();
      this._bindArtistGalleryPrioritization();
    }
  }
'@

$newInit = @'
    this._bindHeaderNavigation();
    this._bindMasterRecorder();
    this._bindPerformanceShortcuts();
    this._bindJogWheelNudge('alpha');
    this._bindJogWheelNudge('beta');
    if (this.vault) {
      this._bindMasterPillars();
      this._bindArtistGalleryPrioritization();
    }
  }
'@

if ($dcContent.Contains($oldInit)) {
    $dcContent = $dcContent.Replace($oldInit, $newInit)
    Write-Host "  [OK] deck-controller.js: Inicializadores de Grabador, Nudge y Atajos conectados" -ForegroundColor Green
}

$oldDcEnd = @'
    if (sourcePillBeta) {
      sourcePillBeta.classList.toggle('solar', isPerfect);
      sourcePillBeta.classList.toggle('retro', isRetro);
      const icon = sourcePillBeta.querySelector('.source-icon');
      if (icon) icon.textContent = currentCfg.icon;
    }
  }
}
'@

$newDcMethods = @'
    if (sourcePillBeta) {
      sourcePillBeta.classList.toggle('solar', isPerfect);
      sourcePillBeta.classList.toggle('retro', isRetro);
      const icon = sourcePillBeta.querySelector('.source-icon');
      if (icon) icon.textContent = currentCfg.icon;
    }

    this._syncMediaSession(playlist);
  }

  _syncMediaSession(playlist) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const activeDeck = this.audio.decks[this.automix.activeDeckId];
    const trackTitle = activeDeck && activeDeck.title ? activeDeck.title : 'Aberamentho Pleroma Hymn';
    const pillarName = playlist && playlist.name ? playlist.name : 'Santuario Solar';

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: 'Aberamentho · DJ GOD 10/10 PRO',
        album: `Santuario Pleroma // ${pillarName}`,
        artwork: [
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        this.audio.playDeck(this.automix.activeDeckId);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.audio.pauseDeck(this.automix.activeDeckId);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.automix.triggerAutomix();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.audio.stopDeck(this.automix.activeDeckId);
        this.audio.playDeck(this.automix.activeDeckId);
      });
    } catch (e) {
      // Ignore unsupported action handler errors
    }
  }

  _bindJogWheelNudge(deckId) {
    const jog = document.getElementById(`jog-wheel-${deckId}`);
    if (!jog) return;

    // Wheel event for desktop DJ feel
    jog.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      this.audio.nudgeDeck(deckId, dir);
      jog.classList.add('nudging');
      setTimeout(() => jog.classList.remove('nudging'), 280);
    }, { passive: false });

    // Touch/click drag for mobile and quick nudge
    let startX = 0;
    jog.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
    });
    jog.addEventListener('pointerup', (e) => {
      const diff = e.clientX - startX;
      if (Math.abs(diff) > 10) {
        this.audio.nudgeDeck(deckId, diff > 0 ? 1 : -1);
        jog.classList.add('nudging');
        setTimeout(() => jog.classList.remove('nudging'), 280);
      }
    });
  }

  _bindMasterRecorder() {
    const recBtn = document.getElementById('btn-master-rec');
    const recLabel = document.getElementById('rec-status-label');
    const recTimer = document.getElementById('rec-timer');
    if (!recBtn) return;

    let timerInterval = null;

    recBtn.addEventListener('click', async () => {
      await this.audio.init();

      if (!this.audio.isRecording) {
        const ok = this.audio.startLiveRecording();
        if (ok) {
          recBtn.classList.add('recording');
          if (recLabel) recLabel.textContent = 'DETENER Y GUARDAR SET';
          if (recTimer) {
            recTimer.style.display = 'inline-block';
            let sec = 0;
            recTimer.textContent = '00:00';
            timerInterval = setInterval(() => {
              sec++;
              const m = String(Math.floor(sec / 60)).padStart(2, '0');
              const s = String(sec % 60).padStart(2, '0');
              recTimer.textContent = `${m}:${s}`;
            }, 1000);
          }
        }
      } else {
        if (timerInterval) clearInterval(timerInterval);
        const recordData = await this.audio.stopLiveRecording();
        recBtn.classList.remove('recording');
        if (recLabel) recLabel.textContent = '✓ SET GUARDADO';
        if (recTimer) recTimer.style.display = 'none';

        if (recordData && recordData.blob) {
          const url = URL.createObjectURL(recordData.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = recordData.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => {
            URL.revokeObjectURL(url);
            if (recLabel) recLabel.textContent = 'GRABAR SET EN VIVO (HI-FI)';
          }, 3500);
        }
      }
    });
  }

  _bindPerformanceShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        const activeDeckId = this.automix.activeDeckId;
        const deck = this.audio.decks[activeDeckId];
        const playBtn = document.getElementById(`btn-play-${activeDeckId}`);
        if (deck.isPlaying) {
          this.audio.pauseDeck(activeDeckId);
          if (playBtn) {
            playBtn.classList.remove('active');
            playBtn.textContent = '▶ PLAY';
          }
        } else {
          this.audio.playDeck(activeDeckId);
          if (playBtn) {
            playBtn.classList.add('active');
            playBtn.textContent = '⏸ PAUSE';
          }
        }
      } else if (e.key === 'b' || e.key === 'B') {
        const swapBtn = document.getElementById('btn-instant-bass-swap');
        if (swapBtn) swapBtn.click();
      } else if (e.key === 'm' || e.key === 'M') {
        const autoBtn = document.getElementById('btn-trigger-automix');
        if (autoBtn) autoBtn.click();
      } else if (e.key === 'q' || e.key === 'Q') {
        this.audio.nudgeDeck('alpha', -1);
      } else if (e.key === 'w' || e.key === 'W') {
        this.audio.nudgeDeck('alpha', 1);
      } else if (e.key === 'o' || e.key === 'O') {
        this.audio.nudgeDeck('beta', -1);
      } else if (e.key === 'p' || e.key === 'P') {
        this.audio.nudgeDeck('beta', 1);
      }
    });
  }
}
'@

if ($dcContent.Contains($oldDcEnd)) {
    $dcContent = $dcContent.Replace($oldDcEnd, $newDcMethods)
    [System.IO.File]::WriteAllText($deckControllerPath, $dcContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] deck-controller.js: Control de Timón MediaSession, Grabador, Nudge y Atajos integrados" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 4. Modificar index.html (Agregar botón de Grabación Master y atajos en cabecera)
# ------------------------------------------------------------------------------
$indexPath = Join-Path $targetRoot "index.html"
$idxContent = Get-Content $indexPath -Raw

$oldHeaderActions = @'
    <div class="header-actions">
      <button class="btn btn-legends-trigger" id="btn-open-legends" aria-label="Ver Galería de Leyendas del Trance" style="background: rgba(255,183,3,0.12); border: 1px solid var(--color-beta); color: var(--color-beta); border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 800; font-family: var(--font-mono); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        🏛️ LEYENDAS TRANCE
      </button>
      <button class="btn btn-pwa-install" id="btn-pwa-install" aria-label="Instalar como App Nativa" style="background: rgba(0,240,255,0.12); border: 1px solid var(--color-alpha); color: var(--color-alpha); border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 800; font-family: var(--font-mono); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        📲 INSTALAR APP
      </button>
    </div>
'@

$newHeaderActions = @'
    <div class="header-actions">
      <button class="btn btn-shortcuts-trigger" id="btn-open-shortcuts" onclick="alert('✦ ATAJOS DE TECLADO DJ PRO:\n\n[Espacio] : Play / Pausa Deck Activo\n[B] : Bass Swap Instantáneo\n[M] : Lanzar Automix Armónico\n[Q / W] : Nudge -/+ Deck Alpha\n[O / P] : Nudge -/+ Deck Beta\n[Esc] : Cerrar Modales\n\nCompatible con Timón Bluetooth / CarPlay / Android Auto')" aria-label="Ver atajos de teclado profesionales" style="background: rgba(16,185,129,0.14); border: 1px solid #10b981; color: #10b981; border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 800; font-family: var(--font-mono); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        ⌨️ ATAJOS PRO
      </button>
      <button class="btn btn-legends-trigger" id="btn-open-legends" aria-label="Ver Galería de Leyendas del Trance" style="background: rgba(255,183,3,0.12); border: 1px solid var(--color-beta); color: var(--color-beta); border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 800; font-family: var(--font-mono); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        🏛️ LEYENDAS TRANCE
      </button>
      <button class="btn btn-pwa-install" id="btn-pwa-install" aria-label="Instalar como App Nativa" style="background: rgba(0,240,255,0.12); border: 1px solid var(--color-alpha); color: var(--color-alpha); border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 800; font-family: var(--font-mono); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
        📲 INSTALAR APP
      </button>
    </div>
'@

if ($idxContent.Contains($oldHeaderActions)) {
    $idxContent = $idxContent.Replace($oldHeaderActions, $newHeaderActions)
}

$oldMixerFFT = @'
      <!-- Real-time Master Frequency Spectrum -->
      <div class="master-fft-box">
        <canvas id="master-fft" width="220" height="90" class="fft-canvas"></canvas>
      </div>
'@

$newMixerFFT = @'
      <!-- Real-time Master Frequency Spectrum + Sacred Cymatics -->
      <div class="master-fft-box">
        <canvas id="master-fft" width="220" height="90" class="fft-canvas"></canvas>
      </div>

      <!-- Live Master Set Recorder -->
      <div class="master-recorder-box" id="master-recorder-box" style="margin: 10px 0; text-align: center;">
        <button class="btn-master-rec" id="btn-master-rec" type="button" aria-label="Grabar set en vivo en calidad de estudio" style="width: 100%; padding: 8px 12px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.45); color: #fca5a5; border-radius: 10px; font-family: var(--font-mono); font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.25s ease;">
          <span class="rec-icon" style="font-size: 12px;">🔴</span>
          <span class="rec-label" id="rec-status-label">GRABAR SET EN VIVO (HI-FI)</span>
          <span class="rec-timer" id="rec-timer" style="display: none; background: rgba(239, 68, 68, 0.25); padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #fff;">00:00</span>
        </button>
      </div>
'@

if ($idxContent.Contains($oldMixerFFT)) {
    $idxContent = $idxContent.Replace($oldMixerFFT, $newMixerFFT)
    [System.IO.File]::WriteAllText($indexPath, $idxContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] index.html: Botón de Grabador Hi-Fi y Atajos integrados" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 5. Modificar style.css (Animación de grabación y Nudge)
# ------------------------------------------------------------------------------
$stylePath = Join-Path $targetRoot "style.css"
$cssContent = Get-Content $stylePath -Raw

$extraCSS = @'

/* LIVE RECORDER & NUDGE STYLING (GOD TIER 10/10) */
.btn-master-rec:hover {
  background: rgba(239, 68, 68, 0.2) !important;
  border-color: #ef4444 !important;
  color: #fff !important;
}

.btn-master-rec.recording {
  background: rgba(239, 68, 68, 0.35) !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.6) !important;
  animation: recPulse 1.5s infinite ease-in-out;
}

@keyframes recPulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.jog-wheel.nudging {
  border-color: var(--color-alpha) !important;
  box-shadow: 0 0 25px rgba(0, 240, 255, 0.8) !important;
  transform: scale(1.02);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
'@

if (-not $cssContent.Contains("btn-master-rec.recording")) {
    $cssContent += $extraCSS
    [System.IO.File]::WriteAllText($stylePath, $cssContent, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] style.css: Estilos y animaciones de Grabación y Nudge agregados" -ForegroundColor Green
}

Write-Host "`nElevación a la Máxima Gloria completada exitosamente." -ForegroundColor Cyan
