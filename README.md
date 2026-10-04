# 👁️ Luzía: Asistente Sensorial de Movilidad y Accesibilidad
### ⚡ Especializado para Eventos Nocturnos, Festivales y Casas del Terror

> **MVP Acelerado (14 Días) — Web App (PWA) + App Móvil Híbrida (Capacitor Android & iOS)**  
> Desarrollado para personas con **baja visión, ceguera parcial o fotosensibilidad severa** en entornos de penumbra, cableado expuesto en el suelo y luces parpadeantes.

---

## 📸 Resumen de Capacidades Técnicas (Los 3 Pilares del Proyecto)

### 1. ⚡ Detector Háptico de Luces Estroboscópicas (Fotosensibilidad)
- **Procesamiento de luminancia:** Muestreo en tiempo real a 60 FPS de la luminancia media $Y = 0.299R + 0.587G + 0.114B$.
- **Rango de frecuencia clínica:** Detección precisa de parpadeos entre **3 Hz y 30 Hz** (con zona crítica neurológica de 12 Hz a 18 Hz).
- **Feedback sensorial inmediato:** Alerta visual neón carmesí, patrón háptico severo (`Haptics.notification` + `navigator.vibrate`) y tono oscilante de advertencia para que el usuario desvíe la mirada con antelación.

### 2. 👣 Scanner de Obstáculos por Alto Contraste (Cables y Desniveles en Suelo)
- **Filtro de bordes Sobel:** Algoritmo de convolución optimizado en Canvas enfocado en el tercio inferior del campo visual (suelo).
- **Modos visuales accesibles:**
  - **Bordes Neón:** Cables y escalones resaltados en verde fosforescente y rojo carmesí sobre fondo negro azabache (WCAG AAA).
  - **Visión Nocturna:** Aumento gamma de penumbra con realce de bordes.
  - **Alto Contraste Monocromático:** Máxima legibilidad en blanco y negro puro.
- **Pulsos hápticos y sónar acústico:** A menor distancia del cable o desnivel, mayor frecuencia y cadencia de pulsos mecánicos y sonoros (efecto sónar / sensor de reversa).

### 3. 🔍 Lector de Señalética Nocturna (OCR + TTS Local On-Device)
- **Motor On-Device:** Reconocimiento óptico de caracteres local con Tesseract.js (sin necesidad de conexión a internet ni servidores externos).
- **Binarización adaptativa:** Pre-procesamiento de alto contraste para letreros reflectantes o débilmente iluminados en la oscuridad.
- **Voz sintética asistiva (TTS):** Síntesis de voz instantánea en español orientada a emergencias (`"Salida de emergencia localizada al frente"`, `"Ruta de evacuación"`, `"Peligro: Alto voltaje"`).

---

## 🎮 Simulador de Terror Integrado (Para Evaluadores y Pitch)
Luzía cuenta con un **botón "TEST DE TERROR"** en el header para validar todas las funciones sensoriales directamente desde la PC o celular sin necesidad de estar dentro de una casa del terror física:
- **Estroboscopio Virtual:** Generador de destellos a 6 Hz, 12 Hz, 18 Hz y 24 Hz para validar la alarma y vibración.
- **Inyector de Señalética de Evacuación:** Permite probar el reconocimiento y la voz en español al instante.
- **Modo Suelo con Cables:** Patrón oscuro interactivo con cables y escalones para probar el filtro de bordes Sobel.

---

## 🚀 Cómo Ejecutar y Probar el Proyecto

### 1. Ejecutar como Web App / PWA
```bash
# Instalar dependencias (si no se han instalado)
npm install

# Iniciar servidor de desarrollo local
npm run dev

# Abrir en tu navegador:
# http://localhost:5173
```

### 2. Compilar y Ejecutar en Android (Local en Windows)
```bash
# 1. Compilar los assets web
npm run build

# 2. Sincronizar el proyecto nativo
npx cap sync android

# 3. Abrir en Android Studio
npx cap open android
```
*Desde Android Studio podrás conectar tu teléfono por USB o emulador y presionar **Run**.*

---

## 🍏 ¿Cómo Compilar para iOS Sin Tener Mac? (GitHub Actions Workflow)

Como no cuentas con una Mac física, se ha configurado un **pipeline automatizado de CI/CD** con **GitHub Actions** utilizando el runner oficial `macos-14` (Apple Silicon de Apple en la nube de GitHub).

### Archivos de Workflow incluidos:
- [`.github/workflows/ios-build.yml`](.github/workflows/ios-build.yml): Compila el proyecto Xcode y exporta el archivo `Luzia-Release.ipa` listo para descargar o subir a TestFlight.
- [`.github/workflows/android-build.yml`](.github/workflows/android-build.yml): Compila el APK de Release y el AAB (Android App Bundle) para Google Play Console.
- [`.github/workflows/web-deploy.yml`](.github/workflows/web-deploy.yml): Despliega la Web App automáticamente a GitHub Pages.

### Pasos para generar tu IPA de iOS en GitHub:
1. Sube este proyecto a tu repositorio de GitHub:
   ```bash
   git add .
   git commit -m "Luzia App: Asistente sensorial de terror y accesibilidad"
   git push origin main
   ```
2. Ve a la pestaña **Actions** en tu repositorio de GitHub.
3. Selecciona el workflow **"Build iOS App (Cloud macOS Runner)"**.
4. Haz clic en **Run workflow**.
5. GitHub levantará una máquina Mac en la nube, resolverá los paquetes, compilará la app y generará un artefacto descargable llamado `Luzia-iOS-IPA`.

---

## 🛠️ Stack Tecnológico
- **Frontend Core:** React 19 + TypeScript + Vite 8
- **Estilos:** Tailwind CSS v4 + Glassmorphism Cyber-Gothic de Alto Contraste
- **Procesamiento de Imagen:** HTML5 Canvas Offscreen 60 FPS + Kernel Sobel Convolucional
- **Accesibilidad & Sensores:**
  - `@capacitor/core` & `@capacitor/haptics` + `navigator.vibrate` (Háptica multiplataforma)
  - Web Audio API (Sónar acústico y osciladores polifónicos sin dependencias)
  - Web Speech Synthesis API (TTS local en español)
  - Tesseract.js (On-Device OCR)
- **Empaquetado Nativo:** Capacitor 8 (Android & iOS)
- **CI/CD Cloud:** GitHub Actions (macOS-14 + Ubuntu runners)
