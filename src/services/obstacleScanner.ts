export type VisualFilterMode = 'NEON_EDGE' | 'NIGHT_VISION' | 'HIGH_CONTRAST_MONO' | 'RAW'

export type SceneEntityType = 'NONE' | 'HUMAN' | 'CABLE' | 'SIGN' | 'OBJECT' | 'UNCLEAR'

export type SpatialDepth = 'FRONT' | 'CENTER' | 'BACK'

export interface ObstacleAnalysisResult {
  density: number // 0 a 1 (densidad ponderada de bordes y obstáculos)
  proximityIndex: number // 0 (despejado) a 1 (inminente impacto / obstáculo muy cerca)
  hasHazard: boolean
  hazardZone: 'NONE' | 'LEFT' | 'CENTER' | 'RIGHT'
  spatialDepth: SpatialDepth // FRONT (adelante), CENTER (al centro), BACK (atrás)
  hazardType: 'NONE' | 'FLOOR_OBSTACLE' | 'FRONTAL_OBJECT' | 'MULTIPLE'
  floorDensity: number
  frontalDensity: number
  entityType: SceneEntityType
  detectedDetails: string
  meanLuminance?: number // Luminancia media (0 a 255) para calibración de penumbra
  isExtremeDarkness?: boolean // true si luz ambiente < 15 lux (salón negro)
}

/**
 * Detector riguroso de tez humana basado en el espacio de color YCbCr (ITU-R BT.601):
 * Identifica presencia humana real (rostro, cuello, manos) y rechaza inequívocamente
 * materiales de madera, cartón, muebles marrones, puertas y paredes cálidas.
 */
export function isSkinTonePixel(r: number, g: number, b: number): boolean {
  // 1. Luminancia en rango visual adecuado (descarta sombras negras y especulares quemados)
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  if (y < 35 || y > 248) return false

  // 2. Crominancia YCbCr estándar ITU-R BT.601 (Locus universal de piel humana Kovac/Chai-Ngan)
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b

  // Rango crominático de tez humana (todas las etnias Fitzpatrick I-VI):
  if (cb < 77 || cb > 128 || cr < 133 || cr > 173) return false

  // 3. Relaciones espectrales: predominancia roja sobre verde y azul
  if (r <= g || r <= b) return false
  if (r - b < 12) return false
  if (r - g < 6) return false

  return true
}

/**
 * Generador de locución espacial táctica y precisa para personas ciegas:
 * Anuncia con exactitud las 5 dimensiones espaciales solicitadas:
 * - Profundidad: adelante, centro, atrás
 * - Orientación horizontal: izquierda, centro, derecha
 */
export function formatSpatialAnnouncement(
  entity: SceneEntityType,
  zone: 'CENTER' | 'LEFT' | 'RIGHT' | 'NONE',
  depth: SpatialDepth = 'CENTER',
  secondaryContext?: string
): string {
  if (entity === 'NONE') return 'Suelo y entorno despejados'

  let posText = ''
  if (zone === 'CENTER') {
    if (depth === 'FRONT') posText = 'adelante al centro'
    else if (depth === 'BACK') posText = 'atrás al centro'
    else posText = 'al centro'
  } else if (zone === 'LEFT') {
    if (depth === 'FRONT') posText = 'adelante a la izquierda'
    else if (depth === 'BACK') posText = 'atrás a la izquierda'
    else posText = 'al centro a la izquierda'
  } else if (zone === 'RIGHT') {
    if (depth === 'FRONT') posText = 'adelante a la derecha'
    else if (depth === 'BACK') posText = 'atrás a la derecha'
    else posText = 'al centro a la derecha'
  }

  let base = ''
  switch (entity) {
    case 'HUMAN':
      base = `Persona ${posText}`
      break
    case 'CABLE':
      base = `Precaución: Cableado en el suelo ${posText}`
      break
    case 'OBJECT':
      base = `Objeto o estructura ${posText}`
      break
    case 'SIGN':
      base = `Letrero ${posText}`
      break
    case 'UNCLEAR':
      base = `Elemento no determinado ${posText}; proceda con precaución`
      break
    default:
      return 'Suelo y entorno despejados'
  }

  if (secondaryContext) {
    return `${base}, ${secondaryContext}`
  }
  return base
}

