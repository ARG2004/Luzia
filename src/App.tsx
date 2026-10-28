import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity,
  ScanText,
  FileCheck,
  Sliders,
  AlertTriangle,
  Shield,
  HeartPulse,
  Gamepad2,
  Video,
  FileSpreadsheet,
} from 'lucide-react'
import { HeaderTactical } from './components/HeaderTactical'
import { MainCameraHUD } from './components/MainCameraHUD'
import { FnafStageMinigame } from './components/FnafStageMinigame'
import { StrobeRadarDisplay } from './components/StrobeRadarDisplay'
import { ObstacleRadarDisplay } from './components/ObstacleRadarDisplay'
import { OcrSignReaderDisplay } from './components/OcrSignReaderDisplay'
import { VenueAuditComplianceDisplay, type TelemetryEvent } from './components/VenueAuditComplianceDisplay'
import { HorrorSimulatorModal } from './components/HorrorSimulatorModal'
import { AccessibilitySettingsDrawer } from './components/AccessibilitySettingsDrawer'
import type { StrobeStatus } from './services/strobeDetector'
import type { ObstacleAnalysisResult, VisualFilterMode } from './services/obstacleScanner'
import { OcrService, type OcrResult } from './services/ocrService'
import { TtsService } from './services/ttsService'
import { AudioFeedbackService } from './services/audioFeedbackService'
import { HapticsService } from './services/hapticsService'

type ActiveTab = 'HUD' | 'STROBE' | 'OCR' | 'AUDIT' | 'DOCS'

