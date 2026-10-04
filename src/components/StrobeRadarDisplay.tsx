import React, { useEffect, useRef } from 'react'
import { Activity, AlertOctagon, ShieldCheck } from 'lucide-react'
import type { StrobeStatus } from '../services/strobeDetector'

interface StrobeRadarDisplayProps {
  strobeStatus: StrobeStatus
}

export const StrobeRadarDisplay: React.FC<StrobeRadarDisplayProps> = ({ strobeStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Dibujar osciloscopio de luminancia en tiempo real
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Cuadrícula de fondo táctica
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < w; x += 20) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let y = 0; y < h; y += 15) {
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    // Línea de referencia media
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
    ctx.setLineDash([])

    const history = strobeStatus.history
    if (history.length < 2) return

    // Trazar onda
    ctx.lineWidth = strobeStatus.isDangerous ? 3 : 2
    ctx.strokeStyle = strobeStatus.isDangerous
      ? '#ff1e42'
      : strobeStatus.riskLevel === 'HIGH'
      ? '#ffaa00'
      : '#00f0ff'

    ctx.shadowColor = ctx.strokeStyle
    ctx.shadowBlur = strobeStatus.isDangerous ? 12 : 6

    ctx.beginPath()
    const step = w / (history.length - 1)
    history.forEach((lum, idx) => {
      // Mapear 0..255 a h..0
      const y = h - (lum / 255) * h
      const x = idx * step
      if (idx === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()
    ctx.shadowBlur = 0
  }, [strobeStatus])

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-300 border ${
        strobeStatus.isDangerous
          ? 'glass-panel-danger border-red-500 shadow-[0_0_25px_rgba(255,30,66,0.4)]'
          : 'glass-panel border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity
            className={`w-5 h-5 ${
              strobeStatus.isDangerous ? 'text-[#ff1e42] animate-bounce' : 'text-cyan-400'
            }`}
          />
          <h2 className="text-sm font-extrabold tracking-wide uppercase font-mono text-white">
            DETECTOR ESTROBOSCÓPICO (FOTOSENSIBILIDAD)
          </h2>
        </div>

        {strobeStatus.isDangerous ? (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono text-xs font-bold animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5" />
            ¡PELIGRO: {strobeStatus.frequencyHz} Hz!
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/30 font-mono text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            FRECUENCIA SEGURA
          </span>
        )}
      </div>

      {/* Alerta Destacada en Caso de Peligro */}
      {strobeStatus.isDangerous && (
        <div className="mb-3 p-3 rounded-xl bg-red-950/90 border border-red-500/80 text-red-200 flex items-center justify-between animate-pulse">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider font-mono text-red-400">
              ⚠️ PARPADEO EN RANGO DE RIESGO (3 - 30 Hz)
            </p>
            <p className="text-[13px] font-semibold">
              Desvíe la mirada hacia el suelo o cubra sus ojos inmediatamente.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-white">
              {strobeStatus.frequencyHz} <span className="text-xs font-normal text-red-300">Hz</span>
            </div>
            <div className="text-[10px] font-mono uppercase text-red-300">Vibración Activa</div>
          </div>
        </div>
      )}

      {/* Osciloscopio y Medidores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Gráfico Osciloscopio */}
        <div className="md:col-span-2 relative bg-black/60 rounded-xl border border-white/10 p-2 overflow-hidden">
          <div className="flex justify-between items-center mb-1 px-1">
            <span className="text-[10px] font-mono text-gray-400">ONDA DE LUMINANCIA (Y)</span>
            <span className="text-[10px] font-mono text-cyan-400">
              VALOR: {strobeStatus.currentLuminance} / 255
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={320}
            height={70}
            className="w-full h-[70px] block rounded"
          />
        </div>

        {/* Indicadores de Métricas */}
        <div className="flex flex-row md:flex-col gap-2 justify-between">
          <div className="flex-1 bg-black/40 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] font-mono text-gray-400 block mb-0.5">FRECUENCIA</span>
            <span
              className={`text-xl font-black font-mono ${
                strobeStatus.isDangerous ? 'text-[#ff1e42]' : 'text-cyan-300'
              }`}
            >
              {strobeStatus.frequencyHz}{' '}
              <span className="text-xs font-normal text-gray-400">Hz</span>
            </span>
            <span className="text-[10px] text-gray-500 block font-mono">
              Riesgo: 3 Hz — 30 Hz
            </span>
          </div>

          <div className="flex-1 bg-black/40 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] font-mono text-gray-400 block mb-0.5">DELTA BRILLO (ΔY)</span>
            <span className="text-xl font-black font-mono text-amber-300">
              {strobeStatus.deltaLuminance}{' '}
              <span className="text-xs font-normal text-gray-400">pts</span>
            </span>
            <span className="text-[10px] text-gray-500 block font-mono">
              Sensibilidad: ±22
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