export class ObstacleScanner {
  private static lastHumanDetectedTime = 0
  /**
   * Aplica convolución de bordes (filtro Sobel optimizado) tanto en el sector inferior (suelo, cables, desniveles)
   * como en el sector medio/superior (objetos al frente, muebles, paredes, personas a su alrededor).
   * Renderiza salida visual táctica en alto contraste accesible (WCAG AAA).
   */
  public static processFrame(
    sourceCtx: CanvasRenderingContext2D,
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mode: VisualFilterMode = 'NEON_EDGE',
    edgeThreshold = 24,
    facingMode: 'user' | 'environment' = 'environment'
  ): ObstacleAnalysisResult {
    let srcData: ImageData
    try {
      srcData = sourceCtx.getImageData(0, 0, width, height)
    } catch {
      return {
        density: 0,
        proximityIndex: 0,
        hasHazard: false,
        hazardZone: 'NONE',
        spatialDepth: 'CENTER',
        hazardType: 'NONE',
        floorDensity: 0,
        frontalDensity: 0,
        entityType: 'NONE',
        detectedDetails: 'Suelo y entorno despejados',
        meanLuminance: 0,
        isExtremeDarkness: true,
      }
    }

    const src = srcData.data
    const outData = targetCtx.createImageData(width, height)
    const out = outData.data

    // 1. Muestreo de luminancia media ambiental para calibración de penumbra
    let totalLuma = 0
    let lumaSamples = 0
    for (let i = 0; i < src.length; i += 32) {
      totalLuma += 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]
      lumaSamples++
    }
    const meanLuminance = lumaSamples > 0 ? totalLuma / lumaSamples : 0
    const isExtremeDarkness = meanLuminance < 15

    // En oscuridad extrema aumentamos ligeramente para no detectar ruido térmico del sensor
    const effectiveThreshold = isExtremeDarkness ? Math.max(edgeThreshold, 36) : edgeThreshold

    // Límites de zonas verticales:
    // Suelo: desde el 45% inferior de la pantalla hacia abajo
    const floorStartRow = Math.floor(height * 0.45)
    // Objetos frontales / entorno: desde el 10% superior hasta el inicio del suelo (45%)
    const frontalStartRow = Math.floor(height * 0.10)

    let floorEdgeCount = 0
    let floorTotalSampled = 0
    let frontalEdgeCount = 0
    let frontalTotalSampled = 0

    // Conteo por zonas direccionales (izquierda, centro, derecha)
    let leftFloorEdges = 0
    let centerFloorEdges = 0
    let rightFloorEdges = 0

    let leftFrontalEdges = 0
    let centerFrontalEdges = 0
    let rightFrontalEdges = 0

    const colOneThird = Math.floor(width / 3)
    const colTwoThirds = Math.floor((width * 2) / 3)

    // Zona de muestreo humano estricta: Únicamente sector superior/medio (cabeza, cuello, pecho, torso)
    // NUNCA muestrear el tercio inferior del suelo (baldosas, madera, alfombras, calzado)
    const bodySampleRowStart = Math.floor(height * 0.05)
    const bodySampleRowEnd = Math.floor(height * 0.58)

    let skinToneCount = 0
    let skinSumX = 0
    let skinSumY = 0

