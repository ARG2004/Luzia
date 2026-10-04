import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity,
  ScanText,
  FileCheck,
  Sliders,
  AlertTriangle,
  Shield,
  Layers,
  HeartPulse,
} from 'lucide-react'
import { HeaderTactical } from './components/HeaderTactical'
import { MainCameraHUD } from './components/MainCameraHUD'
import { StrobeRadarDisplay } from './components/StrobeRadarDisplay'
import { ObstacleRadarDisplay } from './components/ObstacleRadarDisplay'
import { OcrSignReaderDisplay } from './components/OcrSignReaderDisplay'
import { HorrorSimulatorModal } from './components/HorrorSimulatorModal'
import { AccessibilitySettingsDrawer } from './components/AccessibilitySettingsDrawer'
import type { StrobeStatus } from './services/strobeDetector'
import type { ObstacleAnalysisResult, VisualFilterMode } from './services/obstacleScanner'
import type { OcrResult } from './services/ocrService'
import { TtsService } from './services/ttsService'
import { AudioFeedbackService } from './services/audioFeedbackService'
import { HapticsService } from './services/hapticsService'



type ActiveTab = 'HUD' | 'STROBE' | 'OCR' | 'DOCS'

export const App: React.FC = () => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('HUD')

  // Real-time sensory states
  const [fps, setFps] = useState<number>(60)
  const [filterMode, setFilterMode] = useState<VisualFilterMode>('NEON_EDGE')
  const [strobeStatus, setStrobeStatus] = useState<StrobeStatus>({
    isDangerous: false,
    frequencyHz: 0,
    currentLuminance: 0,
    deltaLuminance: 0,
    history: [],
    riskLevel: 'SAFE',
  })
  const [obstacleAnalysis, setObstacleAnalysis] = useState<ObstacleAnalysisResult>({
    density: 0,
    proximityIndex: 0,
    hasHazard: false,
    hazardZone: 'NONE',
  })

  // Modals & Panels
  const [isMuted, setIsMuted] = useState(false)
  const [isPanicActive, setIsPanicActive] = useState(false)
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Settings
  const [isHapticEnabled, setIsHapticEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isTtsEnabled, setIsTtsEnabled] = useState(true)
  const [highSensitivityStrobe, setHighSensitivityStrobe] = useState(false)

  // OCR state
  const [isOcrScanning, setIsOcrScanning] = useState(false)
  const [lastOcrResult, setLastOcrResult] = useState<OcrResult | null>(null)
  const [simulatedSignText, setSimulatedSignText] = useState<string | null>(null)

  const triggerOcrRef = useRef<(() => Promise<OcrResult | null>) | null>(null)

  // Init TTS on mount
  useEffect(() => {
    TtsService.init()
    HapticsService.checkAvailability()
  }, [])

  // Panic beacon sound loop
  useEffect(() => {
    let panicInterval: ReturnType<typeof setInterval>
    if (isPanicActive) {
      AudioFeedbackService.playPanicBeacon()
      panicInterval = setInterval(() => {
        AudioFeedbackService.playPanicBeacon()
        HapticsService.strobeWarning()
      }, 700)
    }
    return () => {
      if (panicInterval) clearInterval(panicInterval)
    }
  }, [isPanicActive])


  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    AudioFeedbackService.setMuted(nextMuted)
    if (nextMuted) {
      TtsService.stop()
    }
  }

  // Toggle Panic SOS
  const handleTogglePanic = () => {
    setIsPanicActive(prev => {
      const next = !prev
      if (next) {
        TtsService.speak('¡Alerta de auxilio emitida! Personal de asistencia requerido.', true)
      } else {
        TtsService.stop()
      }
      return next
    })
  }

  // Execute OCR scan from UI button
  const handleTriggerOcr = async (): Promise<OcrResult | null> => {
    if (!triggerOcrRef.current) return null
    setIsOcrScanning(true)
    try {
      const res = await triggerOcrRef.current()
      if (res) {
        setLastOcrResult(res)
      }
      return res
    } finally {
      setIsOcrScanning(false)
    }
  }

  // Register OCR trigger from MainCameraHUD
  const handleRegisterOcrTrigger = useCallback((fn: () => Promise<OcrResult | null>) => {
    triggerOcrRef.current = fn
  }, [])

  // Inject Simulated Sign
  const handleInjectSimulatedSign = (text: string) => {
    setSimulatedSignText(text)
    setTimeout(() => {
      setSimulatedSignText(null)
    }, 2000)
  }

  // Profile presets
  const handleApplyProfile = (profile: 'LOW_VISION' | 'STROBE_CRITICAL' | 'SILENT_HAPTIC') => {
    if (profile === 'LOW_VISION') {
      setFilterMode('NEON_EDGE')
      setIsHapticEnabled(true)
      setIsAudioEnabled(true)
      setIsTtsEnabled(true)
      AudioFeedbackService.setMuted(false)
      setIsMuted(false)
      TtsService.speak('Perfil de baja visión activado. Bordes neón y sónar continuo.', true)
    } else if (profile === 'STROBE_CRITICAL') {
      setHighSensitivityStrobe(true)
      setIsHapticEnabled(true)
      setIsAudioEnabled(true)
      TtsService.speak('Perfil fotosensible crítico activado. Alerta estroboscópica prioritaria.', true)
    } else if (profile === 'SILENT_HAPTIC') {
      setIsHapticEnabled(true)
      setIsAudioEnabled(false)
      setIsTtsEnabled(false)
      setIsMuted(true)
      AudioFeedbackService.setMuted(true)
    }
    setIsSettingsOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f1f5f9] flex flex-col justify-between font-sans relative selection:bg-red-500 selection:text-white">
      {/* Alerta de Pánico en Pantalla Completa si está activado */}
      {isPanicActive && (
        <div className="fixed inset-0 z-50 bg-red-600/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-pulse">
          <AlertTriangle className="w-24 h-24 text-white mb-4 animate-bounce" />
          <h2 className="text-4xl font-black font-heading tracking-widest text-white mb-2">
            BALIZA DE AUXILIO SOS ACTIVA
          </h2>
          <p className="text-xl font-mono text-red-100 max-w-md mb-8">
            Emisión de sirena de emergencia y vibración táctil para el staff del evento.
          </p>
          <button
            onClick={handleTogglePanic}
            className="px-8 py-4 rounded-2xl bg-white text-red-600 font-heading font-black text-xl shadow-[0_0_40px_rgba(255,255,255,0.8)] active:scale-95 transition-all"
          >
            DESACTIVAR AUXILIO
          </button>
        </div>
      )}

      {/* Header Táctico */}
      <HeaderTactical
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isPanicActive={isPanicActive}
        onTogglePanic={handleTogglePanic}
        fps={fps}
        isStrobeAlert={strobeStatus.isDangerous}
        hasObstacleAlert={obstacleAnalysis.hasHazard}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Banner de Estado de Peligro Global si hay destello o cable inmediato */}
        {strobeStatus.isDangerous && (
          <div className="w-full bg-red-600 text-white p-3 rounded-2xl flex items-center justify-between shadow-[0_0_30px_rgba(255,30,66,0.6)] animate-pulse-danger">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/30">
                <HeartPulse className="w-6 h-6 text-white animate-spin" />
              </div>
              <div>
                <div className="font-heading font-black text-sm uppercase tracking-wider">
                  ¡ADVERTENCIA FOTOSENSIBLE DETECTADA ({strobeStatus.frequencyHz} Hz)!
                </div>
                <div className="text-xs font-mono text-red-100">
                  Desvíe la mirada del frente. Vibración háptica de alerta en curso.
                </div>
              </div>
            </div>
            <span className="font-mono text-xs px-3 py-1 bg-black/50 rounded-lg uppercase">
              3 - 30 Hz
            </span>
          </div>
        )}

        {/* Visor de Cámara HUD (Siempre presente y procesando en vivo) */}
        <section className="relative">
          <MainCameraHUD
            filterMode={filterMode}
            onStrobeUpdate={setStrobeStatus}
            onObstacleUpdate={setObstacleAnalysis}
            onFpsUpdate={setFps}
            externalSignToProcess={simulatedSignText}
            onSignProcessed={res => setLastOcrResult(res)}
            registerOcrTrigger={handleRegisterOcrTrigger}
          />
        </section>

        {/* Vistas según Pestaña Activa */}
        {activeTab === 'HUD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StrobeRadarDisplay strobeStatus={strobeStatus} />
            <ObstacleRadarDisplay
              analysis={obstacleAnalysis}
              currentFilter={filterMode}
              onSelectFilter={setFilterMode}
            />
          </div>
        )}

        {activeTab === 'STROBE' && (
          <div className="space-y-4">
            <StrobeRadarDisplay strobeStatus={strobeStatus} />
            <div className="glass-panel rounded-2xl p-5 border border-white/10">
              <h3 className="text-sm font-extrabold font-mono text-cyan-400 uppercase mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Fundamento Médico de Fotosensibilidad
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-3">
                Las luces estroboscópicas con frecuencias comprendidas entre <b>3 Hz y 30 Hz</b>{' '}
                (con pico de riesgo entre 12 Hz y 18 Hz) pueden inducir crisis convulsivas en personas con
                epilepsia fotosensible, además de provocar desorientación espacial severa y mareo en
                visitantes con baja visión.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold block mb-1">0 a 2.9 Hz</span>
                  <span className="text-gray-400 text-[11px]">Parpadeo lento no convulsivo</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-red-500/40">
                  <span className="text-red-400 font-bold block mb-1">3.0 a 30 Hz</span>
                  <span className="text-gray-400 text-[11px]">Zona de alto riesgo neurológico</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30">
                  <span className="text-amber-400 font-bold block mb-1">&gt; 30 Hz</span>
                  <span className="text-gray-400 text-[11px]">Fusión visual continua</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'OCR' && (
          <div className="space-y-4">
            <OcrSignReaderDisplay
              onTriggerScan={handleTriggerOcr}
              lastOcrResult={lastOcrResult}
              isScanning={isOcrScanning}
            />
          </div>
        )}

        {activeTab === 'DOCS' && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black font-heading text-white">
                  Luzía: Asistente Sensorial de Movilidad y Accesibilidad
                </h2>
                <p className="text-xs font-mono text-cyan-400">
                  Resumen Ejecutivo y Especificaciones Técnicas del Proyecto (14 Días)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <h3 className="font-bold font-mono text-amber-300 uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> 1. La Necesidad en Eventos de Terror
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  En festivales y casas del terror, la iluminación tenue, los efectos estroboscópicos
                  y el cableado expuesto a nivel de suelo generan un entorno de alto riesgo y
                  desorientación para personas con baja visión, ceguera parcial o fotosensibilidad.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <h3 className="font-bold font-mono text-emerald-300 uppercase flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> 2. Los 3 Pilares Resueltos
                </h3>
                <ul className="text-gray-300 space-y-1.5 list-disc pl-4">
                  <li><b>Detector Háptico de Estrobos:</b> Análisis de frecuencia (3 - 30 Hz).</li>
                  <li><b>Scanner de Suelo:</b> Filtros de bordes y pulsos sónar proporcionales a la proximidad.</li>
                  <li><b>OCR + TTS Local:</b> Lectura instantánea por voz de letreros en penumbra sin internet.</li>
                </ul>
              </div>
            </div>

            {/* Comparativa de Mercado */}
            <div>
              <h3 className="text-xs font-bold font-mono text-gray-400 uppercase mb-3">
                COMPARATIVA CON SOLUCIONES ACTUALES DE MERCADO
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="py-2 px-3">Solución Tradicional</th>
                      <th className="py-2 px-3">Limitación Principal en Eventos Nocturnos</th>
                      <th className="py-2 px-3 text-cyan-400">Ventaja Clave de Luzía</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Bastón blanco</td>
                      <td className="py-2.5 px-3">Solo contacto a nivel de suelo, no advierte destellos.</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">Detección óptica aérea + háptica</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">TalkBack / VoiceOver</td>
                      <td className="py-2.5 px-3">Solo lee interfaces del teléfono, no el entorno físico.</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">Procesamiento de stream de cámara</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Asistencia remota (Be My Eyes)</td>
                      <td className="py-2.5 px-3">Colapsa sin internet en eventos masivos y requiere humanos.</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">100% On-Device sin conexión</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-white">Señalética Braille</td>
                      <td className="py-2.5 px-3">Inexistente en instalaciones efímeras de terror.</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">Lectura OCR por voz en penumbra</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enlace y Estado de Política de Privacidad para Stores */}
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-300 block mb-0.5">
                  POLÍTICA DE PRIVACIDAD & SEGURIDAD DE DATOS (ON-DEVICE)
                </span>
                <span className="text-[11px] text-gray-400 block font-mono">
                  Cumplimiento con App Store Review Guidelines & Google Play Data Safety
                </span>
              </div>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-200 text-xs font-mono font-bold transition-all shrink-0"
              >
                VER POLÍTICA PÚBLICA ↗
              </a>
            </div>
          </div>
        )}

      </main>

      {/* Barra de Navegación Inferior Móvil Accesible */}
      <nav className="w-full bg-[#07090e]/95 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center justify-around z-30 select-none">
        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('HUD')
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'HUD'
              ? 'text-cyan-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] font-mono">VISOR HUD</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('STROBE')
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'STROBE'
              ? 'text-red-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] font-mono">ESTROBOS</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('OCR')
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'OCR'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ScanText className="w-5 h-5" />
          <span className="text-[10px] font-mono">SEÑALÉTICA</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('DOCS')
          }}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all ${
            activeTab === 'DOCS'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-5 h-5" />
          <span className="text-[10px] font-mono">PROYECTO</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setIsSettingsOpen(true)
          }}
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-gray-400 hover:text-white transition-all"
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px] font-mono">AJUSTES</span>
        </button>
      </nav>

      {/* Modal Simulador de Terror */}
      <HorrorSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onInjectSimulatedSign={handleInjectSimulatedSign}
      />

      {/* Drawer de Ajustes de Accesibilidad */}
      <AccessibilitySettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isHapticEnabled={isHapticEnabled}
        onToggleHaptic={() => setIsHapticEnabled(prev => !prev)}
        isAudioEnabled={isAudioEnabled}
        onToggleAudio={() => {
          setIsAudioEnabled(prev => {
            const next = !prev
            AudioFeedbackService.setMuted(!next)
            setIsMuted(!next)
            return next
          })
        }}
        isTtsEnabled={isTtsEnabled}
        onToggleTts={() => setIsTtsEnabled(prev => !prev)}
        highSensitivityStrobe={highSensitivityStrobe}
        onToggleStrobeSensitivity={() => setHighSensitivityStrobe(prev => !prev)}
        onApplyProfile={handleApplyProfile}
      />
    </div>
  )
}

export default App
