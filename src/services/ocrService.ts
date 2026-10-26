import { createWorker, type Worker } from 'tesseract.js'
import { HapticsService } from './hapticsService'
import { TtsService } from './ttsService'
import { AudioFeedbackService } from './audioFeedbackService'

export interface OcrResult {
  text: string
  confidence: number
  matchedEmergencyKeyword?: string
  guidanceMessage?: string
}

const EMERGENCY_KEYWORDS: Record<string, string> = {
  SALIDA: 'Salida de emergencia localizada al frente. Continúe con precaución.',
  EXIT: 'Salida localizada al frente.',
  EMERGENCIA: 'Señal de Emergencia detectada.',
  EVACUACION: 'Ruta de evacuación identificada.',
  EVACUACIÓN: 'Ruta de evacuación identificada.',
  SANITARIOS: 'Área de sanitarios identificada.',
  BAÑOS: 'Área de sanitarios identificada.',
  WC: 'Área de sanitarios identificada.',
  EXTINTOR: 'Punto con extintor de emergencia.',
  PELIGRO: '¡Atención! Señal de peligro al frente.',
  CUIDADO: '¡Atención! Zona de precaución.',
  PRECAUCION: '¡Atención! Zona de precaución.',
  PRECAUCIÓN: '¡Atención! Zona de precaución.',
  NO_PASAR: 'Acceso restringido. No continúe por este camino.',
  PROHIBIDO: 'Acceso prohibido.',
  ACCESO: 'Acceso o puerta identificada.',
  ENTRADA: 'Entrada o acceso identificado.',
  ESCALERAS: 'Precaución: escalones o desnivel en el suelo.',
  ESCALERA: 'Precaución: escalones o desnivel.',
  EMPUJE: 'Puerta: empuje hacia adelante.',
  JALE: 'Puerta: jale hacia usted.',
  PULL: 'Puerta: jale hacia usted.',
  PUSH: 'Puerta: empuje hacia adelante.',
  ZONA_SEGURA: 'Zona segura identificada.',
  BOTIQUIN: 'Punto de primeros auxilios.',
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function normalizeLeetText(text: string): string {
  return text
    .toUpperCase()
    .replace(/5/g, 'S')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/3/g, 'E')
    .replace(/4/g, 'A')
    .replace(/8/g, 'B')
    .replace(/\|/g, 'I')
    .replace(/\$/g, 'S')
    .replace(/@/g, 'A')
}

export class OcrService {
  private static worker: Worker | null = null
  private static isInitializing = false
  private static isProcessing = false

  public static async initWorker(): Promise<void> {
    if (this.worker || this.isInitializing) return
    this.isInitializing = true
    try {
      // 1. Intento principal: español
      this.worker = await createWorker('spa')
    } catch {
      try {
        // 2. Fallback resiliente: inglés (reconoce SALIDA, EXIT, DANGER, etc.)
        this.worker = await createWorker('eng')
      } catch (err) {
        console.warn('No se pudo inicializar Tesseract OCR:', err)
      }
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * Pre-procesa la imagen de la cámara con realce de contraste adaptativo
   * en lugar de binarización 1-bit destructiva, preservando los bordes tipográficos.
   */
  public static preprocessForOcr(
    canvas: HTMLCanvasElement,
    cropX: number,
    cropY: number,
    cropW: number,
    cropH: number
  ): HTMLCanvasElement {
    // Escalar la región de recorte si es menor a 600px para que las letras tengan suficiente densidad
    const scaleFactor = cropW < 600 ? Math.min(2.5, 600 / cropW) : 1
    const targetW = Math.round(cropW * scaleFactor)
    const targetH = Math.round(cropH * scaleFactor)

    const ocrCanvas = document.createElement('canvas')
    ocrCanvas.width = targetW
    ocrCanvas.height = targetH
    const ctx = ocrCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return canvas

    // Dibujar recorte con escalado suave
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH)

    const imgData = ctx.getImageData(0, 0, targetW, targetH)
    const data = imgData.data

    // 1. Calcular histograma y límites de luminancia
    let minLum = 255
    let maxLum = 0
    const lums = new Uint8Array(data.length / 4)

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      // Percepción de luminancia estándar ITU-R BT.601
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      lums[j] = lum
      if (lum < minLum) minLum = lum
      if (lum > maxLum) maxLum = lum
    }

    const lumRange = Math.max(20, maxLum - minLum)

    // 2. Estiramiento de contraste dinámico (Contrast Stretching) + Gamma suave
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const normalized = (lums[j] - minLum) / lumRange
      // Corrección gamma suave para resaltar tipografías oscuras o claras en penumbra
      const enhanced = Math.round(Math.pow(Math.max(0, Math.min(1, normalized)), 0.85) * 255)
      data[i] = enhanced
      data[i + 1] = enhanced
      data[i + 2] = enhanced
    }