    // Modo RAW (Óptica directa): copia imagen y realiza análisis numérico
    if (mode === 'RAW') {
      targetCtx.putImageData(srcData, 0, 0)
      for (let y = 1; y < height - 1; y += 2) {
        const isFloor = y >= floorStartRow
        const isFrontal = y >= frontalStartRow && !isFloor

        for (let x = 1; x < width - 1; x += 2) {
          const idx = (y * width + x) * 4

          if (y >= bodySampleRowStart && y <= bodySampleRowEnd) {
            if (isSkinTonePixel(src[idx], src[idx + 1], src[idx + 2])) {
              skinToneCount++
              skinSumX += x
              skinSumY += y
            }
          }

          const lum = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2]
          const rightIdx = (y * width + (x + 1)) * 4
          const rLum = 0.299 * src[rightIdx] + 0.587 * src[rightIdx + 1] + 0.114 * src[rightIdx + 2]
          const diff = Math.abs(lum - rLum)

          if (isFloor) {
            floorTotalSampled++
            if (diff > effectiveThreshold) {
              floorEdgeCount++
              if (x < colOneThird) leftFloorEdges++
              else if (x < colTwoThirds) centerFloorEdges++
              else rightFloorEdges++
            }
          } else if (isFrontal) {
            frontalTotalSampled++
            if (diff > effectiveThreshold) {
              frontalEdgeCount++
              if (x < colOneThird) leftFrontalEdges++
              else if (x < colTwoThirds) centerFrontalEdges++
              else rightFrontalEdges++
            }
          }
        }
      }

      const floorRate = floorTotalSampled > 0 ? floorEdgeCount / floorTotalSampled : 0
      const frontalRate = frontalTotalSampled > 0 ? frontalEdgeCount / frontalTotalSampled : 0
      const floorProximity = Math.min(1, Math.max(0, (floorRate - 0.008) * 12.0))
      const frontalProximity = Math.min(1, Math.max(0, (frontalRate - 0.009) * 11.0))
      const proximityIndex = Math.min(1, Math.max(floorProximity, frontalProximity))
      const hasHazard = proximityIndex > 0.08 || floorRate > 0.015 || frontalRate > 0.018

      const now = performance.now()

      // Si la cámara apunta hacia abajo al suelo frente al usuario:
      const isPointingAtFloor = frontalProximity < 0.08 && floorProximity > 0.08

      // Detección Antropomórfica: Un humano requiere masa frontal real y concentración de piel en sector superior/medio
      const rawIsHuman = !isPointingAtFloor && skinToneCount >= 60 && frontalProximity >= 0.09
      const wasRecentlyHuman = now - ObstacleScanner.lastHumanDetectedTime < 2400
      if (rawIsHuman) {
        ObstacleScanner.lastHumanDetectedTime = now
      }
      const isHuman = rawIsHuman || (!isPointingAtFloor && wasRecentlyHuman && skinToneCount >= 25 && frontalProximity >= 0.08)

      // Regla de Oro Anti-Confusión:
      // 1. CABLEADO: Solo si NO hay persona, es una línea delgada en suelo y no hay masa frontal
      const isCable = !isHuman && floorProximity > 0.12 && frontalProximity < 0.06 && floorRate < 0.08
      // 2. OBJETO / ESTRUCTURA: Mesas, muebles, sillas, puertas, o bultos en suelo
      const isFrontalObject = !isHuman && (frontalProximity > 0.10 || (floorProximity > 0.15 && floorRate >= 0.08))
      // 3. ELEMENTO NO DETERMINADO: Si hay peligro pero no clasifica inequívocamente
      const isUnclear = hasHazard && !isHuman && !isCable && !isFrontalObject

      const leftScore = leftFloorEdges + leftFrontalEdges
      const centerScore = (centerFloorEdges + centerFrontalEdges) * 1.25
      const rightScore = rightFloorEdges + rightFrontalEdges

      // Evaluación del pasillo frontal directo (independiente de si hay un humano cruzando)
      const centerEdgesCount = centerFloorEdges + centerFrontalEdges
      const totalSampled = floorTotalSampled + frontalTotalSampled
      const centerCorridorRate = totalSampled > 0 ? (centerEdgesCount * 3) / totalSampled : 0
      const hasFrontalCorridorObstacle = centerCorridorRate > 0.022 || (centerFrontalEdges > 20 && frontalProximity > 0.10)

      let hazardZone: 'NONE' | 'LEFT' | 'CENTER' | 'RIGHT' = 'NONE'
      let entityType: SceneEntityType = 'NONE'
      let secondaryContext: string | undefined = undefined

