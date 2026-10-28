import { createWorker, type Worker } from 'tesseract.js'
import { isSkinTonePixel } from './obstacleScanner'

export interface OcrResult {
  text: string
  confidence: number
  matchedEmergencyKeyword?: string
  guidanceMessage?: string
  objectShape?: 'CIRCULAR_EMBLEM' | 'CARD_BADGE' | 'GENERAL_OBJECT'
  isUnclear?: boolean
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
  HOSPITAL: 'Punto médico o de primeros auxilios.',
  FUEGO: '¡Alerta! Indicación de fuego o extintor.',
  ALERTA: 'Señal de alerta identificada.',
  SILENCIO: 'Zona de silencio requerida.',
  RESTRINGIDO: 'Área de acceso restringido.',
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

// Vocabulario validado de siglas y palabras cortas aprobadas (2 o 3 letras)
const VALID_SHORT_WORDS = new Set([
  'WC', 'NO', 'OK', 'SOS', 'IN', 'ON', 'UP', 'GO', 'BUS', 'BAR', 'GAS', 'RED', 'LUZ', 'PAZ', 'VIA', 'VÍA', 'ID', 'VIP', 'QR', 'SUR', 'SOL'
])

export function isLinguisticallyValidWord(word: string): boolean {
  if (!word) return false
  const clean = word.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g, '')
  if (clean.length < 2) return false
  if (VALID_SHORT_WORDS.has(clean)) return true

  // Si es o se parece a una palabra clave de emergencia conocida
  if (EMERGENCY_KEYWORDS[clean]) return true
  for (const key of Object.keys(EMERGENCY_KEYWORDS)) {
    if (key.length >= 4 && Math.abs(key.length - clean.length) <= 1 && levenshteinDistance(clean, key) <= 1) {
      return true
    }
  }

  // Palabras de 2 letras que no pertenezcan al listado autorizado se descartan como ruido óptico
  if (clean.length === 2) return false

  // Descartar repeticiones no naturales (ej: "AAAA", "XXXX", "LLLL")
  if (/(.)\1\1/.test(clean)) return false

  // Cualquier palabra de 3 o más letras en español o inglés DEBE contener al menos una vocal
  const vowelMatches = clean.match(/[AEIOUÁÉÍÓÚY]/g)
  if (!vowelMatches || vowelMatches.length === 0) return false

  // Proporción consonante/vocal: evitar agrupaciones caóticas de consonantes producidas por arrugas o sombras
  const vowelCount = vowelMatches.length
  const consonantCount = clean.length - vowelCount
  if (clean.length >= 5 && consonantCount > vowelCount * 4) return false

  return true
}

/**
 * Analizador Visual de Formas y Objetos:
 * Identifica la geometría física del objeto enfocado:
 * - Insignias o emblemas circulares (medallas, parches, sellos circulares)
 * - Gafetes, credenciales o tarjetas rectangulares
 * - Objetos generales o letreros
 */
