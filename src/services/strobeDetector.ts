export interface StrobeStatus {
  isDangerous: boolean
  frequencyHz: number
  currentLuminance: number
  deltaLuminance: number
  history: number[]
  riskLevel: 'SAFE' | 'LOW' | 'HIGH' | 'CRITICAL'
}

export class StrobeDetector {
  private static luminanceHistory: { time: number; lum: number }[] = []
  private static readonly MAX_HISTORY_MS = 2000 // Ventana de 2 segundos
  private static readonly MIN_FREQ = 3.0 // 3 Hz límite inferior fotosensible
  private static readonly MAX_FREQ = 30.0 // 30 Hz límite superior fotosensible
  private static readonly MIN_DELTA_LUM = 22 // Umbral mínimo de variación brusca (0-255)

  /**
   * Procesa un fotograma extrayendo la luminancia media Y = 0.299R + 0.587G + 0.114B
   * Utiliza una cuadrícula de muestreo rápida (step de 4 u 8 píxeles) para 60 FPS sin lag
   */
  public static analyzeFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    nowMs: number = performance.now()
  ): StrobeStatus {
    const sampleWidth = Math.min(width, 160)
    const sampleHeight = Math.min(height, 120)

    let imgData: ImageData
    try {
      imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight)
    } catch {
      return {
        isDangerous: false,
        frequencyHz: 0,
        currentLuminance: 0,
        deltaLuminance: 0,
        history: [],
        riskLevel: 'SAFE',
      }
    }

    const data = imgData.data
    let totalLum = 0
    let count = 0

    // Muestreo con salto de 4 píxeles para velocidad instantánea
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      // Fórmula estándar de luminancia ITU-R BT.601
      const y = 0.299 * r + 0.587 * g + 0.114 * b
      totalLum += y
      count++
    }

    const currentLum = count > 0 ? totalLum / count : 0

    // Agregar a la serie temporal
    this.luminanceHistory.push({ time: nowMs, lum: currentLum })

    // Limpiar muestras antiguas fuera de la ventana
    const cutoff = nowMs - this.MAX_HISTORY_MS
    while (this.luminanceHistory.length > 0 && this.luminanceHistory[0].time < cutoff) {
      this.luminanceHistory.shift()
    }

    // Análisis de frecuencia por detección de cruces por la media y picos
    if (this.luminanceHistory.length < 15) {
      return {
        isDangerous: false,
        frequencyHz: 0,
        currentLuminance: Math.round(currentLum),
        deltaLuminance: 0,
        history: this.luminanceHistory.map(h => h.lum),
        riskLevel: 'SAFE',
      }
    }

    // Calcular media y extremos
    let minLum = 255
    let maxLum = 0
    let sumLum = 0

    for (const h of this.luminanceHistory) {
      if (h.lum < minLum) minLum = h.lum
      if (h.lum > maxLum) maxLum = h.lum
      sumLum += h.lum
    }

    const avgLum = sumLum / this.luminanceHistory.length
    const deltaLum = maxLum - minLum

    // Conteo de cruces ascendentes por la media
    let zeroCrossings = 0
    let prevVal = this.luminanceHistory[0].lum - avgLum

    for (let i = 1; i < this.luminanceHistory.length; i++) {
      const curVal = this.luminanceHistory[i].lum - avgLum
      if (prevVal <= 0 && curVal > 0) {
        zeroCrossings++
      }
      prevVal = curVal
    }

    // Duración de la ventana de muestras en segundos
    const durationSec = (this.luminanceHistory[this.luminanceHistory.length - 1].time - this.luminanceHistory[0].time) / 1000
    const calculatedFreq = durationSec > 0.3 ? zeroCrossings / durationSec : 0

    // Evaluar si cae en la zona de riesgo fotosensible (3 a 30 Hz) con amplitud relevante
    const isDangerous =
      calculatedFreq >= this.MIN_FREQ &&
      calculatedFreq <= this.MAX_FREQ &&
      deltaLum >= this.MIN_DELTA_LUM

    let riskLevel: 'SAFE' | 'LOW' | 'HIGH' | 'CRITICAL' = 'SAFE'
    if (isDangerous) {
      if (calculatedFreq >= 10 && calculatedFreq <= 20 && deltaLum > 45) {
        riskLevel = 'CRITICAL' // La zona de mayor riesgo neurológico fotosensible (12-18 Hz)
      } else if (deltaLum > 35) {
        riskLevel = 'HIGH'
      } else {
        riskLevel = 'LOW'
      }
    }

    return {
      isDangerous,
      frequencyHz: Math.round(calculatedFreq * 10) / 10,
      currentLuminance: Math.round(currentLum),
      deltaLuminance: Math.round(deltaLum),
      history: this.luminanceHistory.slice(-40).map(h => h.lum),
      riskLevel,
    }
  }

  public static reset(): void {
    this.luminanceHistory = []
  }
}