      if (isHuman && skinToneCount > 0) {
        const skinCenterX = skinSumX / skinToneCount
        let humanSensorSide: 'LEFT' | 'CENTER' | 'RIGHT' = 'CENTER'
        if (skinCenterX < colOneThird) humanSensorSide = 'LEFT'
        else if (skinCenterX > colTwoThirds) humanSensorSide = 'RIGHT'

        let humanZone: 'LEFT' | 'CENTER' | 'RIGHT' = 'CENTER'
        if (humanSensorSide === 'CENTER') {
          humanZone = 'CENTER'
        } else if (facingMode === 'user') {
          humanZone = humanSensorSide === 'LEFT' ? 'RIGHT' : 'LEFT'
        } else {
          humanZone = humanSensorSide === 'LEFT' ? 'LEFT' : 'RIGHT'
        }

        // Si una persona se cruza o está por un lado, pero hay un obstáculo directamente al frente:
        // Prioridad de vida: ¡Avisar el obstáculo al frente e informar de la persona cruzando!
        if (humanSensorSide !== 'CENTER' && hasFrontalCorridorObstacle) {
          entityType = 'OBJECT'
          hazardZone = 'CENTER'
          const personPosName = humanZone === 'LEFT' ? 'persona a tu izquierda' : 'persona a tu derecha'
          secondaryContext = personPosName
        } else {
          entityType = 'HUMAN'
          hazardZone = humanZone
          if (hasFrontalCorridorObstacle && humanSensorSide === 'CENTER' && floorProximity > 0.20) {
            secondaryContext = 'y obstáculo al frente'
          }
        }
      } else if (isCable) {
        entityType = 'CABLE'
      } else if (isFrontalObject) {
        entityType = 'OBJECT'
      } else if (isUnclear || hasHazard) {
        entityType = 'UNCLEAR'
      }

      if (hazardZone === 'NONE' && hasHazard) {
        if (centerScore >= leftScore && centerScore >= rightScore) {
          hazardZone = 'CENTER'
        } else if (facingMode === 'user') {
          hazardZone = leftScore > rightScore ? 'RIGHT' : 'LEFT'
        } else {
          hazardZone = leftScore > rightScore ? 'LEFT' : 'RIGHT'
        }
      }

      // Cálculo de Profundidad Espacial Precisa (adelante, centro, atrás):
      let spatialDepth: SpatialDepth = 'CENTER'
      if (entityType === 'HUMAN') {
        if (skinToneCount > 280 || frontalProximity > 0.38) {
          spatialDepth = 'FRONT'
        } else if (skinToneCount >= 60) {
          spatialDepth = 'CENTER'
        } else {
          spatialDepth = 'BACK'
        }
      } else if (entityType === 'CABLE') {
        if (floorProximity > 0.38) {
          spatialDepth = 'FRONT'
        } else if (floorProximity >= 0.16) {
          spatialDepth = 'CENTER'
        } else {
          spatialDepth = 'BACK'
        }
      } else if (entityType === 'OBJECT' || hasHazard) {
        if (frontalProximity > 0.38 || proximityIndex > 0.38) {
          spatialDepth = 'FRONT'
        } else if (proximityIndex >= 0.16) {
          spatialDepth = 'CENTER'
        } else {
          spatialDepth = 'BACK'
        }
      }

      const detectedDetails = formatSpatialAnnouncement(entityType, hazardZone, spatialDepth, secondaryContext)

      // Regla de Oro Asistiva: Una persona NO es un obstáculo
      const isActualHazard = (entityType === 'OBJECT' || entityType === 'CABLE' || entityType === 'UNCLEAR') && hasHazard
      const reportedHazard = isActualHazard || (entityType === 'HUMAN' && !!secondaryContext?.includes('obstáculo'))

