import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, Video, AlertCircle, Flashlight, FlashlightOff, ScanText, RefreshCw, CheckCircle2, SwitchCamera } from 'lucide-react'
import { StrobeDetector, type StrobeStatus } from '../services/strobeDetector'
import { ObstacleScanner, type ObstacleAnalysisResult, type VisualFilterMode } from '../services/obstacleScanner'
import { HapticsService } from '../services/hapticsService'
import { AudioFeedbackService } from '../services/audioFeedbackService'
import { OcrService, type OcrResult } from '../services/ocrService'
import { TtsService } from '../services/ttsService'

interface MainCameraHUDProps {
  filterMode: VisualFilterMode
  onStrobeUpdate: (status: StrobeStatus) => void
  onObstacleUpdate: (analysis: ObstacleAnalysisResult) => void
  onFpsUpdate: (fps: number) => void
  externalSignToProcess?: string | null
  onSignProcessed?: (result: OcrResult) => void
  registerOcrTrigger: (fn: () => Promise<OcrResult | null>) => void
}

export const MainCameraHUD: React.FC<MainCameraHUDProps> = ({
  filterMode,
  onStrobeUpdate,
  onObstacleUpdate,
  onFpsUpdate,
  externalSignToProcess,
  onSignProcessed,
  registerOcrTrigger,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isUsingSimulatedFeed, setIsUsingSimulatedFeed] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [isExtremeDarkness, setIsExtremeDarkness] = useState(false)
  const [showDarknessPrompt, setShowDarknessPrompt] = useState(false)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [quickOcrFeedback, setQuickOcrFeedback] = useState<string | null>(null)

  // Animación del feed simulado cuando no hay cámara web física disponible
  const simFrameRef = useRef<number>(0)
  const lastDangerSoundTimeRef = useRef<number>(0)
  const lastTapTimeRef = useRef<number>(0)
  const lastDarknessVoiceAlertRef = useRef<number>(0)

  // Iniciar Stream de Cámara con soporte para Cámara Trasera o Frontal
  const startCamera = useCallback(async (targetFacing: 'environment' | 'user' = 'environment') => {
    try {
      setCameraError(null)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador no soporta acceso a cámara directa.')
      }

      // Detener pistas previas si existían
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream
        oldStream.getTracks().forEach(t => t.stop())
      }

      let stream: MediaStream
      try {
        // Intento 1: Solicitar la cámara especificada (ej. trasera o frontal)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
      } catch {
        // Fallback 1: Si targetFacing falla (ej. PC/laptop sin cámara trasera), abrir cualquier cámara disponible
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      const videoEl = videoRef.current
      if (videoEl) {
        videoEl.srcObject = stream
        await videoEl.play()
        setHasCameraPermission(true)
        setIsUsingSimulatedFeed(false)
        setFacingMode(targetFacing)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara.'
      setCameraError(msg)
      setHasCameraPermission(false)
      setIsUsingSimulatedFeed(true) // Fallback al simulador inmersivo de terror
    }
  }, [])

  // Alternar entre cámara trasera y delantera en teléfonos
  const handleToggleFacingMode = useCallback(async () => {
    HapticsService.tap()
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment'
    TtsService.speak(
      nextFacing === 'environment'
        ? 'Cámara trasera activada. Orientada hacia el suelo y señalética.'
        : 'Cámara frontal activada.'
    )
    await startCamera(nextFacing)
  }, [facingMode, startCamera])

  useEffect(() => {
    const videoEl = videoRef.current
    const run = async () => {
      await startCamera('environment')
    }
    run()

    return () => {
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [startCamera])

  // Inyectar letrero simulado si viene de fuera
  useEffect(() => {
    if (externalSignToProcess) {
      const mockResult: OcrResult = {
        text: externalSignToProcess,
        confidence: 96,
        guidanceMessage:
          externalSignToProcess.includes('SALIDA')
            ? 'Salida localizada al frente. Continúe con precaución.'
            : externalSignToProcess.includes('EVACUACIÓN')
            ? 'Ruta de evacuación identificada.'
            : externalSignToProcess.includes('PELIGRO')
            ? '¡Atención! Zona de peligro por instalaciones eléctricas.'
            : `Letrero detectado: ${externalSignToProcess}`,
      }
      onSignProcessed?.(mockResult)
    }
  }, [externalSignToProcess, onSignProcessed])

  // Refs sincronizados mediante useEffect para evitar accesos indebidos durante el render
  const onStrobeUpdateRef = useRef(onStrobeUpdate)
  const onObstacleUpdateRef = useRef(onObstacleUpdate)
  const onFpsUpdateRef = useRef(onFpsUpdate)

  useEffect(() => {
    onStrobeUpdateRef.current = onStrobeUpdate
    onObstacleUpdateRef.current = onObstacleUpdate
    onFpsUpdateRef.current = onFpsUpdate
  }, [onStrobeUpdate, onObstacleUpdate, onFpsUpdate])

  const lastStrobeUpdateTimeRef = useRef<number>(0)
  const lastObstacleUpdateTimeRef = useRef<number>(0)
  const lastStrobeDangerStateRef = useRef<boolean>(false)
  const lastHazardStateRef = useRef<boolean>(false)

  // Método de escaneo OCR expuesto con captura en alta resolución nativa de la cámara
  const triggerOcrScan = useCallback(async (): Promise<OcrResult | null> => {
    const video = videoRef.current
    if (!isUsingSimulatedFeed && video && video.readyState >= 2 && video.videoWidth > 0) {
      // Capturar fotograma en alta resolución directamente del stream del sensor (HD/Full HD)
      const hdCanvas = document.createElement('canvas')
      hdCanvas.width = video.videoWidth
      hdCanvas.height = video.videoHeight
      const hdCtx = hdCanvas.getContext('2d', { willReadFrequently: true })
      if (hdCtx) {
        hdCtx.drawImage(video, 0, 0, hdCanvas.width, hdCanvas.height)
        return await OcrService.recognizeText(hdCanvas)
      }
    }
    const canvas = displayCanvasRef.current || sourceCanvasRef.current
    if (!canvas) return null
    return await OcrService.recognizeText(canvas)
  }, [isUsingSimulatedFeed])

  useEffect(() => {
    registerOcrTrigger(triggerOcrScan)
  }, [registerOcrTrigger, triggerOcrScan])

  // Control de linterna / Flash LED para penumbra con activación manual o táctil
  const handleToggleTorch = useCallback(async (forcedState?: boolean) => {
    HapticsService.tap()
    const nextState = forcedState !== undefined ? forcedState : !isTorchOn
    setIsTorchOn(nextState)

    if (nextState) {
      setShowDarknessPrompt(false)
      AudioFeedbackService.playSuccessChime()
      TtsService.speak('Linterna activada. Escaneando suelo.', true)
    } else {
      TtsService.speak('Linterna desactivada.', true)
    }

    try {
      const videoEl = videoRef.current
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream
        const track = stream.getVideoTracks()[0]
        if (track) {
          const applyConstraints = track.applyConstraints as (c: unknown) => Promise<void>
          if (applyConstraints) {
            await applyConstraints({
              advanced: [{ torch: nextState }],
            })
          }
        }
      }
    } catch {
      // Ignorar si no hay soporte por hardware
    }
  }, [isTorchOn])

  // Escaneo rápido de señalética directo desde el HUD
  const handleQuickOcr = async () => {
    if (isOcrProcessing) return
    setIsOcrProcessing(true)
    HapticsService.tap()
    setQuickOcrFeedback('Enfocando letrero...')
    TtsService.speak('Analizando señalética al frente...', true)

    try {
      const result = await triggerOcrScan()
      if (result && result.text) {
        onSignProcessed?.(result)
        AudioFeedbackService.playSuccessChime()
        setQuickOcrFeedback(`"${result.text}"`)
        setTimeout(() => setQuickOcrFeedback(null), 4000)
      } else {
        setQuickOcrFeedback('Sin texto legible')
        TtsService.speak('No se detectó letrero legible. Apunte al centro o active la linterna.')
        setTimeout(() => setQuickOcrFeedback(null), 2500)
      }
    } catch {
      setQuickOcrFeedback('Error al procesar')
      setTimeout(() => setQuickOcrFeedback(null), 2000)
    } finally {
      setIsOcrProcessing(false)
    }
  }

  // Doble toque en el visor para disparar lectura OCR rápida o toque para encender linterna en oscuridad
  const handleCanvasTouchOrClick = () => {
    if (showDarknessPrompt && !isTorchOn) {
      handleToggleTorch(true)
      return
    }
    const now = performance.now()
    if (now - lastTapTimeRef.current < 380) {
      handleQuickOcr()
      lastTapTimeRef.current = 0
    } else {
      lastTapTimeRef.current = now
    }
  }

  // Loop de procesamiento de fotogramas (60 FPS)
  useEffect(() => {
    let animationFrameId: number
    let frameCount = 0
    let lastFpsTime = performance.now()

    const processLoop = () => {
      const now = performance.now()
      frameCount++

      if (now - lastFpsTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime))
        onFpsUpdateRef.current(currentFps)
        frameCount = 0
        lastFpsTime = now
      }

      const video = videoRef.current
      const sourceCanvas = sourceCanvasRef.current
      const displayCanvas = displayCanvasRef.current

      if (sourceCanvas && displayCanvas) {
        const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
        const dCtx = displayCanvas.getContext('2d')

        if (sCtx && dCtx) {
          const w = sourceCanvas.width
          const h = sourceCanvas.height

          if (!isUsingSimulatedFeed && video && video.readyState >= 2) {
            // Dibujar video real en canvas fuente
            sCtx.drawImage(video, 0, 0, w, h)
          } else {
            // Renderizar Escenario de Terror Simulado (Penumbra, Cables en suelo, Paredes)
            simFrameRef.current++
            sCtx.fillStyle = '#06070a'
            sCtx.fillRect(0, 0, w, h)

            // Paredes y techo en penumbra
            sCtx.fillStyle = '#11141c'
            sCtx.beginPath()
            sCtx.moveTo(0, 0)
            sCtx.lineTo(w, 0)
            sCtx.lineTo(w * 0.8, h * 0.45)
            sCtx.lineTo(w * 0.2, h * 0.45)
            sCtx.closePath()
            sCtx.fill()

            // Suelo de la casa del terror
            sCtx.fillStyle = '#0a0d14'
            sCtx.fillRect(0, h * 0.45, w, h * 0.55)

            // Simular Cables cruzados en el suelo (Obstáculos dinámicos)
            sCtx.strokeStyle = '#2b303d'
            sCtx.lineWidth = 6
            sCtx.beginPath()
            sCtx.moveTo(w * 0.1, h * 0.95)
            sCtx.bezierCurveTo(w * 0.4, h * 0.85, w * 0.6, h * 0.92, w * 0.9, h * 0.75)
            sCtx.stroke()

            sCtx.lineWidth = 4
            sCtx.beginPath()
            sCtx.moveTo(w * 0.2, h * 0.65)
            sCtx.lineTo(w * 0.7, h * 0.82)
            sCtx.stroke()

            // Simular un desnivel/escalón
            sCtx.strokeStyle = '#3a4052'
            sCtx.lineWidth = 5
            sCtx.beginPath()
            sCtx.moveTo(w * 0.15, h * 0.7)
            sCtx.lineTo(w * 0.85, h * 0.7)
            sCtx.stroke()

            // Simular un letrero luminoso de salida al fondo en penumbra
            sCtx.fillStyle = '#004018'
            sCtx.fillRect(w * 0.38, h * 0.22, w * 0.24, h * 0.12)
            sCtx.fillStyle = '#00ff66'
            sCtx.font = 'bold 14px monospace'
            sCtx.textAlign = 'center'
            sCtx.fillText('SALIDA', w * 0.5, h * 0.29)
          }

          // 1. Análisis de Fotosensibilidad Estroboscópica
          const strobeStatus = StrobeDetector.analyzeFrame(sCtx, w, h, now)
          if (
            strobeStatus.isDangerous !== lastStrobeDangerStateRef.current ||
            now - lastStrobeUpdateTimeRef.current >= 120
          ) {
            onStrobeUpdateRef.current(strobeStatus)
            lastStrobeDangerStateRef.current = strobeStatus.isDangerous
            lastStrobeUpdateTimeRef.current = now
          }

          if (strobeStatus.isDangerous) {
            // Feedback háptico y sonoro
            HapticsService.strobeWarning()
            if (now - lastDangerSoundTimeRef.current > 400) {
              AudioFeedbackService.playStrobeAlarm()
              lastDangerSoundTimeRef.current = now
            }
          }

          // 2. Procesamiento de Bordes de Alto Contraste y Escáner de Suelo
          const obstacleAnalysis = ObstacleScanner.processFrame(sCtx, dCtx, w, h, filterMode, 34)
          if (
            obstacleAnalysis.hasHazard !== lastHazardStateRef.current ||
            now - lastObstacleUpdateTimeRef.current >= 120
          ) {
            onObstacleUpdateRef.current(obstacleAnalysis)
            lastHazardStateRef.current = obstacleAnalysis.hasHazard
            lastObstacleUpdateTimeRef.current = now
          }

          // 3. Detección Inteligente de Oscuridad Extrema (Salón Negro / < 14 Lux)
          if (obstacleAnalysis.isExtremeDarkness && !isTorchOn) {
            setIsExtremeDarkness(true)
            setShowDarknessPrompt(true)
            if (now - lastDarknessVoiceAlertRef.current > 16000) {
              TtsService.speak(
                'Oscuridad extrema detectada. Toca la pantalla para activar la linterna asistiva y escanear el suelo.'
              )
              HapticsService.tap()
              lastDarknessVoiceAlertRef.current = now
            }
          } else {
            setIsExtremeDarkness(false)
            if (isTorchOn || !obstacleAnalysis.isExtremeDarkness) {
              setShowDarknessPrompt(false)
            }
          }

          if (obstacleAnalysis.hasHazard && !strobeStatus.isDangerous) {
            // Pulso háptico y beep de proximidad espacial proporcional y direccional
            HapticsService.obstaclePulse(obstacleAnalysis.proximityIndex)
            AudioFeedbackService.playObstacleProximityBeep(
              obstacleAnalysis.proximityIndex,
              obstacleAnalysis.hazardZone
            )
          }
        }
      }

      animationFrameId = requestAnimationFrame(processLoop)
    }

    animationFrameId = requestAnimationFrame(processLoop)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [filterMode, isUsingSimulatedFeed, facingMode, isTorchOn, handleToggleTorch])

  return (
    <div
      onClick={handleCanvasTouchOrClick}
      className="relative w-full aspect-[4/3] sm:aspect-video max-h-[58vh] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] select-none cursor-pointer"
      title="Doble toque en cualquier lugar para leer señalética al frente por voz"
      role="region"
      aria-label="Visor HUD Asistivo de Cámara y Escaneo Sensorial"
    >
      {/* Video oculto para captura de cámara */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Canvas oculto para muestreo */}
      <canvas
        ref={sourceCanvasRef}
        width={360}
        height={270}
        className="hidden"
      />

      {/* Canvas principal procesado y visible */}
      <canvas
        ref={displayCanvasRef}
        width={360}
        height={270}
        className="w-full h-full object-cover block"
      />

      {/* Capa de Efectos de Visión Nocturna / Scanlines */}
      <div className="absolute inset-0 scanlines-overlay opacity-60 pointer-events-none" />

      {/* Linterna / Luz auxiliar en pantalla */}
      {isTorchOn && (
        <div className="absolute inset-0 bg-amber-100/10 pointer-events-none mix-blend-screen animate-pulse" />
      )}

      {/* Retícula Táctica de Escaneo HUD */}
      <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
        {/* Esquinas tácticas y estado */}
        <div className="flex justify-between items-start">
          <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
          <div className="flex flex-col items-center gap-1">
            <div className="text-[10px] font-mono bg-black/75 px-2.5 py-0.5 rounded text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
              {isUsingSimulatedFeed
                ? 'MODO: SIMULADOR DE TERROR'
                : facingMode === 'environment'
                ? 'STREAM: CÁMARA TRASERA (SUELO & SEÑALES)'
                : 'STREAM: CÁMARA FRONTAL'}
            </div>
            {isExtremeDarkness && (
              <div className="text-[9px] font-mono bg-amber-950/90 text-yellow-300 border border-amber-500/80 px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_15px_#f59e0b] animate-pulse">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span>{isTorchOn ? 'OSCURIDAD SEVERA · LINTERNA LED ACTIVA' : 'PENUMBRA EXTREMA · GANANCIA NOCTURNA DIGITAL'}</span>
              </div>
            )}
          </div>
          <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
        </div>

        {/* Zona Central: Retícula de Enfoque para Señalética */}
        <div className="self-center relative flex items-center justify-center">
          <div
            className={`w-36 h-22 sm:w-44 sm:h-28 border-2 border-dashed rounded-xl flex items-center justify-center transition-all ${
              isOcrProcessing
                ? 'border-cyan-300 bg-cyan-950/40 shadow-[0_0_20px_#00f0ff]'
                : 'border-cyan-400/50 bg-black/30'
            }`}
          >
            <span className="text-[10px] font-mono font-bold text-cyan-200 uppercase tracking-wider text-center px-1">
              {isOcrProcessing ? 'ANALIZANDO...' : 'ENFOCAR SEÑAL'}
            </span>
          </div>
          <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        {/* Zona Inferior: Retícula de Suelo y Obstáculos */}
        <div className="relative">
          <div className="w-full border-t border-dashed border-amber-500/50 mb-1 flex justify-between text-[9px] sm:text-[10px] font-mono text-amber-300 px-1 bg-black/50 rounded py-0.5">
            <span>◄ SECTOR SUELO / CABLES</span>
            <span className="text-[8px] text-gray-400 hidden sm:inline">DOBLE TOQUE: LEER SEÑAL</span>
            <span>DESNIVELES ►</span>
          </div>
          <div className="flex justify-between items-end">
            <div className="w-6 h-6 border-b-2 border-l-2 border-amber-400" />
            <div className="w-6 h-6 border-b-2 border-r-2 border-amber-400" />
          </div>
        </div>
      </div>

      {/* Controles Flotantes Superiores sobre la Cámara */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20">
        <button
          onClick={e => {
            e.stopPropagation()
            HapticsService.tap()
            if (isUsingSimulatedFeed) {
              startCamera(facingMode)
            } else {
              setIsUsingSimulatedFeed(true)
            }
          }}
          className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-black border border-white/20 text-white flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md active:scale-95"
          aria-label={isUsingSimulatedFeed ? 'Activar cámara física' : 'Simular entorno'}
        >
          {isUsingSimulatedFeed ? <Camera className="w-3.5 h-3.5 text-cyan-400" /> : <Video className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{isUsingSimulatedFeed ? 'CÁMARA' : 'SIMULAR'}</span>
        </button>

        {/* Botón Alternar Cámara Trasera / Frontal para Teléfonos */}
        {!isUsingSimulatedFeed && (
          <button
            onClick={e => {
              e.stopPropagation()
              handleToggleFacingMode()
            }}
            className="text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-black border border-cyan-500/50 text-cyan-300 flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md active:scale-95"
            title={facingMode === 'environment' ? 'Cambiar a cámara frontal' : 'Cambiar a cámara trasera'}
            aria-label="Alternar entre cámara frontal y trasera"
          >
            <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{facingMode === 'environment' ? 'TRASERA' : 'FRONTAL'}</span>
          </button>
        )}

        {/* Botón Linterna LED para penumbra */}
        <button
          onClick={e => {
            e.stopPropagation()
            handleToggleTorch()
          }}
          className={`text-[11px] font-mono px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 backdrop-blur-md transition-all shadow-md active:scale-95 ${
            isTorchOn
              ? 'bg-amber-500 text-black border-amber-300 font-bold shadow-[0_0_15px_#f59e0b]'
              : 'bg-black/80 hover:bg-black text-amber-300 border-amber-500/40'
          }`}
          title="Encender Linterna LED para iluminar el camino en penumbra"
          aria-label={isTorchOn ? 'Apagar linterna' : 'Encender linterna'}
        >
          {isTorchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isTorchOn ? 'LUZ ON' : 'LINTERNA'}</span>
        </button>
      </div>

      {/* Botón Flotante Superior Derecho: Escaneo Rápido de Señales */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
        <button
          onClick={e => {
            e.stopPropagation()
            handleQuickOcr()
          }}
          disabled={isOcrProcessing}
          className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg active:scale-95 ${
            isOcrProcessing
              ? 'bg-cyan-600 text-white border-cyan-300 animate-pulse'
              : 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-400/80 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
          }`}
          title="Escanear letrero al frente y leer en voz alta"
          aria-label="Leer letrero al frente"
        >
          {isOcrProcessing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>LEYENDO...</span>
            </>
          ) : (
            <>
              <ScanText className="w-3.5 h-3.5 text-cyan-300" />
              <span>LEER SEÑAL</span>
            </>
          )}
        </button>
      </div>

      {/* Toast informativo flotante de resultado OCR */}
      {quickOcrFeedback && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/90 border border-cyan-400 text-cyan-200 text-xs font-mono flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.5)] z-30 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-bold">{quickOcrFeedback}</span>
        </div>
      )}

      {/* Banner interactivo táctico al detectar oscuridad extrema */}
      {showDarknessPrompt && !isTorchOn && (
        <div
          onClick={e => {
            e.stopPropagation()
            handleToggleTorch(true)
          }}
          className="absolute inset-x-3 sm:inset-x-8 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-[#090814]/95 border-2 border-amber-400 text-amber-200 flex flex-col items-center justify-center gap-2.5 backdrop-blur-md shadow-[0_0_35px_rgba(245,158,11,0.7)] z-30 cursor-pointer animate-pulse active:scale-95 transition-transform select-none"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 font-pixel text-xs sm:text-sm text-amber-300">
            <Flashlight className="w-5 h-5 text-amber-400 animate-bounce" />
            <span>OSCURIDAD EXTREMA DETECTADA</span>
          </div>
          <p className="text-center font-mono text-xs sm:text-sm text-gray-200 leading-snug">
            La cámara no recibe luz. <b>Toca aquí o cualquier parte de la pantalla</b> para activar la linterna asistiva y escanear el suelo.
          </p>
          <button
            type="button"
            className="mt-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-pixel text-[9px] uppercase font-bold shadow-[0_0_15px_#f59e0b] flex items-center gap-1.5"
          >
            <Flashlight className="w-4 h-4" />
            <span>ACTIVAR LUZ ASISTIVA</span>
          </button>
        </div>
      )}

      {/* Mensaje si la cámara falló */}
      {cameraError && hasCameraPermission === false && (
        <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/85 border border-amber-500/50 text-amber-300 text-[11px] font-mono flex items-center gap-2 z-20 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Cámara física no disponible ({cameraError}). Simulador interactivo de terror activado
            para evaluación sensorial.
          </span>
        </div>
      )}
    </div>
  )
}
