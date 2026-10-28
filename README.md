# 👁️ Luzía — Asistente Sensorial de Movilidad y Accesibilidad
### ⚡ Proyecto de Ciencias e Innovación Tecnológica (Electriciencia)
> **Asistente sensorial multimodal para personas con baja visión, ceguera nocturna y fotosensibilidad severa en entornos de penumbra y eventos nocturnos.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20iOS%20%7C%20Web%20(PWA)-brightgreen)]()

---

## 🔬 Justificación Científica y Propósito del Proyecto

En atracciones nocturnas, conciertos, eventos culturales y casas del terror, confluyen tres factores de riesgo crítico para la salud y la accesibilidad:
1. **Riesgo de Convulsiones Fotosensibles:** Luces estroboscópicas parpadeando en frecuencias críticas (3 Hz a 30 Hz) que pueden detonar crisis de epilepsia fotosensible o cefaleas severas (Directrices médicas de la OMS y W3C WCAG 2.2).
2. **Desorientación y Caídas en Penumbra:** Cableado expuesto, desniveles y escalones en el suelo con iluminación nula o deficiente.
3. **Inaccesibilidad de Letreros de Evacuación:** Salidas de emergencia y rutas de evacuación no legibles en la oscuridad para personas con discapacidad visual.

**Luzía** resuelve estos tres problemas en tiempo real mediante **Edge Computing** (visión por computadora procesada 100% en el procesador local del dispositivo, sin internet ni servidores externos).

---

## 📸 Los 4 Pilares Técnicos de Luzía

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           L U Z Í A   (H U D)                                   │
├─────────────────┬─────────────────┬───────────────────┬─────────────────────────┤
│ 1. ESTROBOS     │ 2. OBSTÁCULOS   │ 3. SEÑALÉTICA OCR │ 4. LOCALIZACIÓN POR LUZ │
│ • Frecuencia Hz │ • Kernel Sobel  │ • Tesseract Local │ • Posicionamiento VLP   │
│ • Alerta 3-30Hz │ • Radar Suelo   │ • Síntesis TTS    │ • Brújula Fotométrica   │
│ • Tono + Háptico│ • Sónar Neón    │ • Voz de Auxilio  │ • Cero Falsos Positivos │
└─────────────────┴─────────────────┴───────────────────┴─────────────────────────┘
```

### 1. ⚡ Detector Estroboscópico de Fotosensibilidad
* **Algoritmo de Luminancia:** Muestreo a 60 FPS con la fórmula $Y = 0.299R + 0.587G + 0.114B$.
* **Rango Clínico:** Detección de frecuencias de 3 Hz a 30 Hz con zona neurológica crítica entre 12 Hz y 18 Hz.
* **Respuesta Inmediata:** Alerta visual carmesí, vibración mecánica háptica severa y tono oscilante para que el usuario aparte la vista antes de una crisis.

### 2. 👣 Escáner de Obstáculos por Alto Contraste
* **Kernel de Convolución Sobel:** Análisis espacial enfocado en el campo visual del suelo y frontal.
* **Modos de Filtro Visual:**
  * **Bordes Neón:** Resalta cables y escalones en verde fosforescente y rojo sobre fondo negro azabache (WCAG AAA).
  * **Visión Nocturna:** Realce de gamma para baja iluminación.
  * **Monocromático Puro:** Máximo contraste binario para debilidad visual.
* **Sónar Acústico y Háptico:** A menor distancia del obstáculo, mayor cadencia de pulsos sonoros y vibratorios (efecto sensor de reversa).

### 3. 🔍 Lector de Señalética Nocturna (OCR + Voz Asistiva)
* **On-Device OCR:** Reconocimiento de texto local sin conexión a internet mediante Tesseract.js.
* **Binarización Adaptativa:** Mejora de contraste de letreros reflectantes en penumbra.
* **Síntesis de Voz Asistiva:** Locución automática en español para rutas de escape (`"Salida de emergencia localizada al frente"`, `"Ruta de evacuación"`, `"Peligro"`).

### 4. 🧭 Localización Espacial en Interiores por Luz (VLP - Visible Light Positioning)
* **Fotometría en 5 Cuadrantes:** Muestreo de luminancia en tiempo real (Cenital/Techo, Frontal/Centro, Izquierda, Derecha y Suelo) para estimar lux relativos y vector director hacia la fuente de luz.
* **Detección de Ubicación y Balizas Ópticas:** Informa por voz asistiva dónde está el usuario con porcentaje de certeza exacto (`"Estás en Salón Iluminado"`, `"Estás en el Stand de Electriciencia"`, `"Estás frente a la Salida Iluminada"`).
* **Filtro Anti Falsos Positivos:** Consenso temporal de 12 fotogramas continuos y calibración diferenciada para Web (Webcam frontal) y Móvil (Cámara trasera).

---

## 🎮 Simulador de Terror Integrado (Demostrador para Evaluación)

Para validar la tecnología en condiciones controladas de laboratorio o frente al jurado en la feria de ciencias:
* **Entorno de Prueba FNAF (8-Bit Security Stage):** Escenario temático retro con animatrónicos en el que se recrean los tres peligros sensoriales.
* **Inyector de Estroboscopio:** Genera destellos a 6 Hz, 12 Hz, 18 Hz y 24 Hz para validar la alarma y la vibración en vivo.
* **Generador de Obstáculos de Suelo:** Prueba el filtro Sobel y el sónar sin tener que apagar las luces del auditorio.
* **Inyector de Señalética:** Permite evaluar el OCR y la voz asistiva al instante con un solo toque.

---

## 💻 Guía Rápida para Colaboradores (Programación Local)

### 📋 Requisitos Previos
* **Node.js** v20 o superior
* **npm** v10 o superior
* *(Opcional)* **Android Studio** si deseas probar en emulador o dispositivo Android por USB.

### 1. Clonar e Instalar
```bash
git clone https://github.com/tu-usuario/Electriciencia.git
cd Electriciencia
npm install
```

### 2. Ejecutar en Modo Desarrollo (Navegador)
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:5173](http://localhost:5173)

### 3. Compilar Proyecto
```bash
npm run build
```

### 4. Probar en Android (Local)
No requieres llaves de producción para programar. Android compilará automáticamente en modo `debug`:
```bash
# Sincronizar archivos web con Android
npx cap sync android

