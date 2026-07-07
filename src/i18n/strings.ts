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
  | "flagCarbs"
  | "flagPotassiumGood"
  | "flagFiberGood"
  | "flagPotassiumMed"
  | "flagSaltSubstituteMed"
  | "flagMetforminAlcohol"
  | "flagBpTrend"
  | "pantryButton"
  | "pantryScanning"
  | "pantryDetectedTitle"
  | "pantryRecipesTitle"
  | "pantryToBuyLabel"
  | "pantryShoppingTitle"
  | "pantryWatchLabel"
  | "pantryUnavailable"
  | "pantryNoFood"
  | "pantryLocked";

export const foodLensStrings: Record<Language, Record<FoodLensStringKey, string>> = {
  en: {
    pageTitle: "Food Lens",
    navLabel: "Food",
    viewfinderHint: "Point at a food and just ask.",
    scanHint: "Point at any food and ask about it.",
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
    fallbackNotice: "Type your question about what's in the camera and I'll answer.",
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
    flagCarbs: "{amount} g carbs — {percent}% of your {limit} g daily reference",
    flagPotassiumGood: "{amount} mg potassium — good for blood pressure",
    flagFiberGood: "{amount} g fiber — good for your heart",
    flagPotassiumMed: "High in potassium — check with your care team first because you take {med}",
    flagSaltSubstituteMed: "This is a salt substitute — check with your care team first because you take {med}",
    flagMetforminAlcohol: "Alcohol with {med} can upset your stomach and affect your blood sugar — go easy and ask your care team",
    flagBpTrend: "Your recent readings are trending up — extra reason to go easy on salt this week",
    pantryButton: "Find recipes in my pantry",
    pantryScanning: "Reading your pantry…",
    pantryDetectedTitle: "In your pantry",
    pantryRecipesTitle: "Recipe ideas",
    pantryToBuyLabel: "To pick up",
    pantryShoppingTitle: "Shopping list",
    pantryWatchLabel: "Heads up",
    pantryUnavailable: "I need the live camera model to read your pantry. Once it's set up, point the camera at your open pantry or fridge and tap Find recipes.",
    pantryNoFood: "I couldn't spot foods to build a recipe from. Try pointing the camera at your open pantry or fridge so I can see the items.",
    pantryLocked: "This demo needs its access code before it can read your pantry."
  },
  es: {
    pageTitle: "Lente de Comida",
    navLabel: "Comida",
    viewfinderHint: "Apunta a una comida y pregunta.",
    scanHint: "Apunta a cualquier comida y pregunta.",
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
    fallbackNotice: "Escribe tu pregunta sobre lo que ves en la cámara y te respondo.",
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
    flagCarbs: "{amount} g de carbohidratos — {percent}% de tu referencia diaria de {limit} g",
    flagPotassiumGood: "{amount} mg de potasio — bueno para la presión arterial",
    flagFiberGood: "{amount} g de fibra — bueno para tu corazón",
    flagPotassiumMed: "Alto en potasio — consulta primero con tu equipo de salud porque tomas {med}",
    flagSaltSubstituteMed: "Esto es un sustituto de sal — consulta primero con tu equipo de salud porque tomas {med}",
    flagMetforminAlcohol: "El alcohol con {med} puede molestar tu estómago y afectar tu azúcar — ve con calma y consulta a tu equipo de salud",
    flagBpTrend: "Tus lecturas recientes están subiendo — una razón más para cuidar la sal esta semana",
    pantryButton: "Buscar recetas en mi despensa",
    pantryScanning: "Leyendo tu despensa…",
    pantryDetectedTitle: "En tu despensa",
    pantryRecipesTitle: "Ideas de recetas",
    pantryToBuyLabel: "Para comprar",
    pantryShoppingTitle: "Lista de compras",
    pantryWatchLabel: "Ojo",
    pantryUnavailable: "Necesito el modelo de cámara en vivo para leer tu despensa. Cuando esté configurado, apunta la cámara a tu despensa o refrigerador abierto y toca Buscar recetas.",
    pantryNoFood: "No pude ver alimentos para armar una receta. Intenta apuntar la cámara a tu despensa o refrigerador abierto para que vea los productos.",
    pantryLocked: "Esta demostración necesita su código de acceso antes de leer tu despensa."
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

export type SafetyStringKey =
  | "crisisResponse"
  | "crisisCall988"
  | "crisisText988"
  | "callEmergency"
  | "safetyPlanLabel"
  | "safetyPlanBody"
  | "crisisAcknowledge"
  | "emergencyResponseSuffix"
  | "groundingFallback"
  | "groundingFallbackBanner"
  | "voiceInterceptNotice"
  | "socialEmergencyResponse"
  | "urgentHelpSummary";

export const safetyStrings: Record<Language, Record<SafetyStringKey, string>> = {
  en: {
    crisisResponse:
      "It sounds like you may be going through something very painful right now, and you deserve real support from a person. This is more than I can help with safely on my own. Please reach out right now: call or text 988 to reach the Suicide & Crisis Lifeline — it is free, confidential, and open every hour of every day. If you are in immediate danger, call 911. You are not alone, and help is available.",
    crisisCall988: "Call 988 — Crisis Lifeline",
    crisisText988: "Text 988",
    callEmergency: "Call 911",
    safetyPlanLabel: "A few steps that can help right now",
    safetyPlanBody:
      "You do not have to face this by yourself. If you can, tell someone you trust what is happening. Move to a safer space and put anything you could use to hurt yourself out of reach. Stay on the line with 988 — they will stay with you. If things feel unsafe, call 911.",
    crisisAcknowledge: "I've seen this — continue",
    emergencyResponseSuffix:
      "If this may be a medical emergency, call 911 now. I can help you share what is happening with your care team.",
    groundingFallback:
      "I could not confirm that answer against your own records, so I do not want to guess. Please contact your care team and they can help with this directly.",
    groundingFallbackBanner: "This answer was replaced because it was not backed by your records.",
    voiceInterceptNotice: "I paused here for your safety.",
    socialEmergencyResponse:
      "It sounds like you may be without something you need today, like food or medicine. If this is an emergency, call 911. You can also dial 211 any time to reach someone who can help connect you with food, housing, or utility support right now.",
    urgentHelpSummary: "Feeling unsafe right now? Get help"
  },
  es: {
    crisisResponse:
      "Parece que estás pasando por algo muy doloroso ahora mismo, y mereces apoyo real de una persona. Esto es más de lo que puedo ayudar de forma segura por mi cuenta. Por favor, busca ayuda ahora mismo: llama o envía un mensaje de texto al 988 para comunicarte con la Línea de Crisis y Suicidio — es gratis, confidencial y está disponible a toda hora, todos los días. Si estás en peligro inmediato, llama al 911. No estás solo, y hay ayuda disponible.",
    crisisCall988: "Llama al 988 — Línea de Crisis",
    crisisText988: "Envía un texto al 988",
    callEmergency: "Llama al 911",
    safetyPlanLabel: "Unos pasos que pueden ayudar ahora mismo",
    safetyPlanBody:
      "No tienes que enfrentar esto solo. Si puedes, dile a alguien de confianza lo que está pasando. Ve a un lugar más seguro y aleja cualquier cosa que podrías usar para lastimarte. Quédate en la línea con el 988 — se quedarán contigo. Si algo se siente inseguro, llama al 911.",
    crisisAcknowledge: "Ya lo vi — continuar",
    emergencyResponseSuffix:
      "Si esto puede ser una emergencia médica, llama al 911 ahora. Puedo ayudarte a compartir lo que está pasando con tu equipo de salud.",
    groundingFallback:
      "No pude confirmar esa respuesta con tus propios registros, así que no quiero adivinar. Por favor, comunícate con tu equipo de salud y ellos pueden ayudarte con esto directamente.",
    groundingFallbackBanner: "Esta respuesta fue reemplazada porque no estaba respaldada por tus registros.",
    voiceInterceptNotice: "Hice una pausa aquí por tu seguridad.",
    socialEmergencyResponse:
      "Parece que hoy podrías estar sin algo que necesitas, como comida o medicina. Si esto es una emergencia, llama al 911. También puedes llamar al 211 en cualquier momento para comunicarte con alguien que pueda ayudarte a conectar con apoyo de comida, vivienda o servicios ahora mismo.",
    urgentHelpSummary: "¿Te sientes inseguro ahora? Busca ayuda"
  }
};

export function tSafety(language: Language, key: SafetyStringKey, vars?: Record<string, string | number>): string {
  const template = safetyStrings[language]?.[key] ?? safetyStrings.en[key];
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

// Diabetic-retinopathy screening pathway copy. The five grade strings are the
// LOCKED plain-language table from docs/plans/09 — grounding-safe ("Your report
// says…", never "You have…"), calm at every urgency level, equal urgency in es.
export type ScreeningStringKey =
  | "pageTitle"
  | "gradeNoDr"
  | "gradeMild"
  | "gradeModerateSevere"
  | "gradeDmePdr"
  | "gradeUngradable";

export const screeningStrings: Record<Language, Record<ScreeningStringKey, string>> = {
  en: {
    pageTitle: "Eye Check",
    gradeNoDr: "Your report says no signs of diabetic eye disease were found.",
    gradeMild:
      "Your report shows mild early changes. No specialist visit is needed now — a repeat photo in 12 months keeps watch.",
    gradeModerateSevere:
      "Your report shows changes that need a closer look by an eye doctor. This is common and treatable when caught early.",
    gradeDmePdr:
      "Your report shows changes that need care soon. Getting seen quickly protects your vision. Your referral has already been sent.",
    gradeUngradable:
      "The image could not be read clearly, which happens sometimes. A quick repeat screening is all that is needed."
  },
  es: {
    pageTitle: "Chequeo de Ojos",
    gradeNoDr: "Tu reporte dice que no se encontraron señales de enfermedad diabética del ojo.",
    gradeMild:
      "Tu reporte muestra cambios leves y tempranos. No se necesita una visita al especialista ahora — una nueva foto en 12 meses mantiene la vigilancia.",
    gradeModerateSevere:
      "Tu reporte muestra cambios que necesitan una revisión más de cerca por un doctor de los ojos. Esto es común y tratable cuando se detecta a tiempo.",
    gradeDmePdr:
      "Tu reporte muestra cambios que necesitan atención pronto. Que te atiendan rápido protege tu visión. Tu referido ya fue enviado.",
    gradeUngradable:
      "La imagen no se pudo leer con claridad, lo cual pasa a veces. Solo se necesita repetir el examen rápidamente."
  }
};

export function tScreening(language: Language, key: ScreeningStringKey, vars?: Record<string, string | number>): string {
  const template = screeningStrings[language]?.[key] ?? screeningStrings.en[key];
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
