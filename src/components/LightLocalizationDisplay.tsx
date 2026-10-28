import React, { useEffect, useRef } from 'react'
import { Compass, Sun, Sparkles, Navigation } from 'lucide-react'
import {
  LightLocalizationService,
  type LightLocalizationResult,
  type LightZoneType,
} from '../services/lightLocalizationService'

interface LightLocalizationDisplayProps {
  result: LightLocalizationResult
  onSimulateBeacon?: (zone: LightZoneType | null) => void
}

export const LightLocalizationDisplay: React.FC<LightLocalizationDisplayProps> = ({
  result,
  onSimulateBeacon,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Renderizar Brújula / Radar Fotométrico Direccional
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2
    const radius = Math.min(cx, cy) - 10

    // Círculos concéntricos de alcance de luz
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    for (let r = radius * 0.33; r <= radius; r += radius * 0.33) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Ejes cardinales tácticos
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'
    ctx.beginPath()
    ctx.moveTo(cx, cy - radius)
    ctx.lineTo(cx, cy + radius)
    ctx.moveTo(cx - radius, cy)
    ctx.lineTo(cx + radius, cy)
    ctx.stroke()

    // Resaltar los 5 cuadrantes según su luminancia
    const q = result.quadrantLuminance
    const maxVal = Math.max(1, q.overhead, q.center, q.left, q.right, q.floor)

    // Dibujar sectores luminosos de fondo
    const drawSector = (angleStart: number, angleEnd: number, lum: number, color: string) => {
      const alpha = Math.min(0.6, (lum / maxVal) * 0.5 + 0.05)
      ctx.fillStyle = color.replace('ALPHA', alpha.toFixed(2))
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius * 0.9, angleStart, angleEnd)
      ctx.closePath()
      ctx.fill()
    }

    // Overhead / Norte (Techo / Frente alto)
    drawSector(-Math.PI * 0.75, -Math.PI * 0.25, q.overhead, 'rgba(255, 230, 0, ALPHA)')
    // Right / Este (Derecha)
    drawSector(-Math.PI * 0.25, Math.PI * 0.25, q.right, 'rgba(0, 240, 255, ALPHA)')
    // Floor / Sur (Suelo / Atrás)
    drawSector(Math.PI * 0.25, Math.PI * 0.75, q.floor, 'rgba(168, 85, 247, ALPHA)')
    // Left / Oeste (Izquierda)
    drawSector(Math.PI * 0.75, Math.PI * 1.25, q.left, 'rgba(0, 240, 255, ALPHA)')

    // Centro (Luz frontal directa)
    const centerAlpha = Math.min(0.8, (q.center / maxVal) * 0.7 + 0.1)
    ctx.fillStyle = `rgba(0, 255, 128, ${centerAlpha})`
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2)
    ctx.fill()

    // Vector de flecha direccional hacia la fuente de luz
    let targetAngle: number | null = null
    if (result.lightDirection === 'CENTER') targetAngle = -Math.PI / 2
    else if (result.lightDirection === 'LEFT') targetAngle = Math.PI
    else if (result.lightDirection === 'RIGHT') targetAngle = 0
    else if (result.lightDirection === 'OVERHEAD') targetAngle = -Math.PI / 2
    else if (result.lightDirection === 'FLOOR') targetAngle = Math.PI / 2

    if (targetAngle !== null && result.confidence > 45) {
      const arrowLength = radius * 0.82
      const ax = cx + Math.cos(targetAngle) * arrowLength
      const ay = cy + Math.sin(targetAngle) * arrowLength

      ctx.strokeStyle = '#00ffcc'
      ctx.lineWidth = 3
      ctx.shadowColor = '#00ffcc'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(ax, ay)
      ctx.stroke()

      // Punta de la flecha
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(ax, ay, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }, [result])

  const getZoneBadgeColor = () => {
    switch (result.zone) {
      case 'STAND_ELECTRICIENCIA':
        return 'text-emerald-400 border-emerald-500/70 bg-emerald-950/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
      case 'ILLUMINATED_EXIT':
        return 'text-cyan-300 border-cyan-500/70 bg-cyan-950/80 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
      case 'BRIGHT_HALL':
        return 'text-amber-300 border-amber-500/70 bg-amber-950/80'
      case 'DIM_CORRIDOR':
        return 'text-purple-300 border-purple-500/70 bg-purple-950/80'
      case 'DARK_ZONE':
        return 'text-red-400 border-red-500/70 bg-red-950/80 animate-pulse'
      default:
        return 'text-gray-400 border-white/20 bg-black/60'
    }
  }

  const activeSimulated = LightLocalizationService.getSimulatedBeacon()

  return (
    <div className="rounded-2xl p-4 glass-panel border border-white/10 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-extrabold tracking-wide uppercase font-mono text-white">
              LOCALIZACIÓN POR LUZ (VLP)
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-cyan-300 border border-cyan-500/30">
            {result.estimatedLux} LUX RELATIVOS
          </span>
        </div>

        {/* Tarjeta de Ubicación Actual */}
        <div className={`p-3.5 rounded-xl border mb-3 transition-all ${getZoneBadgeColor()}`}>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase">
              <Navigation className="w-3.5 h-3.5" />
              UBICACIÓN ACTUAL:
            </span>
            <span className="font-extrabold px-2 py-0.5 rounded bg-black/70 text-white border border-white/20">
              {result.confidence}% CONFIANZA
            </span>
          </div>
          <div className="text-base sm:text-lg font-black tracking-wide font-crt text-white">
            {result.locationName}
          </div>
          <p className="text-xs text-gray-200 font-mono mt-1 leading-snug">
            {result.guidanceMessage}
          </p>
        </div>

        {/* Radar Fotométrico & Distribución Espacial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-black/40 rounded-xl p-3 border border-white/5">
          <div className="flex flex-col items-center justify-center">
            <canvas
              ref={canvasRef}
              width={160}
              height={160}
              className="w-36 h-36 rounded-full border border-cyan-500/20 bg-black/80 shadow-[0_0_20px_rgba(0,0,0,0.8)]"
            />
            <span className="text-[9px] font-mono text-cyan-300/80 mt-1 uppercase">
              BRÚJULA FOTOMÉTRICA DE LUZ
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" />
              Luminancia por Cuadrante:
            </div>
            <div className="flex justify-between p-1 px-2 rounded bg-white/5">
              <span className="text-gray-300">Cenital (Techo):</span>
              <span className="text-amber-300 font-bold">{result.quadrantLuminance.overhead}</span>
            </div>
            <div className="flex justify-between p-1 px-2 rounded bg-white/5">
              <span className="text-gray-300">Frontal (Centro):</span>
              <span className="text-emerald-300 font-bold">{result.quadrantLuminance.center}</span>
            </div>
            <div className="flex justify-between p-1 px-2 rounded bg-white/5">
              <span className="text-gray-300">Izquierda / Derecha:</span>
              <span className="text-cyan-300 font-bold">
                {result.quadrantLuminance.left} / {result.quadrantLuminance.right}
              </span>
            </div>
            <div className="flex justify-between p-1 px-2 rounded bg-white/5">
              <span className="text-gray-300">Vector Director:</span>
              <span className="text-white font-extrabold uppercase bg-cyan-950/80 px-1.5 rounded border border-cyan-500/40">
                {result.lightDirection}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulador de Balizas para Evaluación en Exposición */}
      {onSimulateBeacon && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-[10px] font-mono text-gray-400 uppercase mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Demostración para Jurados / Expos:
            </span>
            {activeSimulated && (
              <span className="text-purple-300 font-bold">BALIZA ACTIVA</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              onClick={() => onSimulateBeacon('STAND_ELECTRICIENCIA')}
              className={`p-1.5 rounded text-[9px] font-mono font-bold transition-all border ${
                activeSimulated === 'STAND_ELECTRICIENCIA'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_#10b981]'
                  : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
              }`}
            >
              STAND ELECTRICIENCIA
            </button>
            <button
              onClick={() => onSimulateBeacon('ILLUMINATED_EXIT')}
              className={`p-1.5 rounded text-[9px] font-mono font-bold transition-all border ${
                activeSimulated === 'ILLUMINATED_EXIT'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_#06b6d4]'
                  : 'bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/40'
              }`}
            >
              SALIDA ILUMINADA
            </button>
            <button
              onClick={() => onSimulateBeacon('DIM_CORRIDOR')}
              className={`p-1.5 rounded text-[9px] font-mono font-bold transition-all border ${
                activeSimulated === 'DIM_CORRIDOR'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_#a855f7]'
                  : 'bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border-purple-500/40'
              }`}
            >
              PASILLO EN PENUMBRA
            </button>
            <button
              onClick={() => onSimulateBeacon(null)}
              className={`p-1.5 rounded text-[9px] font-mono font-bold transition-all border ${
                !activeSimulated
                  ? 'bg-white/20 text-white border-white/50'
                  : 'bg-black/40 hover:bg-black/60 text-gray-400 border-white/10'
              }`}
            >
              {activeSimulated ? 'REINICIAR A VIVO' : 'SENSOR EN VIVO'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
