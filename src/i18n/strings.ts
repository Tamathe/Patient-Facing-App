export type Language = "en" | "es";

export type FoodLensStringKey =
  | "pageTitle"
  | "navLabel"
  | "viewfinderHint"
  | "scanHint"
  | "statusConnecting"
  | "statusListening"
  | "statusThinking"
  | "statusSpeaking"
  | "statusIdle"
  | "statusError"
  | "tapToStart"
  | "endSession"
  | "resume"
  | "retry"
  | "switchToTyped"
  | "cameraDenied"
  | "micDenied"
  | "cameraUnavailable"
  | "fallbackNotice"
  | "askPlaceholder"
  | "askButton"
  | "holdToTalkHint"
  | "visionEstimateBadge"
  | "unknownFood"
  | "logThis"
  | "loggedConfirmation"
  | "recentMealsTitle"
  | "noMealsYet"
  | "betterOptionHint"
  | "flagSodium"
  | "flagSaturatedFat"
  | "flagAddedSugars"
  | "flagPotassiumGood"
  | "flagFiberGood"
  | "flagPotassiumMed"
  | "flagSaltSubstituteMed"
  | "flagBpTrend";

export const foodLensStrings: Record<Language, Record<FoodLensStringKey, string>> = {
  en: {
    pageTitle: "Food Lens",
    navLabel: "Food",
    viewfinderHint: "Point at a food and just ask.",
    scanHint: "Line up the barcode.",
    statusConnecting: "Connecting…",
    statusListening: "Listening — just talk.",
    statusThinking: "Thinking…",
    statusSpeaking: "Speaking…",
    statusIdle: "Tap start to talk about this food.",
    statusError: "Something went wrong.",
    tapToStart: "Start",
    endSession: "End",
    resume: "Resume",
    retry: "Try again",
    switchToTyped: "Switch to typed mode",
    cameraDenied: "Camera access is off. Turn it on in Chrome site settings to scan foods.",
    micDenied: "Microphone access is off. You can still type your question below.",
    cameraUnavailable: "Camera is not available on this device.",
    fallbackNotice: "Voice is not set up, so type your question and I will answer.",
    askPlaceholder: "Ask about this food…",
    askButton: "Ask",
    holdToTalkHint: "Speak your question out loud.",
    visionEstimateBadge: "Estimate from photo",
    unknownFood: "This food",
    logThis: "Log this",
    loggedConfirmation: "Added to your meals",
    recentMealsTitle: "Recent meals",
    noMealsYet: "No meals logged yet.",
    betterOptionHint: "Ask for a better option.",
    flagSodium: "{amount} mg sodium — {percent}% of your {limit} mg daily limit",
    flagSaturatedFat: "{amount} g saturated fat — {percent}% of your {limit} g daily limit",
    flagAddedSugars: "{amount} g added sugars — {percent}% of your {limit} g daily limit",
    flagPotassiumGood: "{amount} mg potassium — good for blood pressure",
    flagFiberGood: "{amount} g fiber — good for your heart",
    flagPotassiumMed: "High in potassium — check with your care team first because you take {med}",
    flagSaltSubstituteMed: "This is a salt substitute — check with your care team first because you take {med}",
    flagBpTrend: "Your recent readings are trending up — extra reason to go easy on salt this week"
  },
  es: {
    pageTitle: "Lente de Comida",
    navLabel: "Comida",
    viewfinderHint: "Apunta a una comida y pregunta.",
    scanHint: "Alinea el código de barras.",
    statusConnecting: "Conectando…",
    statusListening: "Escuchando — solo habla.",
    statusThinking: "Pensando…",
    statusSpeaking: "Hablando…",
    statusIdle: "Toca empezar para hablar de esta comida.",
    statusError: "Algo salió mal.",
    tapToStart: "Empezar",
    endSession: "Terminar",
    resume: "Continuar",
    retry: "Intentar de nuevo",
    switchToTyped: "Cambiar a modo escrito",
    cameraDenied: "El acceso a la cámara está desactivado. Actívalo en la configuración de Chrome para escanear comidas.",
    micDenied: "El acceso al micrófono está desactivado. Aún puedes escribir tu pregunta abajo.",
    cameraUnavailable: "La cámara no está disponible en este dispositivo.",
    fallbackNotice: "La voz no está configurada, así que escribe tu pregunta y te respondo.",
    askPlaceholder: "Pregunta sobre esta comida…",
    askButton: "Preguntar",
    holdToTalkHint: "Di tu pregunta en voz alta.",
    visionEstimateBadge: "Estimado por la foto",
    unknownFood: "Esta comida",
    logThis: "Guardar",
    loggedConfirmation: "Agregado a tus comidas",
    recentMealsTitle: "Comidas recientes",
    noMealsYet: "Aún no hay comidas guardadas.",
    betterOptionHint: "Pide una mejor opción.",
    flagSodium: "{amount} mg de sodio — {percent}% de tu límite diario de {limit} mg",
    flagSaturatedFat: "{amount} g de grasa saturada — {percent}% de tu límite diario de {limit} g",
    flagAddedSugars: "{amount} g de azúcares añadidos — {percent}% de tu límite diario de {limit} g",
    flagPotassiumGood: "{amount} mg de potasio — bueno para la presión arterial",
    flagFiberGood: "{amount} g de fibra — bueno para tu corazón",
    flagPotassiumMed: "Alto en potasio — consulta primero con tu equipo de salud porque tomas {med}",
    flagSaltSubstituteMed: "Esto es un sustituto de sal — consulta primero con tu equipo de salud porque tomas {med}",
    flagBpTrend: "Tus lecturas recientes están subiendo — una razón más para cuidar la sal esta semana"
  }
};

export function t(language: Language, key: FoodLensStringKey, vars?: Record<string, string | number>): string {
  const template = foodLensStrings[language]?.[key] ?? foodLensStrings.en[key];
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