    ctx.putImageData(imgData, 0, 0)
    return ocrCanvas
  }

  /**
   * Ejecuta el reconocimiento sobre el canvas de alta resolución y pronuncia el resultado
   */
  public static async recognizeText(
    sourceCanvas: HTMLCanvasElement,
    cropRect?: { x: number; y: number; w: number; h: number }
  ): Promise<OcrResult | null> {
    if (this.isProcessing) return null

    this.isProcessing = true
    try {
      if (!this.worker) {
        await this.initWorker()
      }
      if (!this.worker) {
        this.isProcessing = false
        return null
      }

      // Encuadre central donde el usuario apunta el visor a la señal (60% ancho, 40% alto)
      const rect = cropRect || {
        x: Math.floor(sourceCanvas.width * 0.15),
        y: Math.floor(sourceCanvas.height * 0.25),
        w: Math.floor(sourceCanvas.width * 0.7),
        h: Math.floor(sourceCanvas.height * 0.5),
      }

      const preprocessed = this.preprocessForOcr(sourceCanvas, rect.x, rect.y, rect.w, rect.h)

      const ret = await this.worker.recognize(preprocessed)
      const rawText = ret.data.text.trim()
      const confidence = ret.data.confidence

      if (!rawText || rawText.length < 2) {
        return null
      }

      // Normalizar texto
      const cleanUpper = rawText.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9\s]/g, '')
      const leetNormalized = normalizeLeetText(cleanUpper)
      const words = leetNormalized.split(/\s+/).filter(w => w.length >= 2)

      let matchedKeyword: string | undefined
      let guidanceMessage: string | undefined

      // 1. Coincidencia exacta con leet-speak
      for (const word of words) {
        if (EMERGENCY_KEYWORDS[word]) {
          matchedKeyword = word
          guidanceMessage = EMERGENCY_KEYWORDS[word]
          break
        }
      }

      // 2. Coincidencia por sub-frase
      if (!guidanceMessage) {
        for (const [key, msg] of Object.entries(EMERGENCY_KEYWORDS)) {
          const keyNormalized = key.replace(/_/g, ' ')
          if (leetNormalized.includes(keyNormalized) || cleanUpper.includes(keyNormalized)) {
            matchedKeyword = key
            guidanceMessage = msg
            break
          }
        }
      }

      // 3. Coincidencia difusa (Fuzzy Levenshtein) para errores comunes de enfoque
      if (!guidanceMessage) {
        for (const word of words) {
          if (word.length >= 4) {
            for (const [key, msg] of Object.entries(EMERGENCY_KEYWORDS)) {
              if (key.length >= 4 && Math.abs(key.length - word.length) <= 1) {
                const dist = levenshteinDistance(word, key)
                if (dist <= 1) {
                  matchedKeyword = key
                  guidanceMessage = msg
                  break
                }
              }
            }
          }
          if (guidanceMessage) break
        }
      }

      const messageToSpeak = guidanceMessage || `Letrero detectado: ${rawText}`

      // Feedback auditivo y háptico
      AudioFeedbackService.playSuccessChime()
      HapticsService.signDetected()
      TtsService.speak(messageToSpeak)

      return {
        text: rawText,
        confidence,
        matchedEmergencyKeyword: matchedKeyword,
        guidanceMessage: messageToSpeak,
      }
    } catch (err) {
      console.warn('Error en recognizeText:', err)
      return null
    } finally {
      this.isProcessing = false
    }
  }

  public static isWorking(): boolean {
    return this.isProcessing || this.isInitializing
  }
}