      return {
        density: Math.min(1, Math.max(floorRate * 4, frontalRate * 3.5)),
        proximityIndex: entityType === 'HUMAN' && !secondaryContext?.includes('obstáculo') ? 0 : proximityIndex,
        hasHazard: reportedHazard,
        hazardZone,
        spatialDepth,
        hazardType: reportedHazard
          ? (floorProximity > 0.15 && frontalProximity > 0.15 ? 'MULTIPLE' : floorProximity > 0.15 ? 'FLOOR_OBSTACLE' : 'FRONTAL_OBJECT')
          : 'NONE',
        floorDensity: floorProximity,
        frontalDensity: frontalProximity,
        entityType,
        detectedDetails,
        meanLuminance,
        isExtremeDarkness,
      }
    }

    // Procesamiento con Convolución Sobel 3x3
    for (let y = 1; y < height - 1; y++) {
      const isFloor = y >= floorStartRow
      const isFrontal = y >= frontalStartRow && !isFloor

      // Ponderación de proximidad: los obstáculos más cercanos a los pies (abajo en pantalla) tienen mayor peso
      const proximityWeight = isFloor
        ? 1.0 + ((y - floorStartRow) / (height - floorStartRow)) * 2.2
        : 1.1

      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4

        // Muestreo antropomórfico panorámico vertical completo (de pie, sentada o agachada en el suelo)
        if (y >= bodySampleRowStart && y <= bodySampleRowEnd) {
          if (x % 2 === 0 && y % 2 === 0) {
            if (isSkinTonePixel(src[idx], src[idx + 1], src[idx + 2])) {
              skinToneCount++
              skinSumX += x
              skinSumY += y
            }
          }
        }

        // Helper para luminancia con realce dinámico en penumbra extrema
        const getLum = (px: number, py: number) => {
          const pIdx = (py * width + px) * 4
          const raw = 0.299 * src[pIdx] + 0.587 * src[pIdx + 1] + 0.114 * src[pIdx + 2]
          if (isExtremeDarkness && raw > 1) {
            return Math.sqrt(raw / 255) * 255
          }
          return raw
        }

        const p00 = getLum(x - 1, y - 1)
        const p01 = getLum(x, y - 1)
        const p02 = getLum(x + 1, y - 1)

        const p10 = getLum(x - 1, y)
        const p12 = getLum(x + 1, y)

        const p20 = getLum(x - 1, y + 1)
        const p21 = getLum(x, y + 1)
        const p22 = getLum(x + 1, y + 1)

        const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22
        const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22

        const magnitude = Math.sqrt(gx * gx + gy * gy)
        const isEdge = magnitude > effectiveThreshold

        if (isFloor) {
          floorTotalSampled++
          if (isEdge) {
            floorEdgeCount += proximityWeight
            if (x < colOneThird) leftFloorEdges++
            else if (x < colTwoThirds) centerFloorEdges++
            else rightFloorEdges++
          }
        } else if (isFrontal) {
          frontalTotalSampled++
          if (isEdge) {
            frontalEdgeCount++
            if (x < colOneThird) leftFrontalEdges++
            else if (x < colTwoThirds) centerFrontalEdges++
            else rightFrontalEdges++
          }
        }

        // Coloración Táctica Verde y Negro puro (WCAG AAA)
        if (mode === 'NEON_EDGE') {
          if (isEdge) {
            out[idx] = 0       // R
            out[idx + 1] = 255 // G
            out[idx + 2] = 102 // B (#00ff66)
            out[idx + 3] = 255
          } else {
            out[idx] = 6
            out[idx + 1] = 8
            out[idx + 2] = 12
            out[idx + 3] = 255
          }
        } else if (mode === 'NIGHT_VISION') {
          const lum = getLum(x, y)
          const boosted = Math.min(255, lum * 1.6)
          if (isEdge) {
            out[idx] = isFloor ? 0 : 50
            out[idx + 1] = 255
            out[idx + 2] = isFloor ? 140 : 255
          } else {
            out[idx] = 0
            out[idx + 1] = Math.floor(boosted * 0.85)
            out[idx + 2] = Math.floor(boosted * 0.25)
          }
          out[idx + 3] = 255
        } else if (mode === 'HIGH_CONTRAST_MONO') {
          const val = isEdge ? 255 : 0
          out[idx] = val
          out[idx + 1] = val
          out[idx + 2] = val
          out[idx + 3] = 255
        }
      }
    }

    targetCtx.putImageData(outData, 0, 0)

    // Cálculo ponderado de densidad y proximidad
    const floorRate = floorTotalSampled > 0 ? floorEdgeCount / floorTotalSampled : 0
    const frontalRate = frontalTotalSampled > 0 ? frontalEdgeCount / frontalTotalSampled : 0

    // Calibración de sensibilidad realista para navegación asistiva accesible:
    const floorProximity = Math.min(1, Math.max(0, (floorRate - 0.008) * 12.0))
    const frontalProximity = Math.min(1, Math.max(0, (frontalRate - 0.009) * 11.0))
    const proximityIndex = Math.min(1, Math.max(floorProximity, frontalProximity))

    // Detección de peligro activo
    const hasHazard = proximityIndex > 0.08 || floorRate > 0.015 || frontalRate > 0.018

    // Clasificación de la naturaleza del obstáculo
    let hazardType: 'NONE' | 'FLOOR_OBSTACLE' | 'FRONTAL_OBJECT' | 'MULTIPLE' = 'NONE'
    if (hasHazard) {
      if (floorProximity > 0.12 && frontalProximity > 0.12) {
        hazardType = 'MULTIPLE'
      } else if (floorProximity >= frontalProximity) {
        hazardType = 'FLOOR_OBSTACLE'
      } else {
        hazardType = 'FRONTAL_OBJECT'
      }
    }

    // Orientación direccional (Izquierda, Frente, Derecha)
    const leftScore = leftFloorEdges + leftFrontalEdges
    const centerScore = (centerFloorEdges + centerFrontalEdges) * 1.25
    const rightScore = rightFloorEdges + rightFrontalEdges

    const now = performance.now()

    // Si la cámara apunta hacia abajo al suelo frente al usuario:
    const isPointingAtFloor = frontalProximity < 0.08 && floorProximity > 0.08

    // Detección Antropomórfica: Un humano requiere masa frontal real y concentración de piel en sector superior/medio
    const rawIsHuman = !isPointingAtFloor && skinToneCount >= 60 && frontalProximity >= 0.09
    const wasRecentlyHuman = now - ObstacleScanner.lastHumanDetectedTime < 2400
    if (rawIsHuman) {
      ObstacleScanner.lastHumanDetectedTime = now
    }
    const isHuman = rawIsHuman || (!isPointingAtFloor && wasRecentlyHuman && skinToneCount >= 25 && frontalProximity >= 0.08)

    // Detección de masa u obstáculo en el corredor frontal central
    const centerEdgesCount = centerFloorEdges + centerFrontalEdges
    const hasFrontalCorridorObstacle = centerEdgesCount > 25 || centerFrontalEdges > 18 || centerFloorEdges > 22 || centerScore > 35

    // Regla de Oro Anti-Confusión:
    // 1. CABLEADO: Solo si NO hay persona, es una línea delgada en suelo y no hay masa frontal
    const isCable = !isHuman && floorProximity > 0.12 && frontalProximity < 0.06 && floorRate < 0.08
    // 2. OBJETO / ESTRUCTURA: Mesas, muebles, sillas, puertas, o bultos en suelo
    const isFrontalObject = !isHuman && (frontalProximity > 0.10 || (floorProximity > 0.15 && floorRate >= 0.08))
    // 3. ELEMENTO NO DETERMINADO: Si hay peligro pero no clasifica inequívocamente
    const isUnclear = hasHazard && !isHuman && !isCable && !isFrontalObject

    let hazardZone: 'NONE' | 'LEFT' | 'CENTER' | 'RIGHT' = 'NONE'
    let secondaryContext: string | undefined = undefined
    let entityType: SceneEntityType = 'NONE'

    if (isHuman && skinToneCount > 0) {
      const skinCenterX = skinSumX / skinToneCount
      let humanSensorSide: 'LEFT' | 'CENTER' | 'RIGHT' = 'CENTER'
      if (skinCenterX < colOneThird) humanSensorSide = 'LEFT'
      else if (skinCenterX > colTwoThirds) humanSensorSide = 'RIGHT'

      let humanZone: 'LEFT' | 'CENTER' | 'RIGHT' = 'CENTER'
      if (humanSensorSide === 'CENTER') {
        humanZone = 'CENTER'
      } else if (facingMode === 'user') {
        // Vista tipo espejo (Webcam PC): sensor izquierdo es DERECHA física del usuario
        humanZone = humanSensorSide === 'LEFT' ? 'RIGHT' : 'LEFT'
      } else {
        // Vista directa trasera (Móvil): sensor izquierdo es IZQUIERDA física del usuario
        humanZone = humanSensorSide === 'LEFT' ? 'LEFT' : 'RIGHT'
      }

      // Prioridad de vida: Si un humano cruza por los lados y hay un obstáculo enfrente,
      // ¡Avisar el obstáculo al frente e informar de la persona cruzando!
      if (humanSensorSide !== 'CENTER' && hasFrontalCorridorObstacle) {
        entityType = 'OBJECT'
        hazardZone = 'CENTER'
        const personPosName = humanZone === 'LEFT' ? 'persona a tu izquierda' : 'persona a tu derecha'
        secondaryContext = personPosName
      } else {
        entityType = 'HUMAN'
        hazardZone = humanZone
        if (hasFrontalCorridorObstacle && humanSensorSide === 'CENTER' && floorProximity > 0.20) {
          secondaryContext = 'y obstáculo al frente'
        }
      }
    } else if (isCable) {
      entityType = 'CABLE'
    } else if (isFrontalObject) {
      entityType = 'OBJECT'
    } else if (isUnclear || hasHazard) {
      entityType = 'UNCLEAR'
    }

    if (hazardZone === 'NONE' && hasHazard) {
      if (centerScore >= leftScore && centerScore >= rightScore) {
        hazardZone = 'CENTER'
      } else if (facingMode === 'user') {
        hazardZone = leftScore > rightScore ? 'RIGHT' : 'LEFT'
      } else {
        hazardZone = leftScore > rightScore ? 'LEFT' : 'RIGHT'
      }
    }

    // Cálculo de Profundidad Espacial Precisa (adelante, centro, atrás):
    let spatialDepth: SpatialDepth = 'CENTER'
    if (entityType === 'HUMAN') {
      if (skinToneCount > 280 || frontalProximity > 0.38) {
        spatialDepth = 'FRONT'
      } else if (skinToneCount >= 60) {
        spatialDepth = 'CENTER'
      } else {
        spatialDepth = 'BACK'
      }
    } else if (entityType === 'CABLE') {
      if (floorProximity > 0.38) {
        spatialDepth = 'FRONT'
      } else if (floorProximity >= 0.16) {
        spatialDepth = 'CENTER'
      } else {
        spatialDepth = 'BACK'
      }
    } else if (entityType === 'OBJECT' || hasHazard) {
      if (frontalProximity > 0.38 || proximityIndex > 0.38) {
        spatialDepth = 'FRONT'
      } else if (proximityIndex >= 0.16) {
        spatialDepth = 'CENTER'
      } else {
        spatialDepth = 'BACK'
      }
    }

    const detectedDetails = formatSpatialAnnouncement(entityType, hazardZone, spatialDepth, secondaryContext)

    // Regla de Oro Asistiva: Una persona NO es un obstáculo
    const isActualHazard = (entityType === 'OBJECT' || entityType === 'CABLE' || entityType === 'UNCLEAR') && hasHazard
    const reportedHazard = isActualHazard || (entityType === 'HUMAN' && !!secondaryContext?.includes('obstáculo'))

    return {
      density: Math.min(1, Math.max(floorRate * 4, frontalRate * 3.5)),
      proximityIndex: entityType === 'HUMAN' && !secondaryContext?.includes('obstáculo') ? 0 : proximityIndex,
      hasHazard: reportedHazard,
      hazardZone,
      spatialDepth,
      hazardType: reportedHazard ? hazardType : 'NONE',
      floorDensity: floorProximity,
      frontalDensity: frontalProximity,
      entityType,
      detectedDetails,
      meanLuminance,
      isExtremeDarkness,
    }
  }
}
