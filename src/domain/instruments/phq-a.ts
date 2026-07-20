// TRANSCRIPTION REQUIRED: verify items verbatim against the official PDF before demo
import type { ScreeningInstrument } from "./types";

const CORE_OPTIONS = [
  { value: 0, en: "Not At All", es: "Para nada" },
  { value: 1, en: "Several Days", es: "Varios días" },
  { value: 2, en: "More Than Half the Days", es: "Más de la mitad de los días" },
  { value: 3, en: "Nearly Every Day", es: "Casi todos los días" }
];

const YES_NO = [
  { value: 1, en: "Yes", es: "Sí" },
  { value: 0, en: "No", es: "No" }
];

export const PHQ_A_INSTRUMENT: ScreeningInstrument = {
  id: "phq_a",
  title: { en: "PHQ-9 Modified for Teens", es: "PHQ-9 modificado para adolescentes" },
  instructions: {
    en: "How often have you been bothered by each of the following symptoms during the past two weeks? For each symptom choose the answer that best describes how you have been feeling.",
    es: "¿Con qué frecuencia te ha molestado cada uno de los siguientes síntomas durante las últimas dos semanas? Elige la respuesta que mejor describa cómo te has sentido."
  },
  audience: "teen",
  tier: 3,
  items: [
    { id: "little_interest", kind: "choice", en: "Little interest or pleasure in doing things?", es: "¿Poco interés en o placer al hacer las cosas?", options: CORE_OPTIONS },
    { id: "down_irritable_hopeless", kind: "choice", en: "Feeling down, depressed, irritable, or hopeless?", es: "¿Se siente triste, deprimido, irritable o desesperanzado?", options: CORE_OPTIONS },
    { id: "sleep", kind: "choice", en: "Trouble falling asleep, staying asleep, or sleeping too much?", es: "¿Le cuesta trabajo quedarse dormido, permanecer dormido, o duerme demasiado?", options: CORE_OPTIONS },
    { id: "tired_energy", kind: "choice", en: "Feeling tired, or having little energy?", es: "¿Se siente cansado o tiene poca energía?", options: CORE_OPTIONS },
    { id: "appetite_weight", kind: "choice", en: "Poor appetite, weight loss, or overeating?", es: "¿Poco apetito, pérdida de peso o come demasiado?", options: CORE_OPTIONS },
    { id: "feels_bad_failure", kind: "choice", en: "Feeling bad about yourself – or feeling that you are a failure, or that you have let yourself or your family down?", es: "¿Se siente mal consigo mismo, o siente que es un fracaso, o que se ha fallado a sí mismo o a su familia?", options: CORE_OPTIONS },
    { id: "concentration", kind: "choice", en: "Trouble concentrating on things like school work, reading, or watching TV?", es: "¿Le cuesta trabajo concentrarse en cosas como tareas escolares, leer o ver la televisión?", options: CORE_OPTIONS },
    { id: "movement_speech", kind: "choice", en: "Moving or speaking so slowly that other people could have noticed? Or the opposite – being so fidgety or restless that you were moving around a lot more than usual?", es: "¿Se mueve o habla tan lentamente que otras personas pueden haberlo notarlo? O, por el contrario, ¿está tan inquieto que se mueve mucho más de lo usual?", options: CORE_OPTIONS },
    { id: "self_harm", kind: "choice", en: "Thoughts that you would be better off dead, or of hurting yourself in some way?", es: "¿Ha pensado que sería mejor estar muerto, o considerado hacerse daño de alguna forma?", options: CORE_OPTIONS, crisisOnPositive: true },
    {
      id: "functional_impairment",
      kind: "choice",
      en: "If you are experiencing any of the problems on this form, how difficult have these problems made it for you to do your work, take care of things at home or get along with other people?",
      es: "Si usted está pasando por cualquiera de los problemas mencionados en este formulario, ¿qué tan difícil le han hecho estos realizar su trabajo, hacer las cosas de la casa o relacionarse con los demás?",
      options: [
        { value: 0, en: "Not difficult at all", es: "Nada difícil" },
        { value: 1, en: "Somewhat difficult", es: "Un poco difícil" },
        { value: 2, en: "Very difficult", es: "Muy difícil" },
        { value: 3, en: "Extremely difficult", es: "Sumamente difícil" }
      ]
    },
    { id: "past_year_depression", kind: "choice", en: "In the past year have you felt depressed or sad most days, even if you felt okay sometimes?", es: "¿Se ha sentido deprimido o triste la mayoría de los días durante el año pasado, aun cuando se haya sentido bien algunas veces?", options: YES_NO },
    { id: "past_month_serious_ideation", kind: "choice", en: "Has there been a time in the past month when you have had serious thoughts about ending your life?", es: "¿Ha habido algún momento durante el mes pasado cuando haya pensado seriamente en suicidarse?", options: YES_NO, crisisOnPositive: true },
    { id: "lifetime_attempt", kind: "choice", en: "Have you EVER, in your WHOLE LIFE, tried to kill yourself or made a suicide attempt?", es: "¿ALGUNA VEZ, durante su VIDA ENTERA, ha tratado de quitarse la vida o intentado suicidarse?", options: YES_NO, crisisOnPositive: true }
  ],
  score: (responses) => {
    const totalScore = responses.slice(0, 9).reduce((sum, value) => sum + value, 0);
    const band = totalScore >= 20
      ? "severe"
      : totalScore >= 15
        ? "moderately_severe"
        : totalScore >= 10
          ? "moderate"
          : totalScore >= 5
            ? "mild"
            : "minimal";
    return { totalScore, band };
  },
  bands: ["minimal", "mild", "moderate", "moderately_severe", "severe"],
  bandSummaries: {
    minimal: { en: "Your core answers suggest few or no signs. This check-in is not a diagnosis.", es: "Tus respuestas principales sugieren pocas o ninguna señal. Este chequeo no es un diagnóstico." },
    mild: { en: "Your core answers suggest some mild signs. This check-in is not a diagnosis.", es: "Tus respuestas principales sugieren algunas señales leves. Este chequeo no es un diagnóstico." },
    moderate: { en: "Your core answers suggest a moderate level of signs. Share these results with a clinician. This check-in is not a diagnosis.", es: "Tus respuestas principales sugieren un nivel moderado de señales. Comparte estos resultados con un profesional clínico. Este chequeo no es un diagnóstico." },
    moderately_severe: { en: "Your core answers suggest a fairly high level of signs. Share these results with a clinician. This check-in is not a diagnosis.", es: "Tus respuestas principales sugieren un nivel bastante alto de señales. Comparte estos resultados con un profesional clínico. Este chequeo no es un diagnóstico." },
    severe: { en: "Your core answers suggest a high level of signs. Share these results with a clinician. This check-in is not a diagnosis.", es: "Tus respuestas principales sugieren un nivel alto de señales. Comparte estos resultados con un profesional clínico. Este chequeo no es un diagnóstico." }
  },
  consent: {
    en: {
      title: "Before the teen starts",
      points: [
        "These questions are for the teen to answer about the past two weeks.",
        "This depression check is not a diagnosis and is not a validated suicide-risk screen.",
        "Any answer about self-harm, serious suicidal thoughts, or a past suicide attempt opens the app's immediate safety support."
      ],
      acknowledge: "I understand — start"
    },
    es: {
      title: "Antes de que comience el adolescente",
      points: [
        "Estas preguntas son para que el adolescente responda sobre las últimas dos semanas.",
        "Este chequeo de depresión no es un diagnóstico ni una prueba validada de riesgo de suicidio.",
        "Cualquier respuesta sobre hacerse daño, pensamientos serios de suicidio o un intento previo abre el apoyo inmediato de seguridad de la aplicación."
      ],
      acknowledge: "Entiendo — comenzar"
    }
  },
  wordingVerified: false,
  licenseStatus: "clear",
  attribution: {
    en: "Modified with permission by the GLAD-PC team from the PHQ-9 (Spitzer, Williams, & Kroenke, 1999), Revised PHQ-A (Johnson, 2002), and the CDS (DISC Development Group, 2000). © 2018 The REACH Institute. GLAD-PC Version 3.",
    es: "Modificado con permiso por el equipo GLAD-PC a partir de PHQ-9 (Spitzer, Williams y Kroenke, 1999), Revised PHQ-A (Johnson, 2002) y CDS (DISC Development Group, 2000). © 2018 The REACH Institute. GLAD-PC Versión 3."
  }
};