export function detectGeometricShape(
  sourceCanvas: HTMLCanvasElement
): { shape: 'CIRCULAR_EMBLEM' | 'CARD_BADGE' | 'GENERAL_OBJECT'; confidence: number; label: string } {
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { shape: 'GENERAL_OBJECT', confidence: 0, label: 'Objeto al frente' }

  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  const cx = w / 2
  const cy = h / 2
  const maxR = Math.min(w, h) * 0.44
  const minR = Math.min(w, h) * 0.12

  let edgeCount = 0
  const radialBuckets = new Array(24).fill(0)
  let horizontalLines = 0
  let verticalLines = 0

  for (let y = Math.floor(h * 0.12); y < Math.floor(h * 0.88); y += 3) {
    for (let x = Math.floor(w * 0.12); x < Math.floor(w * 0.88); x += 3) {
      const idx = (y * w + x) * 4
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]

      const rightIdx = (y * w + (x + 2)) * 4
      const rLum = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2]

      const downIdx = ((y + 2) * w + x) * 4
      const dLum = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2]

      const gx = Math.abs(lum - rLum)
      const gy = Math.abs(lum - dLum)
      const mag = gx + gy

      if (mag > 26) {
        edgeCount++
        if (gx > gy * 1.7) verticalLines++
        if (gy > gx * 1.7) horizontalLines++

        const dx = x - cx
        const dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist >= minR && dist <= maxR) {
          const bucket = Math.floor(((dist - minR) / (maxR - minR)) * 24)
          if (bucket >= 0 && bucket < 24) {
            radialBuckets[bucket]++
          }
        }
      }
    }
  }

  // Detección de círculo / anillo emblemático (pico radial concentrado):
  const maxBucketVal = Math.max(...radialBuckets)
  const isCircle = edgeCount > 60 && maxBucketVal > 40 && maxBucketVal > (edgeCount / 14)

  if (isCircle) {
    return {
      shape: 'CIRCULAR_EMBLEM',
      confidence: 88,
      label: 'Insignia o emblema circular',
    }
  }

  // Detección de gafete o tarjeta rectangular:
  if (edgeCount > 60 && horizontalLines > 48 && verticalLines > 42) {
    return {
      shape: 'CARD_BADGE',
      confidence: 82,
      label: 'Gafete o credencial',
    }
  }

  return {
    shape: 'GENERAL_OBJECT',
    confidence: 60,
    label: 'Objeto al frente',
  }
}

export class OcrService {
  private static worker: Worker | null = null
  private static isInitializing = false
  private static isProcessing = false
  private static isReady = false

  public static async initWorker(): Promise<void> {
    if (this.worker || this.isInitializing) return
    this.isInitializing = true
    try {
      this.worker = await createWorker(['spa', 'eng'])
      try {
        // PSM 11 = SPARSE_TEXT (Encuentra texto en cualquier orientación, letreros, círculos, gafetes y logos)
        // tessedit_char_whitelist: restringe a caracteres alfanuméricos válidos y signos de espacio/guion, eliminando símbolos basura
        await this.worker.setParameters({
          tessedit_pageseg_mode: '11' as unknown as string,
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚáéíóúÑñ -' as unknown as string,
        } as unknown as Record<string, string>)
      } catch {
        // Continuar
      }
      this.isReady = true
    } catch {
      try {
        this.worker = await createWorker('spa')
        this.isReady = true
      } catch {
        try {
          this.worker = await createWorker('eng')
          this.isReady = true
        } catch (err) {
          console.warn('No se pudo inicializar Tesseract OCR:', err)
          this.isReady = false
        }
      }
    } finally {
      this.isInitializing = false
    }
  }

  public static isWorkerReady(): boolean {
    return this.isReady || !!this.worker
  }

  /**
   * Preprocesamiento Óptico Natural de Alta Definición:
   * Conserva el suavizado de bordes (anti-aliasing) que la red neuronal de Tesseract necesita
   * para reconocer fuentes tipográficas estilizadas, contornos y letras en curva.
   */
  public static preprocessForOcr(
    canvas: HTMLCanvasElement,
    cropX: number,
    cropY: number,
    cropW: number,
    cropH: number,
    invertPolarity?: boolean
  ): HTMLCanvasElement {
    const ocrCanvas = document.createElement('canvas')
    ocrCanvas.width = cropW
    ocrCanvas.height = cropH
    const ctx = ocrCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return canvas

    ctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    const imgData = ctx.getImageData(0, 0, cropW, cropH)
    const data = imgData.data

    let minLum = 255
    let maxLum = 0
    let totalLum = 0
    const pixelCount = cropW * cropH

    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      totalLum += lum
      if (lum < minLum) minLum = lum
      if (lum > maxLum) maxLum = lum
    }

