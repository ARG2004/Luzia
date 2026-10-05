export class AudioFeedbackService {
  private static ctx: AudioContext | null = null
  private static isMuted = false
  private static lastObstacleBeepTime = 0

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public static setMuted(muted: boolean): void {
    this.isMuted = muted
  }

  public static getMuted(): boolean {
    return this.isMuted
  }

  /**
   * Tono de advertencia fotosensible (frecuencias 3Hz - 30Hz)
   * Emite un tono bifrecuencia de alerta rápida
   */
  public static playStrobeAlarm(): void {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, now) // A5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15)
      osc.frequency.setValueAtTime(880, now + 0.16)
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3)

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.35)
    } catch {
      // Audio fallback
    }
  }

  /**
   * Beep de proximidad para obstáculos (cables o desniveles)
   * Se comporta como sensor de reversa / sónar: a mayor proximidad, tono más alto y mayor cadencia
   */
  public static playObstacleProximityBeep(intensity: number): void {
    if (this.isMuted) return
    const nowMs = Date.now()
    // Intervalo de cadencia entre 100ms (muy cerca) y 700ms (lejos)
    const minInterval = 100 + (1 - intensity) * 600
    if (nowMs - this.lastObstacleBeepTime < minInterval) {
      return
    }
    this.lastObstacleBeepTime = nowMs

    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // Tono entre 350 Hz (lejos) y 950 Hz (muy cerca)
      const freq = 350 + intensity * 600
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.09)
    } catch {
      // Audio fallback
    }
  }

  /**
   * Tono de reconocimiento óptico (Señalética detectada con éxito)
   */
  public static playSuccessChime(): void {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08) // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16) // G5

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.3)
    } catch {
      // Audio fallback
    }
  }

  /**
   * Baliza sonora de auxilio / Botón de pánico en la casa del terror
   */
  public static playPanicBeacon(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'square'
      osc.frequency.setValueAtTime(960, now)
      osc.frequency.linearRampToValueAtTime(600, now + 0.25)
      osc.frequency.linearRampToValueAtTime(960, now + 0.5)

      gain.gain.setValueAtTime(0.35, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.6)
    } catch {
      // Audio fallback
    }
  }

  /**
   * Sonido de cambio de cámara de seguridad / estática retro estilo FNAF
   */
  public static playCameraSwitchStatic(): void {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const bufferSize = Math.floor(ctx.sampleRate * 0.12)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.7
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1200, now)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start(now)
    } catch {
      // Audio fallback
    }
  }
}