export const App: React.FC = () => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('HUD')
  const [use8BitMinigameView, setUse8BitMinigameView] = useState<boolean>(false)
  const [isAccessibleFont, setIsAccessibleFont] = useState<boolean>(true)

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
    spatialDepth: 'CENTER',
    hazardType: 'NONE',
    floorDensity: 0,
    frontalDensity: 0,
    entityType: 'NONE',
    detectedDetails: 'Suelo y entorno despejados',
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

  // Init TTS & prewarm OCR on mount
  useEffect(() => {
    TtsService.init()
    HapticsService.checkAvailability()
    OcrService.initWorker()
    const timer = setTimeout(() => {
      TtsService.speak('Luzía activada. Visor asistivo en tiempo real.')
    }, 1000)
    return () => clearTimeout(timer)
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
    TtsService.setEnabled(!nextMuted && isTtsEnabled)
    if (nextMuted) {
      TtsService.stop()
    }
  }

  // Telemetría & Auditoría B2B de Seguridad
  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>([])

  const addTelemetryEvent = useCallback((event: Omit<TelemetryEvent, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toLocaleTimeString()
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    setTelemetryEvents(prev => [{ id, timestamp, ...event }, ...prev.slice(0, 49)])
  }, [])

  // Monitoreo de estrobos para telemetría
  const lastLoggedStrobeRef = useRef<number>(0)
  useEffect(() => {
    if (strobeStatus.isDangerous) {
      const now = Date.now()
      if (now - lastLoggedStrobeRef.current > 4000) {
        addTelemetryEvent({
          type: 'STROBE',
          severity: 'CRITICAL',
          title: `Estrobo Crítico (${strobeStatus.frequencyHz} Hz)`,
          details: `Luminancia media: ${strobeStatus.currentLuminance}, delta: ${strobeStatus.deltaLuminance}. Rango convulsivo 3-30 Hz.`,
        })
        lastLoggedStrobeRef.current = now
      }
    }
  }, [strobeStatus.isDangerous, strobeStatus.frequencyHz, strobeStatus.currentLuminance, strobeStatus.deltaLuminance, addTelemetryEvent])

  // Monitoreo de obstáculos para telemetría
  const lastLoggedObstacleRef = useRef<number>(0)
  useEffect(() => {
    if (obstacleAnalysis.hasHazard) {
      const now = Date.now()
      if (now - lastLoggedObstacleRef.current > 5000) {
        addTelemetryEvent({
          type: 'OBSTACLE',
          severity: 'WARNING',
          title: `Obstáculo / Desnivel en Suelo`,
          details: `Sector: ${obstacleAnalysis.hazardZone}, Proximidad: ${(obstacleAnalysis.proximityIndex * 100).toFixed(0)}%.`,
        })
        lastLoggedObstacleRef.current = now
      }
    }
  }, [obstacleAnalysis.hasHazard, obstacleAnalysis.hazardZone, obstacleAnalysis.proximityIndex, addTelemetryEvent])

  // Toggle Panic SOS
  const handleTogglePanic = () => {
    setIsPanicActive(prev => {
      const next = !prev
      if (next) {
        TtsService.speak('¡Alerta Fazbear de auxilio emitida! Personal de asistencia requerido.', true)
        addTelemetryEvent({
          type: 'SOS',
          severity: 'CRITICAL',
          title: 'Alerta SOS de Auxilio Activada',
          details: 'El usuario emitió baliza acústica de auxilio para el personal del recinto.',
        })
      } else {
        TtsService.stop()
      }
      return next
    })
  }

  // Handle OCR result with telemetry logging
  const handleSignProcessed = useCallback((res: OcrResult) => {
    setLastOcrResult(res)
    addTelemetryEvent({
      type: 'OCR',
      severity: 'INFO',
      title: 'Señal de Evacuación Verificada',
      details: `Letrero: "${res.text}" (Confianza: ${res.confidence}%).`,
    })
  }, [addTelemetryEvent])

  // Execute OCR scan from UI button
  const handleTriggerOcr = async (): Promise<OcrResult | null> => {
    if (use8BitMinigameView) {
      setUse8BitMinigameView(false)
      await new Promise(resolve => setTimeout(resolve, 350))
    }
    if (!triggerOcrRef.current) return null
    setIsOcrScanning(true)
    try {
      const res = await triggerOcrRef.current()
      if (res) {
        handleSignProcessed(res)
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

  // Procesar señal simulada dinámicamente sin datos hardcodeados
  const handleInjectSimulatedSign = (text: string) => {
    setSimulatedSignText(text)
    const result = OcrService.formatResult(text, 98)
    if (result) {
      handleSignProcessed(result)
      AudioFeedbackService.playSuccessChime()
      HapticsService.signDetected()
      TtsService.speak(result.guidanceMessage || `Texto detectado: ${result.text}`, true)
    }
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
      setIsAccessibleFont(true)
    } else if (profile === 'STROBE_CRITICAL') {
      setHighSensitivityStrobe(true)
      setIsHapticEnabled(true)
      setIsAudioEnabled(true)
    } else if (profile === 'SILENT_HAPTIC') {
      setIsAudioEnabled(false)
      setIsTtsEnabled(false)
      setIsHapticEnabled(true)
      AudioFeedbackService.setMuted(true)
      setIsMuted(true)
    }
  }

  return (
    <div
      className={`min-h-screen bg-[#090814] text-[#e2e8f0] flex flex-col relative selection:bg-purple-900 selection:text-white ${
        isAccessibleFont ? 'accessible-text-mode' : 'font-crt'
      }`}
    >
      {/* Top Header Tactical Fazbear */}
      <HeaderTactical
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isPanicActive={isPanicActive}
        onTogglePanic={handleTogglePanic}
        fps={fps}
        isStrobeAlert={strobeStatus.isDangerous}
        hasObstacleAlert={obstacleAnalysis.hasHazard}
        isAccessibleFont={isAccessibleFont}
        onToggleFont={() => setIsAccessibleFont(prev => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* Selector Rápido de Modo de Visor */}
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 pt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-pixel text-[9px] text-[#00ff66] tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-ping" />
            VIGILANCIA EN DIRECTO
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              AudioFeedbackService.playCameraSwitchStatic()
              HapticsService.tap()
              setUse8BitMinigameView(true)
            }}
            className={`px-3 py-1 font-pixel text-[8px] sm:text-[9px] rounded-lg border transition-all flex items-center gap-1.5 ${
              use8BitMinigameView
                ? 'bg-purple-600/30 text-purple-200 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>MODO 8-BIT FNAF</span>
          </button>

          <button
            onClick={() => {
              AudioFeedbackService.playCameraSwitchStatic()
              HapticsService.tap()
              setUse8BitMinigameView(false)
            }}
            className={`px-3 py-1 font-pixel text-[8px] sm:text-[9px] rounded-lg border transition-all flex items-center gap-1.5 ${
              !use8BitMinigameView
                ? 'bg-cyan-600/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                : 'bg-black/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>CÁMARA REAL</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal con padding inferior para no solapar la barra fija */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4 pb-28 sm:pb-32">
        {/* Banner de Estado de Peligro Global si hay destello */}
        {strobeStatus.isDangerous && (
          <div className="w-full bg-red-600 text-white p-3 rounded-xl border-4 border-red-400 flex items-center justify-between shadow-[0_0_35px_rgba(255,30,66,0.9)] animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-black/40">
                <HeartPulse className="w-6 h-6 text-white animate-spin" />
              </div>
              <div>
                <div className="font-pixel text-[10px] sm:text-xs uppercase tracking-wider">
                  ¡ADVERTENCIA FOTOSENSIBLE DETECTADA ({strobeStatus.frequencyHz} HZ)!
                </div>
                <div className="text-sm font-crt text-red-100">
                  Desvíe la mirada del frente. Vibración háptica de alerta en curso.
                </div>
              </div>
            </div>
            <span className="font-pixel text-[9px] px-2.5 py-1 bg-black/60 rounded border border-red-300">
              3 - 30 HZ
            </span>
          </div>
        )}

        {/* Visor Principal: Minijuego 8-Bit (por defecto) o Cámara Real */}
        <section className="relative w-full">
          {use8BitMinigameView ? (
            <FnafStageMinigame
              isStrobeAlert={strobeStatus.isDangerous}
              hasObstacleAlert={obstacleAnalysis.hasHazard}
              strobeHz={strobeStatus.frequencyHz}
              onTriggerSimulatedSign={handleInjectSimulatedSign}
              onToggleRealCamera={() => setUse8BitMinigameView(false)}
              isRealCameraActive={false}
            />
          ) : (
            <div className="fnaf-crt-box rounded-2xl overflow-hidden border-4 border-[#3c3468]">
              <div className="bg-[#090814] px-4 py-2 border-b-2 border-[#3c3468] flex items-center justify-between text-xs text-green-400 font-pixel">
                <span className="flex items-center gap-1.5 text-[9px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  CÁMARA TRASERA EN VIVO (WEBCAM)
                </span>
                <button
                  onClick={() => setUse8BitMinigameView(true)}
                  className="px-2 py-0.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500 rounded text-purple-200 text-[8px]"
                >
                  VOLVER A 8-BIT
                </button>
              </div>
              <MainCameraHUD
                filterMode={filterMode}
                onStrobeUpdate={setStrobeStatus}
                onObstacleUpdate={setObstacleAnalysis}
                onFpsUpdate={setFps}
                externalSignToProcess={simulatedSignText}
                onSignProcessed={handleSignProcessed}
                registerOcrTrigger={handleRegisterOcrTrigger}
              />
            </div>
          )}
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
            <div className="fnaf-crt-box rounded-2xl p-5 border-4 border-[#3c3468]">
              <h3 className="text-sm sm:text-base font-pixel text-[#00ff66] uppercase mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                FUNDAMENTO MÉDICO: FOTOSENSIBILIDAD
              </h3>
              <p className="text-base text-gray-200 leading-relaxed mb-3 font-crt">
                Las luces estroboscópicas con frecuencias comprendidas entre <b>3 Hz y 30 Hz</b>{' '}
                (con pico de riesgo entre 12 Hz y 18 Hz) pueden inducir crisis convulsivas en personas con
                epilepsia fotosensible, además de provocar desorientación espacial severa y mareo en
                visitantes con baja visión.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm font-crt">
                <div className="p-3 rounded-lg bg-black/60 border-2 border-emerald-500/40">
                  <span className="text-emerald-400 font-pixel text-[9px] block mb-1">0 A 2.9 HZ</span>
                  <span className="text-gray-300">Parpadeo lento no convulsivo</span>
                </div>
                <div className="p-3 rounded-lg bg-black/60 border-2 border-red-500/60">
                  <span className="text-red-400 font-pixel text-[9px] block mb-1">3.0 A 30 HZ</span>
                  <span className="text-gray-300">Zona de alto riesgo neurológico</span>
                </div>
                <div className="p-3 rounded-lg bg-black/60 border-2 border-amber-500/40">
                  <span className="text-amber-400 font-pixel text-[9px] block mb-1">&gt; 30 HZ</span>
                  <span className="text-gray-300">Fusión visual continua</span>
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

        {activeTab === 'AUDIT' && (
          <div className="space-y-4">
            <VenueAuditComplianceDisplay
              events={telemetryEvents}
              onClearEvents={() => setTelemetryEvents([])}
              currentStrobeHz={strobeStatus.frequencyHz}
              hasObstacle={obstacleAnalysis.hasHazard}
              isPanicActive={isPanicActive}
            />
          </div>
        )}

        {activeTab === 'DOCS' && (
          <div className="fnaf-crt-box rounded-2xl p-5 sm:p-6 border-4 border-[#3c3468] space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-[#3c3468]">
              <div className="p-3 rounded-xl bg-purple-950/80 border-2 border-purple-500/60 text-purple-300">
                <FileCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-pixel text-white">
                  FAZBEAR ENTERTAINMENT // PROTOCOLO LUZÍA
                </h2>
                <p className="text-sm text-green-400 font-crt">
                  Manual de Seguridad Sensorial y Especificaciones Técnicas (14 Días)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-crt">
              <div className="p-4 rounded-xl bg-black/60 border-2 border-[#3c3468] space-y-2">
                <h3 className="font-pixel text-[9px] text-amber-300 uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> 1. La Necesidad en Eventos de Terror
                </h3>
                <p className="text-gray-200 leading-relaxed">
                  En festivales y casas del terror, la iluminación tenue, los efectos estroboscópicos
                  y el cableado expuesto a nivel de suelo generan un entorno de alto riesgo y
                  desorientación para personas con baja visión, ceguera parcial o fotosensibilidad.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/60 border-2 border-[#3c3468] space-y-2">
                <h3 className="font-pixel text-[9px] text-emerald-300 uppercase flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> 2. Los 3 Pilares Resueltos
                </h3>
                <ul className="text-gray-200 space-y-1.5 list-disc pl-4">
                  <li><b>Detector Háptico de Estrobos:</b> Análisis de frecuencia (3 - 30 Hz).</li>
                  <li><b>Scanner de Suelo:</b> Filtros de bordes y pulsos sónar proporcionales a la proximidad.</li>
                  <li><b>OCR + TTS Local:</b> Lectura instantánea por voz de letreros en penumbra sin internet.</li>
                </ul>
              </div>
            </div>

            {/* Comparativa de Mercado Fazbear vs Convencional */}
            <div>
              <h3 className="font-pixel text-[9px] text-gray-300 uppercase mb-3">
                COMPARATIVA CON SOLUCIONES ACTUALES DE MERCADO
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-crt border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#3c3468] text-gray-400">
                      <th className="py-2 px-3 font-pixel text-[8px]">Solución Tradicional</th>
                      <th className="py-2 px-3 font-pixel text-[8px]">Limitación en Eventos Nocturnos</th>
                      <th className="py-2 px-3 font-pixel text-[8px] text-green-400">Ventaja Clave Luzía</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2448] text-gray-200">
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
            <div className="p-4 rounded-xl bg-purple-950/40 border-2 border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-pixel text-[9px] text-purple-300 block mb-0.5">
                  POLÍTICA DE PRIVACIDAD & SEGURIDAD DE DATOS (ON-DEVICE)
                </span>
                <span className="text-xs text-gray-400 block font-crt">
                  Cumplimiento verificado con Google Play Data Safety & App Store Review Guidelines
                </span>
              </div>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400 text-purple-200 font-pixel text-[8px] transition-all shrink-0"
              >
                VER POLÍTICA PÚBLICA ↗
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Barra de Navegación Inferior Móvil Fazbear con Soporte Safe-Area Nativo (Android/iOS) */}
      <nav
        className="fixed bottom-0 left-0 right-0 w-full bg-[#080712]/95 backdrop-blur-md border-t-4 border-[#3c3468] flex items-center justify-between z-40 select-none font-pixel shadow-[0_-8px_25px_rgba(0,0,0,0.8)]"
        style={{
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(0.35rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.35rem, env(safe-area-inset-right, 0px))',
          paddingTop: '0.4rem',
        }}
        role="navigation"
        aria-label="Navegación principal de Luzía"
      >
        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('HUD')
          }}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-0.5 rounded-lg transition-all ${
            activeTab === 'HUD'
              ? 'text-cyan-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
          title="Ver escenario y visor de cámara"
        >
          <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8px] truncate max-w-full">ESCENARIO</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('STROBE')
          }}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-0.5 rounded-lg transition-all ${
            activeTab === 'STROBE'
              ? 'text-red-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
          title="Monitoreo de estrobos y fotosensibilidad"
        >
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8px] truncate max-w-full">ESTROBOS</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('OCR')
          }}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-0.5 rounded-lg transition-all ${
            activeTab === 'OCR'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
          title="Lector de señales nocturnas por voz"
        >
          <ScanText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8px] truncate max-w-full">SEÑALES</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('AUDIT')
          }}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-0.5 rounded-lg transition-all ${
            activeTab === 'AUDIT'
              ? 'text-purple-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
          title="Registro de eventos y auditoría"
        >
          <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8px] truncate max-w-full">AUDITORÍA</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setActiveTab('DOCS')
          }}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-0.5 rounded-lg transition-all ${
            activeTab === 'DOCS'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-gray-400 hover:text-white'
          }`}
          title="Manual técnico y normativas de seguridad"
        >
          <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8px] truncate max-w-full">MANUAL</span>
        </button>

        <button
          onClick={() => {
            HapticsService.tap()
            setIsSettingsOpen(true)
          }}
          className="flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 px-0.5 rounded-lg text-gray-400 hover:text-white transition-all"
          title="Ajustes de accesibilidad"
        >
          <Sliders className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="text-[6.5px] xs:text-[7.5px] sm:text-[8px] truncate max-w-full">AJUSTES</span>
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
        onToggleTts={() => {
          setIsTtsEnabled(prev => {
            const next = !prev
            TtsService.setEnabled(next && !isMuted)
            return next
          })
        }}
        highSensitivityStrobe={highSensitivityStrobe}
        onToggleStrobeSensitivity={() => setHighSensitivityStrobe(prev => !prev)}
        isAccessibleFont={isAccessibleFont}
        onToggleFont={() => setIsAccessibleFont(prev => !prev)}
        onApplyProfile={handleApplyProfile}
      />
    </div>
  )
}

export default App
