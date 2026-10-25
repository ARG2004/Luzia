import React, { useState } from 'react'
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Download,
  ClipboardCopy,
  CheckCheck,
  AlertTriangle,
  HeartPulse,
  Flame,
  FileCheck2,
} from 'lucide-react'
import { HapticsService } from '../services/hapticsService'

export interface TelemetryEvent {
  id: string
  timestamp: string
  type: 'STROBE' | 'OBSTACLE' | 'OCR' | 'SOS'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  details: string
}

interface VenueAuditComplianceDisplayProps {
  events: TelemetryEvent[]
  onClearEvents: () => void
  currentStrobeHz: number
  hasObstacle: boolean
  isPanicActive: boolean
}

export const VenueAuditComplianceDisplay: React.FC<VenueAuditComplianceDisplayProps> = ({
  events,
  onClearEvents,
  currentStrobeHz,
  hasObstacle,
  isPanicActive,
}) => {
  const [venueName, setVenueName] = useState('Parque Temático Nocturno — Sector A')
  const [auditorName, setAuditorName] = useState('Inspector de Seguridad de Campo')
  const [copied, setCopied] = useState(false)
  const [showMedicalBadge, setShowMedicalBadge] = useState(false)

  // Cálculo del Índice de Seguridad de Campo (Safety Score: 0 a 100)
  const strobeIncidents = events.filter(e => e.type === 'STROBE').length
  const obstacleIncidents = events.filter(e => e.type === 'OBSTACLE').length
  const sosIncidents = events.filter(e => e.type === 'SOS').length
  const verifiedSigns = events.filter(e => e.type === 'OCR').length

  // Deducción matemática de riesgo:
  // Estrobos críticos restan 15 pts cada uno, obstáculos restan 8 pts, SOS resta 20 pts.
  // Señales de salida verificadas recuperan confianza (+5 pts).
  const penalty = strobeIncidents * 15 + obstacleIncidents * 8 + sosIncidents * 20
  const bonus = verifiedSigns * 5
  const rawScore = Math.max(10, Math.min(100, 100 - penalty + bonus))
  const safetyScore = events.length === 0 ? 98 : rawScore

  const getComplianceStatus = () => {
    if (safetyScore >= 85) {
      return {
        label: 'CERTIFICACIÓN APROBADA (WCAG 2.2 / OMS)',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/80 border-emerald-500/60',
        desc: 'El recinto cumple los umbrales seguros de luminancia y accesibilidad física.',
      }
    }
    if (safetyScore >= 60) {
      return {
        label: 'ALERTA PREVENTIVA — RIESGO MODERADO',
        color: 'text-amber-400',
        bg: 'bg-amber-950/80 border-amber-500/60',
        desc: 'Se detectaron desniveles o variaciones de luz susceptibles de corrección.',
      }
    }
    return {
      label: 'NO CONFORME — RIESGO CRÍTICO DE DEMANDAS',
      color: 'text-red-400',
      bg: 'bg-red-950/80 border-red-500/80',
      desc: 'Peligro inminente de crisis convulsivas o caídas. Requiere mitigación urgente.',
    }
  }

  const status = getComplianceStatus()

  // Generar reporte formal de auditoría para Protección Civil / Aseguradora
  const generateAuditReport = () => {
    const now = new Date()
    return `===============================================================
REPORTE TÉCNICO DE AUDITORÍA DE SEGURIDAD Y ACCESIBILIDAD (LUZÍA B2B)
NORMATIVA DE EVALUACIÓN: W3C WCAG 2.2 (CRITERIO 2.3.1) & OMS PROTOCOL
===============================================================
FECHA DE INSPECCIÓN: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}
RECINTO AUDITADO: ${venueName}
AUDITOR / OPERADOR: ${auditorName}
SISTEMA DE ANÁLISIS: Luzía Sensory Edge Computer (On-Device Local AI)

---------------------------------------------------------------
1. DICTAMEN EJECUTIVO Y SCORE DE SEGURIDAD
---------------------------------------------------------------
ÍNDICE DE SEGURIDAD DEL RECINTO (SAFETY SCORE): ${safetyScore} / 100
ESTADO DE CONFORMIDAD: ${status.label}
DIAGNÓSTICO: ${status.desc}

---------------------------------------------------------------
2. MÉTRICAS CLÍNICAS Y TELEMETRÍA DE RIESGO
---------------------------------------------------------------
• Incidentes Estroboscópicos Críticos (3 a 30 Hz): ${strobeIncidents}
• Eventos de Obstáculo/Desnivel en Suelo: ${obstacleIncidents}
• Activaciones de Alerta de Auxilio SOS: ${sosIncidents}
• Señales de Evacuación Verificadas por OCR: ${verifiedSigns}
• Frecuencia Estroboscópica Actual: ${currentStrobeHz > 0 ? `${currentStrobeHz} Hz` : 'Estable (0 Hz)'}
• Estado de Peligro en Piso Actual: ${hasObstacle ? 'OBSTÁCULO PRESENTE' : 'Suelo Despejado'}

---------------------------------------------------------------
3. BITÁCORA DETALLADA DE INCIDENTES (CAJA NEGRA)
---------------------------------------------------------------
${
  events.length === 0
    ? 'No se registraron anomalías críticas durante el periodo de muestreo.'
    : events
        .map(
          e =>
            `[${e.timestamp}] [${e.severity}] ${e.title} -> ${e.details}`
        )
        .join('\n')
}

---------------------------------------------------------------
4. RECOMENDACIONES DE MITIGACIÓN PARA EL OPERADOR
---------------------------------------------------------------
${
  strobeIncidents > 0
    ? '• URGENTE: Reprogramar fuentes de iluminación estroboscópica para operar fuera del rango 3-30 Hz o limitar su encendido a ráfagas menores de 2 segundos.'
    : '• Las frecuencias de iluminación se mantienen dentro del umbral seguro de fotosensibilidad.'
}
${
  obstacleIncidents > 0
    ? '• Colocar pasacables canalizados con cinta fosforescente de alto contraste en los desniveles detectados.'
    : '• Rutas de tránsito libres de obstrucciones mecánicas en el suelo.'
}
• Garantizar que toda señalética de salida de emergencia cuente con reflectividad fotoluminiscente visible en penumbra.

===============================================================
DICTAMEN GENERADO AUTOMÁTICAMENTE MEDIANTE TECNOLOGÍA LUZÍA
DISPOSITIVO AUTÓNOMO ON-DEVICE · SIN EXFILTRACIÓN DE DATOS
===============================================================`
  }

  const handleCopyReport = () => {
    HapticsService.tap()
    const reportText = generateAuditReport()
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  const handleDownloadReport = () => {
    HapticsService.tap()
    const reportText = generateAuditReport()
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Luzia_Safety_Audit_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 select-none">
      {/* Panel Superior: Tarjeta B2B de Certificación de Recinto */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-purple-500/40 relative overflow-hidden shadow-[0_0_35px_rgba(168,85,247,0.2)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-950/90 border border-purple-500/60 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-400/40">
                  PLATAFORMA EMPRESARIAL B2B
                </span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  PROTECCIÓN CIVIL & SEGUROS
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white font-mono mt-1">
                AUDITORÍA Y CERTIFICACIÓN DE SEGURIDAD DE RECINTO
              </h2>
            </div>
          </div>

          {/* Selectores de Recinto y Auditor */}
          <div className="w-full sm:w-auto flex flex-col gap-1.5">
            <input
              type="text"
              value={venueName}
              onChange={e => setVenueName(e.target.value)}
              className="w-full sm:w-72 bg-black/70 border border-white/20 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-400"
              placeholder="Nombre del Recinto / Evento"
            />
            <input
              type="text"
              value={auditorName}
              onChange={e => setAuditorName(e.target.value)}
              className="w-full sm:w-72 bg-black/70 border border-white/20 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-400"
              placeholder="Nombre del Auditor / Inspector"
            />
          </div>
        </div>

        {/* Dashboard de Métricas y Score */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
          {/* Tarjeta de Score */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${status.bg}`}>
            <div>
              <span className="text-xs font-mono text-gray-300 uppercase block mb-1">
                ÍNDICE DE SEGURIDAD (SAFETY SCORE)
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black font-mono ${status.color}`}>
                  {safetyScore}
                </span>
                <span className="text-sm font-mono text-gray-400">/ 100</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-white/10">
              <span className={`text-[10px] font-mono font-bold block ${status.color}`}>
                {status.label}
              </span>
              <span className="text-[10px] text-gray-300 leading-tight block mt-0.5">
                {status.desc}
              </span>
            </div>
          </div>

          {/* Tarjeta de Métricas de Incidentes */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
            <span className="text-xs font-mono text-gray-300 uppercase block mb-2">
              TELEMETRÍA EN DIRECTO
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-black/50 border border-red-500/30">
                <span className="text-[9px] text-red-400 block">ESTROBOS (3-30 Hz)</span>
                <span className="text-lg font-bold text-white">{strobeIncidents}</span>
              </div>
              <div className="p-2 rounded bg-black/50 border border-amber-500/30">
                <span className="text-[9px] text-amber-400 block">OBSTÁCULOS PISO</span>
                <span className="text-lg font-bold text-white">{obstacleIncidents}</span>
              </div>
              <div className="p-2 rounded bg-black/50 border border-emerald-500/30">
                <span className="text-[9px] text-emerald-400 block">SEÑALES OCR OK</span>
                <span className="text-lg font-bold text-white">{verifiedSigns}</span>
              </div>
              <div className="p-2 rounded bg-black/50 border border-purple-500/30">
                <span className="text-[9px] text-purple-400 block">ALERTAS SOS</span>
                <span className="text-lg font-bold text-white">{sosIncidents}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
              <span className="text-[9px] font-mono text-gray-400">
                Muestreo Edge Computing (On-Device).
              </span>
              {isPanicActive && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-600 text-white font-bold animate-pulse">
                  SOS ACTIVO
                </span>
              )}
            </div>
          </div>

          {/* Tarjeta de Exportación de Certificado */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-gray-300 uppercase block mb-1">
                VALIDACIÓN OFICIAL & REPORTES
              </span>
              <p className="text-[11px] text-gray-400 font-mono leading-relaxed mb-3">
                Exporta el dictamen técnico con sello de auditoría para presentar a aseguradoras,
                organizadores o autoridades de Protección Civil.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyReport}
                className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-300" />
                    <span>¡REPORTE COPIADO!</span>
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="w-4 h-4" />
                    <span>COPIAR DICTAMEN FORMAL</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadReport}
                className="w-full py-2 px-3 rounded-lg bg-black/80 hover:bg-black border border-white/20 text-gray-300 hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>DESCARGAR INFORME (.TXT)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ficha Médica SOS Rápida */}
        <div className="mt-2 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-red-400" />
            <span className="text-xs font-mono text-gray-300">
              Protocolo Médico Rápido de Emergencia para Personal de Atracción:
            </span>
          </div>

          <button
            onClick={() => {
              HapticsService.tap()
              setShowMedicalBadge(prev => !prev)
            }}
            className="text-xs font-mono px-3 py-1 rounded bg-red-950/60 border border-red-500/40 text-red-300 hover:bg-red-900/60 transition-all"
          >
            {showMedicalBadge ? 'OCULTAR PROTOCOLO' : 'VER PROTOCOLO DE CONVULSIÓN'}
          </button>
        </div>

        {/* Protocolo Médico Desplegable */}
        {showMedicalBadge && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-xs font-mono text-red-200 space-y-2 animate-fade-in">
            <div className="font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              GUÍA RÁPIDA DE PRIMEROS AUXILIOS ANTE CRISIS FOTOSENSIBLE EN EL RECINTO:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-gray-200">
              <li>1. <b>Detener efectos estroboscópicos de inmediato</b> en la sala o sector afectado.</li>
              <li>2. <b>No sujetar a la persona por la fuerza</b> ni introducir ningún objeto en su boca.</li>
              <li>3. Despejar el área de cables, peldaños o elementos punzantes que causen traumatismos.</li>
              <li>4. Colocar suavemente a la persona de lado (<b>posición lateral de seguridad</b>) tras cesar el temblor.</li>
              <li>5. Mantener la calma y contactar al servicio de paramédicos del parque o línea 911.</li>
            </ul>
          </div>
        )}
      </div>

      {/* Bitácora de Telemetría (Caja Negra) */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-extrabold font-mono text-white uppercase tracking-wider">
              BITÁCORA DE TELEMETRÍA EN VIVO (INCIDENT BLACKBOX)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-400">
              {events.length} registro{events.length === 1 ? '' : 's'}
            </span>
            {events.length > 0 && (
              <button
                onClick={() => {
                  HapticsService.tap()
                  onClearEvents()
                }}
                className="text-[10px] font-mono px-2 py-1 rounded bg-black/60 hover:bg-red-950/60 border border-white/10 text-gray-400 hover:text-red-300 transition-all"
              >
                LIMPIAR BITÁCORA
              </button>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-mono text-xs flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400/70" />
            <span>Sin incidencias críticas detectadas en el recorrido actual.</span>
            <span className="text-[10px] text-gray-500">
              Los eventos de estrobos (3-30 Hz), obstáculos en el suelo y lecturas de salida se registrarán automáticamente aquí.
            </span>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {events.map(event => (
              <div
                key={event.id}
                className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 text-xs font-mono transition-all ${
                  event.severity === 'CRITICAL'
                    ? 'bg-red-950/40 border-red-500/50 text-red-200'
                    : event.severity === 'WARNING'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {event.type === 'STROBE' && <Flame className="w-4 h-4 text-red-400" />}
                    {event.type === 'OBSTACLE' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    {event.type === 'OCR' && <FileCheck2 className="w-4 h-4 text-emerald-400" />}
                    {event.type === 'SOS' && <HeartPulse className="w-4 h-4 text-red-400 animate-pulse" />}
                  </div>

                  <div>
                    <div className="font-bold tracking-wide">{event.title}</div>
                    <div className="text-[11px] text-gray-300 mt-0.5">{event.details}</div>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-white/10 shrink-0 text-gray-400">
                  {event.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