    const meanLum = pixelCount > 0 ? totalLum / pixelCount : 128
    const isDarkBg = meanLum < 125
    const shouldInvert = invertPolarity !== undefined ? invertPolarity : isDarkBg
    const lumRange = Math.max(35, maxLum - minLum)

    // Estiramiento de contraste dinámico con preservación de tonos continuos
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b

      let norm = (lum - minLum) / lumRange
      norm = Math.max(0, Math.min(1, norm))

      if (shouldInvert) {
        norm = 1.0 - norm
      }

      // Curva s-shape para tipografía limpia sin destruir trazos finos
      const enhanced = Math.round(Math.pow(norm, 1.1) * 255)
      data[i] = enhanced
      data[i + 1] = enhanced
      data[i + 2] = enhanced
    }

    ctx.putImageData(imgData, 0, 0)
    return ocrCanvas
  }

  /**
   * Intento con API nativa por hardware si existe en el navegador
   */
  private static async tryNativeTextDetector(canvas: HTMLCanvasElement): Promise<string | null> {
    if (typeof window !== 'undefined' && 'TextDetector' in window) {
      try {
        const detector = new (window as unknown as { TextDetector: new () => { detect: (c: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>> } }).TextDetector()
        const detected = await detector.detect(canvas)
        if (detected && detected.length > 0) {
          const joined = detected
            .map(d => d.rawValue)
            .filter(Boolean)
            .join(' ')
            .trim()
          if (joined.length >= 2) {
            return joined
          }
        }
      } catch {
        // Continuar a Tesseract
      }
    }
    return null
  }

  /**
   * Puntuación de calidad de texto: evalúa palabras reales y descarta ruido
   */
  public static scoreOcrResult(rawText: string, confidence: number): number {
    if (!rawText) return 0
    const cleanTokens = rawText
      .split(/\s+/)
      .map(w => w.replace(/^[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+|[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+$/g, ''))
      .filter(w => isLinguisticallyValidWord(w))

    if (cleanTokens.length === 0) return 0

    let score = confidence
    for (const token of cleanTokens) {
      const upper = token.toUpperCase()
      if (EMERGENCY_KEYWORDS[upper]) {
        score += 250
      }
      if (token.length >= 4) {
        score += token.length * 15
      } else if (token.length >= 3) {
        score += 10
      }
    }

    return score
  }

  /**
   * Formateo multimodal del resultado:
   * Integra la forma del objeto detectado (emblema circular, gafete o letrero)
  /**
   * Detector de presencia humana por visión artificial y API nativa:
   * Evita confundir a una persona humana con una señal o un gafete
   */
  public static async isHumanInCanvas(sourceCanvas: HTMLCanvasElement): Promise<boolean> {
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const FaceDetectorCtor = (window as unknown as {
          FaceDetector: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
            detect: (c: HTMLCanvasElement) => Promise<Array<unknown>>
          }
        }).FaceDetector
        const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 })
        const faces = await detector.detect(sourceCanvas)
        if (faces && faces.length > 0) return true
      } catch {
        // Continuar a análisis óptico por píxeles
      }
    }

    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return false
    const w = sourceCanvas.width
    const h = sourceCanvas.height
    const imgData = ctx.getImageData(0, 0, w, h)
    const data = imgData.data

    let skinCount = 0
    let totalSamples = 0
    const startY = Math.floor(h * 0.10)
    const endY = Math.floor(h * 0.58)
    const startX = Math.floor(w * 0.22)
    const endX = Math.floor(w * 0.78)

    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        const idx = (y * w + x) * 4
        totalSamples++
        if (isSkinTonePixel(data[idx], data[idx + 1], data[idx + 2])) {
          skinCount++
        }
      }
    }

    return totalSamples > 0 && (skinCount / totalSamples) > 0.04
  }

  /**
   * Formateo multimodal del resultado:
   * Integra la forma del objeto detectado con las palabras y la presencia humana.
   * Regla de Identidad: NUNCA llama a una persona "señal" o "gafete"; la reconoce como HUMANO.
   */
  public static formatResult(
    rawText: string,
    confidence: number,
    detectedShape?: { shape: 'CIRCULAR_EMBLEM' | 'CARD_BADGE' | 'GENERAL_OBJECT'; label: string },
    isHumanPresent = false
  ): OcrResult | null {
    if (!rawText) return null

    // 1. Limpieza de caracteres no lingüísticos y extracción de palabras
    const rawTokens = (rawText || '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[|~_—–\\/«»[\]{}%*+^$#@_()]/g, ' ')
      .split(/\s+/)

    // 2. Filtro lingüístico anti-alucinación: solo aceptar palabras verificables
    const validWords: string[] = []
    for (const rawToken of rawTokens) {
      const trimmed = rawToken.replace(/^[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+|[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+$/g, '')
      if (isLinguisticallyValidWord(trimmed)) {
        validWords.push(trimmed)
      }
    }

    // Regla Zero-Hallucination: Si no hay palabras válidas, jamás inventar objetos o insignias
    if (validWords.length === 0) {
      return null
    }

    const cleanText = validWords.join(' ').trim()
    if (cleanText.length < 2) {
      return null
    }

    // Si hay texto: verificar si es o coincide con señal de emergencia
    const cleanUpper = cleanText.toUpperCase()
    const leetNormalized = normalizeLeetText(cleanUpper)
    const normWords = leetNormalized.split(/\s+/).filter(w => w.length >= 2)

    let matchedKeyword: string | undefined
    let guidanceMessage: string | undefined

    for (const word of normWords) {
      if (EMERGENCY_KEYWORDS[word]) {
        matchedKeyword = word
        guidanceMessage = `${EMERGENCY_KEYWORDS[word]} (Texto: "${cleanText}")`
        break
      }
    }

    if (!guidanceMessage) {
      for (const [key, msg] of Object.entries(EMERGENCY_KEYWORDS)) {
        const keyNormalized = key.replace(/_/g, ' ')
        if (leetNormalized.includes(keyNormalized) || cleanUpper.includes(keyNormalized)) {
          matchedKeyword = key
          guidanceMessage = `${msg} (Texto: "${cleanText}")`
          break
        }
      }
    }

    if (!guidanceMessage) {
      for (const word of normWords) {
        if (word.length >= 4) {
          for (const [key, msg] of Object.entries(EMERGENCY_KEYWORDS)) {
            if (key.length >= 4 && Math.abs(key.length - word.length) <= 1) {
              const dist = levenshteinDistance(word, key)
              if (dist <= 1) {
                matchedKeyword = key
                guidanceMessage = `${msg} (Texto: "${cleanText}")`
                break
              }
            }
          }
        }
        if (guidanceMessage) break
      }
    }

    // DIRECTIVA ANTI-ALUCINACIÓN ESTRICTA (Cero falsos letreros en suelos o texturas):
    // Si la confianza es < 58% y no se detectó una palabra clave de emergencia real (SALIDA, PELIGRO, etc.),
    // descartar totalmente. NUNCA inventar "letrero no claro" ni "gafete" ante suelo, ropa o muebles.
    if (!matchedKeyword && (confidence < 58 || cleanText.length < 3)) {
      return null
    }

    const shape = detectedShape || { shape: 'GENERAL_OBJECT' as const, label: 'Objeto al frente' }
    let isUnclear = false
    let finalSpeech = guidanceMessage
    if (!finalSpeech) {
      if (isHumanPresent) {
        // NUNCA decir que la persona es un gafete o señal: es una PERSONA con gafete/identificación
        if (shape.shape === 'CARD_BADGE' || shape.shape === 'CIRCULAR_EMBLEM') {
          finalSpeech = `Persona con gafete: ${cleanText}`
        } else {
          finalSpeech = `Persona al frente: ${cleanText}`
        }
      } else {
        if (shape.shape === 'CARD_BADGE') {
          finalSpeech = `Gafete o credencial: ${cleanText}`
        } else if (shape.shape === 'CIRCULAR_EMBLEM') {
          finalSpeech = `Insignia o letrero circular: ${cleanText}`
        } else {
          finalSpeech = `Letrero al frente: ${cleanText}`
        }
      }
    }

    return {
      text: cleanText,
      confidence: Math.round(confidence),
      matchedEmergencyKeyword: matchedKeyword,
      guidanceMessage: finalSpeech,
      objectShape: shape.shape,
      isUnclear,
    }
  }

  /**
   * Ejecuta el escaneo de visión multimodal sobre el cuadro de la cámara
   */
  public static async recognizeText(
    sourceCanvas: HTMLCanvasElement,
    _cropRect?: { x: number; y: number; w: number; h: number },
    isHumanExplicit?: boolean
  ): Promise<OcrResult | null> {
    if (this.isProcessing) return null
    this.isProcessing = true

    try {
      // 0. Comprobar si hay una persona frente a la cámara
      const isHuman = isHumanExplicit !== undefined ? isHumanExplicit : await this.isHumanInCanvas(sourceCanvas)

      // 1. Análisis de forma geométrica del objeto en el visor
      const shapeInfo = detectGeometricShape(sourceCanvas)

      // 2. Intento nativo ultra-rápido por hardware
      const nativeText = await this.tryNativeTextDetector(sourceCanvas)
      if (nativeText) {
        const formatted = this.formatResult(nativeText, 96, shapeInfo, isHuman)
        if (formatted) return formatted
      }

      // 3. Garantizar motor Tesseract
      if (!this.worker) {
        await this.initWorker()
      }
      if (!this.worker) {
        this.isProcessing = false
        return null
      }

      // Área amplia de escaneo: 92% ancho x 88% alto
      const scanX = Math.floor(sourceCanvas.width * 0.04)
      const scanY = Math.floor(sourceCanvas.height * 0.06)
      const scanW = Math.floor(sourceCanvas.width * 0.92)
      const scanH = Math.floor(sourceCanvas.height * 0.88)

      // Candidato 1: Fondo Oscuro Invertido en tonos continuos
      const canvasInverted = this.preprocessForOcr(sourceCanvas, scanX, scanY, scanW, scanH, true)
      const resInverted = await this.worker.recognize(canvasInverted)
      const textInverted = resInverted?.data?.text || ''
      const confInverted = resInverted?.data?.confidence || 0
      const scoreInverted = this.scoreOcrResult(textInverted, confInverted)

      // Candidato 2: Fondo Claro Directo
      const canvasNormal = this.preprocessForOcr(sourceCanvas, scanX, scanY, scanW, scanH, false)
      const resNormal = await this.worker.recognize(canvasNormal)
      const textNormal = resNormal?.data?.text || ''
      const confNormal = resNormal?.data?.confidence || 0
      const scoreNormal = this.scoreOcrResult(textNormal, confNormal)

      let bestText = textInverted
      let bestConf = confInverted

      if (scoreNormal > scoreInverted) {
        bestText = textNormal
        bestConf = confNormal
      }

      // Si los candidatos filtrados no arrojaron palabras de alta confianza, intentar sobre el canvas directo
      if (Math.max(scoreInverted, scoreNormal) < 40) {
        const resDirect = await this.worker.recognize(sourceCanvas)
        const textDirect = resDirect?.data?.text || ''
        const confDirect = resDirect?.data?.confidence || 0
        if (this.scoreOcrResult(textDirect, confDirect) > Math.max(scoreInverted, scoreNormal)) {
          bestText = textDirect
          bestConf = confDirect
        }
      }

      return this.formatResult(bestText, bestConf, shapeInfo, isHuman)
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