# Abrir en Android Studio
npx cap open android
```

---

## 🔐 Arquitectura de Seguridad y Distribución

Para proteger las credenciales oficiales de publicación en tiendas, el repositorio cuenta con un modelo de seguridad estricto:

| Componente | Nivel de Acceso | Ubicación |
| :--- | :--- | :--- |
| **Código Fuente** | Abierto a colaboradores | Todo el repositorio |
| **Android Debug** | Libre (sin credenciales) | Generado automáticamente por Gradle |
| **Android Release Keystore** | **Privado (Solo Dueño)** | `.gitignore` / `keystore.properties` local |
| **Apple Certificates & P12** | **Privado (Solo Dueño)** | GitHub Actions Secrets cifrados |
| **Workflows de Publicación** | **Manual (Solo Dueño)** | `.github/workflows/` (`workflow_dispatch`) |

*Los colaboradores pueden clonar, programar, modificar la interfaz y compilar localmente sin acceso a las credenciales oficiales de la App Store o Google Play.*

---

## 📂 Estructura del Proyecto

```text
Electriciencia/
├── android/                 # Proyecto nativo Android (Capacitor)
├── ios/                     # Proyecto nativo iOS (Xcode / Capacitor)
├── public/                  # Favicons, iconos PWA y manifiesto web
├── src/
│   ├── assets/              # Gráficos y recursos multimedia
│   ├── components/          # Componentes React (HUD, Radar, Minijuego, Modales)
│   │   ├── HeaderTactical.tsx
│   │   ├── MainCameraHUD.tsx
│   │   ├── StrobeRadarDisplay.tsx
│   │   ├── ObstacleRadarDisplay.tsx
│   │   ├── OcrSignReaderDisplay.tsx
│   │   ├── FnafStageMinigame.tsx
│   │   ├── HorrorSimulatorModal.tsx
│   │   └── AccessibilitySettingsDrawer.tsx
│   ├── services/            # Lógica y procesamiento de visión
│   │   ├── strobeDetector.ts       # Algoritmo de luminancia y Hz
│   │   ├── obstacleScanner.ts      # Convolución Sobel y distancias
│   │   ├── ocrService.ts           # Reconocimiento óptico de texto
│   │   ├── ttsService.ts           # Síntesis de voz asistiva
│   │   ├── hapticsService.ts       # Control de vibración háptica
│   │   └── audioFeedbackService.ts # Motor de sonido sintetizado
│   ├── App.tsx              # Componente principal y orquestador
│   └── main.tsx             # Punto de entrada de la aplicación
├── .github/workflows/       # Pipelines de CI/CD (Web, Android, iOS)
├── capacitor.config.ts      # Configuración de Capacitor
└── vite.config.ts           # Configuración de compilación Vite
```

---

## 📜 Licencia y Atribución
* Proyecto desarrollado para la **Feria de Ciencias y Tecnología (Electriciencia)**.
* Los algoritmos de detección estroboscópica y visión por computadora son de autoría original basados en las recomendaciones de fotosensibilidad de la **W3C (WCAG 2.2, Criterio 2.3.1)**.
* La temática retro de animatrónicos y escenario interactivo es utilizada exclusivamente con fines demostrativos, didácticos y de simulación experimental de entornos extremos.
