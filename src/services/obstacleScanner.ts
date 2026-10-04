export type VisualFilterMode = 'NEON_EDGE' | 'NIGHT_VISION' | 'HIGH_CONTRAST_MONO' | 'RAW'

export interface ObstacleAnalysisResult {
  density: number // 0 a 1 (densidad de obstáculos/cables en la zona del suelo)
  proximityIndex: number // 0 (despejado) a 1 (inminente impacto / obstáculo muy cerca)
  hasHazard: boolean
  hazardZone: 'NONE' | 'LEFT' | 'CENTER' | 'RIGHT'
}

export class ObstacleScanner {
  /**
   * Aplica convolución de bordes (filtro Sobel simplificado de alto rendimiento)
   * y renderiza la salida visual optimizada en el canvas de visualización.
   */
  public static processFrame(
    sourceCtx: CanvasRenderingContext2D,
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mode: VisualFilterMode = 'NEON_EDGE',
    edgeThreshold = 38
  ): ObstacleAnalysisResult {
    let srcData: ImageData
    try {
      srcData = sourceCtx.getImageData(0, 0, width, height)
    } catch {
      return { density: 0, proximityIndex: 0, hasHazard: false, hazardZone: 'NONE' }
    }

    const src = srcData.data
    const outData = targetCtx.createImageData(width, height)
    const out = outData.data

    // Zona de interés para obstáculos a nivel de suelo: tercio inferior
    const floorStartRow = Math.floor(height * 0.55)
    let floorEdgeCount = 0
    let floorTotalSampled = 0

    // Conteo por zonas (izquierda, centro, derecha) en el suelo
    let leftEdges = 0
    let centerEdges = 0
    let rightEdges = 0

    const colOneThird = Math.floor(width / 3)
    const colTwoThirds = Math.floor((width * 2) / 3)

    // Si el modo es RAW (sin filtro), solo copiamos y analizamos
    if (mode === 'RAW') {
      targetCtx.putImageData(srcData, 0, 0)
      // Muestreo rápido de bordes en el suelo
      for (let y = floorStartRow; y < height - 1; y += 3) {
        for (let x = 1; x < width - 1; x += 3) {
          const idx = (y * width + x) * 4
          const r = src[idx]
          const g = src[idx + 1]
          const b = src[idx + 2]
          const lum = 0.299 * r + 0.587 * g + 0.114 * b

          const rightIdx = (y * width + (x + 1)) * 4
          const rLum = 0.299 * src[rightIdx] + 0.587 * src[rightIdx + 1] + 0.114 * src[rightIdx + 2]

          const diff = Math.abs(lum - rLum)
          if (diff > edgeThreshold) {
            floorEdgeCount++
          }
          floorTotalSampled++
        }
      }

      const density = floorTotalSampled > 0 ? Math.min(1, (floorEdgeCount / floorTotalSampled) * 3.5) : 0
      return {
        density,
        proximityIndex: density,
        hasHazard: density > 0.18,
        hazardZone: 'CENTER',
      }
    }

    // Procesamiento de Convolución Sobel 3x3 optimizado para Alto Contraste
    for (let y = 1; y < height - 1; y++) {
      const isFloor = y >= floorStartRow
      // Ponderador: a mayor profundidad en el suelo (más abajo en la pantalla), más cercano está el obstáculo al usuario
      const proximityWeight = isFloor ? 1 + ((y - floorStartRow) / (height - floorStartRow)) * 1.5 : 1

      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4

        // Kernel Sobel horizontal y vertical
        // [-1 0 1]      [-1 -2 -1]
        // [-2 0 2]  Gx, [ 0  0  0] Gy
        // [-1 0 1]      [ 1  2  1]

        const getLum = (px: number, py: number) => {
          const pIdx = (py * width + px) * 4
          return 0.299 * src[pIdx] + 0.587 * src[pIdx + 1] + 0.114 * src[pIdx + 2]
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
        const isEdge = magnitude > edgeThreshold

        if (isFloor) {
          floorTotalSampled++
          if (isEdge) {
            floorEdgeCount += proximityWeight
            if (x < colOneThird) leftEdges++
            else if (x < colTwoThirds) centerEdges++
            else rightEdges++
          }
        }

        // Coloración según modo de accesibilidad
        if (mode === 'NEON_EDGE') {
          if (isEdge) {
            // Si está en la zona de peligro de suelo, resaltar en Carmesí Neón o Verde Neón
            if (isFloor && y > height * 0.75) {
              out[idx] = 255     // R
              out[idx + 1] = 30  // G
              out[idx + 2] = 66  // B (Carmesí peligro inmediato)
            } else {
              out[idx] = 0       // R
              out[idx + 1] = 255 // G
              out[idx + 2] = 120 // B (Verde fosforescente visión nocturna)
            }
            out[idx + 3] = 255
          } else {
            // Fondo oscuro profundo para máximo contraste WCAG AAA
            out[idx] = 7
            out[idx + 1] = 9
            out[idx + 2] = 14
            out[idx + 3] = 255
          }
        } else if (mode === 'NIGHT_VISION') {
          const lum = getLum(x, y)
          const boosted = Math.min(255, lum * 1.6)
          if (isEdge) {
            out[idx] = 0
            out[idx + 1] = 255
            out[idx + 2] = 180
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

    const rawDensity = floorTotalSampled > 0 ? (floorEdgeCount / floorTotalSampled) * 4.0 : 0
    const density = Math.min(1, Math.max(0, rawDensity))

    let hazardZone: 'NONE' | 'LEFT' | 'CENTER' | 'RIGHT' = 'NONE'
    if (density > 0.15) {
      if (centerEdges >= leftEdges && centerEdges >= rightEdges) {
        hazardZone = 'CENTER'
      } else if (leftEdges > rightEdges) {
        hazardZone = 'LEFT'
      } else {
        hazardZone = 'RIGHT'
      }
    }

    return {
      density,
      proximityIndex: density,
      hasHazard: density > 0.18,
      hazardZone,
    }
  }
}
