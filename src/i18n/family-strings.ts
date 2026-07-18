import type { Language } from "./strings";

export type FamilyStringKey =
  | "pageTitle"
  | "demoBadge"
  | "intro"
  | "spanishReviewNotice"
  | "setupTitle"
  | "setupIntro"
  | "profileCountyLabel"
  | "profileCountyPlaceholder"
  | "profileChildNameLabel"
  | "profileChildNamePlaceholder"
  | "profileBirthYearLabel"
  | "profileBirthYearPlaceholder"
  | "profileBirthMonthLabel"
  | "profileBirthMonthOptional"
  | "profileSchoolStageLabel"
  | "profileDiagnosesLabel"
  | "profileDiagnosisDateLabel"
  | "profileOtherDiagnosisLabel"
  | "profileOtherDiagnosisPlaceholder"
  | "profileSave"
  | "profileSaved"
  | "profileEdit"
  | "profileBirthYearError"
  | "profileBirthMonthError"
  | "profileOtherDiagnosisError"
  | "diagnosisAutism"
  | "diagnosisAdhd"
  | "diagnosisDyslexia"
  | "diagnosisSpeechLanguage"
  | "diagnosisDevelopmentalDelay"
  | "diagnosisIntellectualDisability"
  | "diagnosisDownSyndrome"
  | "diagnosisOther"
  | "diagnosisAdd"
  | "diagnosisRemove"
  | "schoolNotSchoolAge"
  | "schoolPreschool"
  | "schoolElementary"
  | "schoolMiddle"
  | "schoolHigh"
  | "schoolPostHigh"
  | "examplesTitle"
  | "exampleMorgan"
  | "exampleCasey"
  | "entryQuestionsTitle"
  | "entryQuestionsBody"
  | "entryInterviewTitle"
  | "entryInterviewBody"
  | "screenTitle"
  | "screenIntro"
  | "screenEarlyIntervention"
  | "screenTherapies"
  | "screenSchoolIep"
  | "screenWaiversFinancial"
  | "screenRespite"
  | "screenParentSupport"
  | "screenSiblingSupport"
  | "screenTransportation"
  | "answerYes"
  | "answerNo"
  | "answerDeclined"
  | "screenSubmit"
  | "screenSaved"
  | "domainEarlyIntervention"
  | "domainTherapies"
  | "domainSchoolIep"
  | "domainWaiversFinancial"
  | "domainRespite"
  | "domainParentSupport"
  | "domainSiblingSupport"
  | "domainTransportation"
  | "domainFuturePlanning"
  | "domainDiagnosisEducation"
  | "domainRecreation"
  | "interviewTitle"
  | "interviewIntro"
  | "interviewLabel"
  | "interviewPlaceholder"
  | "interviewMicStart"
  | "interviewMicStop"
  | "interviewSubmit"
  | "interviewWorking"
  | "interviewErrorTooShort"
  | "interviewErrorTooLong"
  | "interviewErrorUnavailable"
  | "interviewErrorFallback"
  | "interviewCount"
  | "interviewSafetyRedirect"
  | "interviewSafetyRedirectTitle"
  | "interviewSafetyRedirectBody"
  | "factsTitle"
  | "factsIntro"
  | "evidencePatientReported"
  | "evidenceInferred"
  | "evidenceConfirmed"
  | "factSource"
  | "factConfirm"
  | "factConfirmed"
  | "followUpsTitle"
  | "domainRationaleTitle"
  | "factGradeLabel"
  | "factReportedDiagnosisLabel"
  | "factSchoolConcernLabel"
  | "factSchoolConcernValue"
  | "rationaleEarlyIntervention"
  | "rationaleTherapies"
  | "rationaleSchoolIep"
  | "rationaleWaiversFinancial"
  | "rationaleRespite"
  | "rationaleParentSupport"
  | "rationaleSiblingSupport"
  | "rationaleTransportation"
  | "rationaleFuturePlanning"
  | "rationaleDiagnosisEducation"
  | "rationaleRecreation"
  | "resourcesTitle"
  | "resourcesIntro"
  | "resourceSourceLanguageNotice"
  | "nearbyTherapeuticRecreationTitle"
  | "nearbyTherapeuticRecreationIntro"
  | "resourceSource"
  | "resourceVerified"
  | "resourceAgeBand"
  | "resourceContact"
  | "resourceReferralMode"
  | "resourceHumanVerify"
  | "resourceActNow"
  | "resourceAllAges"
  | "resourceAgeFrom"
  | "resourceAgeThrough"
  | "resourceAgeBetween"
  | "referralSelfServe"
  | "referralCall"
  | "referralProvider"
  | "referralSchool"
  | "referralNavigator"
  | "resourceSave"
  | "resourceSaved"
  | "resourceShare"
  | "resourceShareConsent"
  | "resourceShareConsentRequired"
  | "resourceShareComplete"
  | "resourceOpenSource"
  | "resourceAlreadyEnrolled"
  | "resourceMarkEnrolled"
  | "resourceUnmarkEnrolled"
  | "savedResourcesTitle"
  | "savedResourcesEmpty"
  | "emptyFallbackTitle"
  | "emptyFallbackBody"
  | "emptyNavigatorHonesty"
  | "timelineTitle"
  | "timelineIntro"
  | "timelineNow"
  | "timelineNext"
  | "timelineLater"
  | "timelineNoProfile"
  | "timelineEmpty"
  | "timelineYearOnlyNotice"
  | "timelineFirstStepsTitle"
  | "timelineFirstStepsBody"
  | "timelineAgeThreeTransitionTitle"
  | "timelineAgeThreeTransitionBody"
  | "timelineSchoolEnrollmentTitle"
  | "timelineSchoolEnrollmentBody"
  | "timelineWaiverApplyTitle"
  | "timelineWaiverApplyBody"
  | "timelineSchoolArcTitle"
  | "timelineSchoolArcBody"
  | "timelineParentConnectionTitle"
  | "timelineParentConnectionBody"
  | "timelineSiblingRespiteTitle"
  | "timelineSiblingRespiteBody"
  | "timelineMissionTransitionTitle"
  | "timelineMissionTransitionBody"
  | "timelineBeforeEighteenTitle"
  | "timelineBeforeEighteenBody";

export const familyStrings: Record<Language, Record<FamilyStringKey, string>> = {
  en: {
    pageTitle: "Family navigator",
    demoBadge: "Demo — fictional data",
    intro: "Explore developmental supports based on what you choose to share. This navigator does not diagnose your child or decide program eligibility.",
    spanishReviewNotice: "Spanish is demo-grade and pending review by a native speaker.",
    setupTitle: "Tell us the basics",
    setupIntro: "A few details help match options by county, age, and school stage. Do not enter a last name, full birth date, address, or income.",
    profileCountyLabel: "Kentucky county",
    profileCountyPlaceholder: "Choose a county",
    profileChildNameLabel: "Child's first name (optional)",
    profileChildNamePlaceholder: "First name only",
    profileBirthYearLabel: "Birth year",
    profileBirthYearPlaceholder: "YYYY",
    profileBirthMonthLabel: "Birth month",
    profileBirthMonthOptional: "Optional — month only, not a full birth date",
    profileSchoolStageLabel: "School stage",
    profileDiagnosesLabel: "Diagnoses already given by a qualified professional (optional)",
    profileDiagnosisDateLabel: "Diagnosis month (optional)",
    profileOtherDiagnosisLabel: "Other diagnosis label",
    profileOtherDiagnosisPlaceholder: "Use the wording your family was given",
    profileSave: "Save family profile",
    profileSaved: "Family profile saved",
    profileEdit: "Edit family profile",
    profileBirthYearError: "Enter a valid four-digit birth year.",
    profileBirthMonthError: "Choose a birth month from 1 through 12.",
    profileOtherDiagnosisError: "Enter the other diagnosis wording your family was given.",
    diagnosisAutism: "Autism",
    diagnosisAdhd: "ADHD",
    diagnosisDyslexia: "Dyslexia",
    diagnosisSpeechLanguage: "Speech or language disorder",
    diagnosisDevelopmentalDelay: "Developmental delay",
    diagnosisIntellectualDisability: "Intellectual disability",
    diagnosisDownSyndrome: "Down syndrome",
    diagnosisOther: "Other",
    diagnosisAdd: "Add diagnosis",
    diagnosisRemove: "Remove diagnosis",
    schoolNotSchoolAge: "Not school age",
    schoolPreschool: "Preschool",
    schoolElementary: "Elementary school",
    schoolMiddle: "Middle school",
    schoolHigh: "High school",
    schoolPostHigh: "After high school",
    examplesTitle: "Try a fictional example",
    exampleMorgan: "Morgan and Riley — Scott County",
    exampleCasey: "Casey — Perry County",
    entryQuestionsTitle: "Answer a few questions",
    entryQuestionsBody: "Choose yes, no, or prefer not to answer for eight support areas.",
    entryInterviewTitle: "Tell us about your child",
    entryInterviewBody: "Type or speak what is going on. Review the words before you submit them.",
    screenTitle: "What support would help?",
    screenIntro: "These questions are optional. A yes helps organize resources; it is not a diagnosis or eligibility decision.",
    screenEarlyIntervention: "Would help before age three, such as First Steps, be useful?",
    screenTherapies: "Are you looking for speech, occupational, physical, or other therapies?",
    screenSchoolIep: "Would help with school, an ARC meeting, an IEP, or a 504 plan be useful?",
    screenWaiversFinancial: "Would you like information about waivers, benefits, or financial supports?",
    screenRespite: "Would a planned break from caregiving be helpful?",
    screenParentSupport: "Would you like to meet another parent or a family support group?",
    screenSiblingSupport: "Would support for brothers or sisters be helpful?",
    screenTransportation: "Would help getting to services or activities be useful?",
    answerYes: "Yes",
    answerNo: "No",
    answerDeclined: "Prefer not to answer",
    screenSubmit: "See support areas",
    screenSaved: "Your answers were saved on this device.",
    domainEarlyIntervention: "Early intervention",
    domainTherapies: "Therapies",
    domainSchoolIep: "School and IEP",
    domainWaiversFinancial: "Waivers and financial support",
    domainRespite: "Respite",
    domainParentSupport: "Parent support",
    domainSiblingSupport: "Sibling support",
    domainTransportation: "Transportation",
    domainFuturePlanning: "Future planning",
    domainDiagnosisEducation: "Diagnosis education",
    domainRecreation: "Inclusive recreation",
    interviewTitle: "Tell us what is happening",
    interviewIntro: "Share concerns, goals, and what you have already tried. The navigator uses your words to organize support areas, not to diagnose.",
    interviewLabel: "What would you like help with?",
    interviewPlaceholder: "For example: My child is having a hard time with reading, and I do not know what to ask the school for.",
    interviewMicStart: "Start speaking",
    interviewMicStop: "Stop listening",
    interviewSubmit: "Find support areas",
    interviewWorking: "Organizing what you shared…",
    interviewErrorTooShort: "Please enter at least 10 characters.",
    interviewErrorTooLong: "Keep this to 5000 characters or fewer. Your words were not cut off.",
    interviewErrorUnavailable: "Voice input is not available in this browser. You can still type.",
    interviewErrorFallback: "The live helper was unavailable, so this demo used the on-device organizer instead.",
    interviewCount: "{count} of {max} characters",
    interviewSafetyRedirect: "Safety comes first. We are opening immediate support instead of analyzing or showing family resources.",
    interviewSafetyRedirectTitle: "Immediate support",
    interviewSafetyRedirectBody: "We are opening immediate support now. The interview will not be analyzed and family resources will not be shown for this submission.",
    factsTitle: "Review what we heard",
    factsIntro: "Confirm only details that are accurate. Suggested details do not change your profile until you confirm them.",
    evidencePatientReported: "From your words",
    evidenceInferred: "Suggested — please review",
    evidenceConfirmed: "Confirmed by you",
    factSource: "Source words",
    factConfirm: "Confirm this detail",
    factConfirmed: "Detail confirmed",
    followUpsTitle: "Questions to consider",
    domainRationaleTitle: "Why this support area appeared",
    factGradeLabel: "Grade",
    factReportedDiagnosisLabel: "Reported diagnosis",
    factSchoolConcernLabel: "School concern",
    factSchoolConcernValue: "Reading and homework may need support",
    rationaleEarlyIntervention: "The caregiver described speech or talking concerns for a child under age three.",
    rationaleTherapies: "The caregiver described speech, talking, or therapy needs.",
    rationaleSchoolIep: "The caregiver described school, IEP, or reading support needs.",
    rationaleWaiversFinancial: "The caregiver asked about waivers or financial support.",
    rationaleRespite: "The caregiver described needing a break from caregiving.",
    rationaleParentSupport: "The caregiver described feeling overwhelmed or unsure where to start.",
    rationaleSiblingSupport: "The caregiver asked about support for a sibling.",
    rationaleTransportation: "The caregiver described a ride or transportation need.",
    rationaleFuturePlanning: "The caregiver asked about transition to adulthood or future planning.",
    rationaleDiagnosisEducation: "The caregiver asked for general information about a reported diagnosis.",
    rationaleRecreation: "The caregiver asked about clubs, sports, horses, or recreation.",
    resourcesTitle: "Matched resources",
    resourcesIntro: "These options are matched by county, age, and the support areas you selected. The source link is the authority for current rules.",
    resourceSourceLanguageNotice: "Details supplied by resource organizations may remain in their original language while a reviewed translation is pending.",
    nearbyTherapeuticRecreationTitle: "Nearby therapeutic recreation",
    nearbyTherapeuticRecreationIntro: "This separate local option matches the child's county and age and offers both recreation and therapeutic support. It did not create a new support-area inference.",
    resourceSource: "Source",
    resourceVerified: "Checked on {date}",
    resourceAgeBand: "Age range",
    resourceContact: "How to start",
    resourceReferralMode: "Referral path",
    resourceHumanVerify: "Please confirm current details with a person before acting.",
    resourceActNow: "Why to act now",
    resourceAllAges: "All ages",
    resourceAgeFrom: "Age {min} and older",
    resourceAgeThrough: "Birth through age {max}",
    resourceAgeBetween: "Ages {min}–{max}",
    referralSelfServe: "Start online",
    referralCall: "Call directly",
    referralProvider: "Ask a provider for a referral",
    referralSchool: "Contact the school",
    referralNavigator: "Ask a navigator to help",
    resourceSave: "Save",
    resourceSaved: "Saved",
    resourceShare: "Share",
    resourceShareConsent: "I agree to share this resource now.",
    resourceShareConsentRequired: "Check the consent box before sharing.",
    resourceShareComplete: "Share recorded with your consent.",
    resourceOpenSource: "Open source link",
    resourceAlreadyEnrolled: "Already receiving this",
    resourceMarkEnrolled: "Mark as already receiving",
    resourceUnmarkEnrolled: "Remove already-receiving mark",
    savedResourcesTitle: "Saved resources",
    savedResourcesEmpty: "Resources you save will appear here for your next visit.",
    emptyFallbackTitle: "No exact local match yet",
    emptyFallbackBody: "Start with statewide family supports, the HDI directory, kynect resources, or 211 while you keep looking locally.",
    emptyNavigatorHonesty: "A family navigator can help look for local options. This demo cannot promise that a service, opening, or benefit is available.",
    timelineTitle: "Right thing at the right time",
    timelineIntro: "This read-only timeline uses the age and dates you entered. It is a planning aid, not a reminder service or eligibility decision.",
    timelineNow: "Now",
    timelineNext: "Next",
    timelineLater: "Later",
    timelineNoProfile: "Add a family profile to see planning moments.",
    timelineEmpty: "No planning moments match the current profile yet.",
    timelineYearOnlyNotice: "Timing is shown early because only the birth year is known.",
    timelineFirstStepsTitle: "Contact First Steps now",
    timelineFirstStepsBody: "First Steps does not accept new referrals in the final 45 days before age three. Contact the local point of entry to confirm whether the referral window remains open and ask about transition options if it does not.",
    timelineAgeThreeTransitionTitle: "Plan the transition before age three",
    timelineAgeThreeTransitionBody: "Ask for the transition conference and stay enrolled in First Steps so an eligible child can have an IEP in place by the third birthday.",
    timelineSchoolEnrollmentTitle: "Prepare for school enrollment",
    timelineSchoolEnrollmentBody: "Learn Kentucky's ARC and IEP process before preschool or kindergarten enrollment.",
    timelineWaiverApplyTitle: "Ask about the Michelle P. Waiver application",
    timelineWaiverApplyBody: "The Michelle P. waiting list is date ordered, so ask Kentucky how to apply now. Kentucky determines eligibility and waitlist placement.",
    timelineSchoolArcTitle: "Prepare for the school ARC meeting",
    timelineSchoolArcBody: "Gather the family's concerns and ask the school how to request an ARC meeting or IEP evaluation.",
    timelineParentConnectionTitle: "Connect with another parent",
    timelineParentConnectionBody: "A parent group or peer mentor can help the family learn next steps without navigating alone.",
    timelineSiblingRespiteTitle: "Explore sibling support and respite",
    timelineSiblingRespiteBody: "Look for honest local options for siblings and planned caregiving breaks.",
    timelineMissionTransitionTitle: "Start transition planning",
    timelineMissionTransitionBody: "Use the school ARC process and Kentucky transition resources to begin planning for adult life.",
    timelineBeforeEighteenTitle: "Prepare for age eighteen",
    timelineBeforeEighteenBody: "Review SSI re-application, supported decision-making versus guardianship, and STABLE account options before age eighteen."
  },
  es: {
    pageTitle: "Navegador para familias",
    demoBadge: "Demo — datos ficticios",
    intro: "Explora apoyos para el desarrollo según lo que decidas compartir. Este navegador no diagnostica a tu hijo o hija ni decide la elegibilidad para programas.",
    spanishReviewNotice: "Traducción de demostración — pendiente de revisión por una persona hablante nativa.",
    setupTitle: "Cuéntanos lo básico",
    setupIntro: "Unos pocos datos ayudan a buscar opciones por condado, edad y etapa escolar. No ingreses apellido, fecha de nacimiento completa, dirección ni ingresos.",
    profileCountyLabel: "Condado de Kentucky",
    profileCountyPlaceholder: "Elige un condado",
    profileChildNameLabel: "Primer nombre del niño o niña (opcional)",
    profileChildNamePlaceholder: "Solo el primer nombre",
    profileBirthYearLabel: "Año de nacimiento",
    profileBirthYearPlaceholder: "AAAA",
    profileBirthMonthLabel: "Mes de nacimiento",
    profileBirthMonthOptional: "Opcional — solo el mes, no la fecha completa",
    profileSchoolStageLabel: "Etapa escolar",
    profileDiagnosesLabel: "Diagnósticos ya dados por un profesional calificado (opcional)",
    profileDiagnosisDateLabel: "Mes del diagnóstico (opcional)",
    profileOtherDiagnosisLabel: "Otro diagnóstico",
    profileOtherDiagnosisPlaceholder: "Usa las palabras que recibió tu familia",
    profileSave: "Guardar perfil familiar",
    profileSaved: "Perfil familiar guardado",
    profileEdit: "Editar perfil familiar",
    profileBirthYearError: "Ingresa un año de nacimiento válido de cuatro dígitos.",
    profileBirthMonthError: "Elige un mes de nacimiento del 1 al 12.",
    profileOtherDiagnosisError: "Ingresa las palabras del otro diagnóstico que recibió tu familia.",
    diagnosisAutism: "Autismo",
    diagnosisAdhd: "TDAH",
    diagnosisDyslexia: "Dislexia",
    diagnosisSpeechLanguage: "Trastorno del habla o del lenguaje",
    diagnosisDevelopmentalDelay: "Retraso del desarrollo",
    diagnosisIntellectualDisability: "Discapacidad intelectual",
    diagnosisDownSyndrome: "Síndrome de Down",
    diagnosisOther: "Otro",
    diagnosisAdd: "Agregar diagnóstico",
    diagnosisRemove: "Quitar diagnóstico",
    schoolNotSchoolAge: "Aún no tiene edad escolar",
    schoolPreschool: "Preescolar",
    schoolElementary: "Escuela primaria",
    schoolMiddle: "Escuela intermedia",
    schoolHigh: "Escuela secundaria",
    schoolPostHigh: "Después de la secundaria",
    examplesTitle: "Prueba un ejemplo ficticio",
    exampleMorgan: "Morgan y Riley — condado de Scott",
    exampleCasey: "Casey — condado de Perry",
    entryQuestionsTitle: "Responde unas preguntas",
    entryQuestionsBody: "Elige sí, no o prefiero no responder en ocho áreas de apoyo.",
    entryInterviewTitle: "Cuéntanos sobre tu hijo o hija",
    entryInterviewBody: "Escribe o di lo que está pasando. Revisa las palabras antes de enviarlas.",
    screenTitle: "¿Qué apoyo sería útil?",
    screenIntro: "Estas preguntas son opcionales. Un sí ayuda a organizar recursos; no es un diagnóstico ni una decisión de elegibilidad.",
    screenEarlyIntervention: "¿Sería útil recibir ayuda antes de los tres años, como First Steps?",
    screenTherapies: "¿Buscas terapia del habla, ocupacional, física u otra terapia?",
    screenSchoolIep: "¿Sería útil recibir ayuda con la escuela, una reunión ARC, un IEP o un plan 504?",
    screenWaiversFinancial: "¿Quieres información sobre exenciones, beneficios o apoyos económicos?",
    screenRespite: "¿Sería útil un descanso planificado del cuidado?",
    screenParentSupport: "¿Te gustaría conocer a otro padre, madre o grupo de apoyo familiar?",
    screenSiblingSupport: "¿Sería útil recibir apoyo para hermanos o hermanas?",
    screenTransportation: "¿Sería útil recibir ayuda para llegar a servicios o actividades?",
    answerYes: "Sí",
    answerNo: "No",
    answerDeclined: "Prefiero no responder",
    screenSubmit: "Ver áreas de apoyo",
    screenSaved: "Tus respuestas se guardaron en este dispositivo.",
    domainEarlyIntervention: "Intervención temprana",
    domainTherapies: "Terapias",
    domainSchoolIep: "Escuela e IEP",
    domainWaiversFinancial: "Exenciones y apoyo económico",
    domainRespite: "Respiro para cuidadores",
    domainParentSupport: "Apoyo para padres y madres",
    domainSiblingSupport: "Apoyo para hermanos",
    domainTransportation: "Transporte",
    domainFuturePlanning: "Planificación para el futuro",
    domainDiagnosisEducation: "Educación sobre diagnósticos",
    domainRecreation: "Recreación inclusiva",
    interviewTitle: "Cuéntanos qué está pasando",
    interviewIntro: "Comparte preocupaciones, metas y lo que ya intentaste. El navegador usa tus palabras para organizar áreas de apoyo, no para diagnosticar.",
    interviewLabel: "¿Con qué te gustaría recibir ayuda?",
    interviewPlaceholder: "Por ejemplo: A mi hija le cuesta leer y no sé qué pedirle a la escuela.",
    interviewMicStart: "Empezar a hablar",
    interviewMicStop: "Dejar de escuchar",
    interviewSubmit: "Buscar áreas de apoyo",
    interviewWorking: "Organizando lo que compartiste…",
    interviewErrorTooShort: "Ingresa al menos 10 caracteres.",
    interviewErrorTooLong: "Usa 5000 caracteres o menos. Tus palabras no fueron recortadas.",
    interviewErrorUnavailable: "La entrada por voz no está disponible en este navegador. Aún puedes escribir.",
    interviewErrorFallback: "El asistente en vivo no estaba disponible, así que este demo usó el organizador del dispositivo.",
    interviewCount: "{count} de {max} caracteres",
    interviewSafetyRedirect: "La seguridad es lo primero. Abriremos apoyo inmediato en vez de analizar o mostrar recursos familiares.",
    interviewSafetyRedirectTitle: "Apoyo inmediato",
    interviewSafetyRedirectBody: "Abriremos apoyo inmediato ahora. La entrevista no se analizará y no se mostrarán recursos familiares para este envío.",
    factsTitle: "Revisa lo que entendimos",
    factsIntro: "Confirma solo los datos correctos. Las sugerencias no cambian tu perfil hasta que las confirmes.",
    evidencePatientReported: "De tus palabras",
    evidenceInferred: "Sugerido — revísalo",
    evidenceConfirmed: "Confirmado por ti",
    factSource: "Palabras de origen",
    factConfirm: "Confirmar este dato",
    factConfirmed: "Dato confirmado",
    followUpsTitle: "Preguntas para considerar",
    domainRationaleTitle: "Por qué apareció esta área de apoyo",
    factGradeLabel: "Grado",
    factReportedDiagnosisLabel: "Diagnóstico informado",
    factSchoolConcernLabel: "Preocupación escolar",
    factSchoolConcernValue: "La lectura y la tarea podrían necesitar apoyo",
    rationaleEarlyIntervention: "La persona cuidadora describió preocupaciones sobre el habla de un niño menor de tres años.",
    rationaleTherapies: "La persona cuidadora describió necesidades de habla, lenguaje o terapia.",
    rationaleSchoolIep: "La persona cuidadora describió necesidades de apoyo escolar, del IEP o de lectura.",
    rationaleWaiversFinancial: "La persona cuidadora preguntó por exenciones o apoyo económico.",
    rationaleRespite: "La persona cuidadora describió la necesidad de un descanso del cuidado.",
    rationaleParentSupport: "La persona cuidadora describió sentirse abrumada o no saber por dónde empezar.",
    rationaleSiblingSupport: "La persona cuidadora preguntó por apoyo para un hermano o hermana.",
    rationaleTransportation: "La persona cuidadora describió una necesidad de transporte.",
    rationaleFuturePlanning: "La persona cuidadora preguntó por la transición a la adultez o la planificación futura.",
    rationaleDiagnosisEducation: "La persona cuidadora pidió información general sobre un diagnóstico informado.",
    rationaleRecreation: "La persona cuidadora preguntó por clubes, deportes, caballos o recreación.",
    resourcesTitle: "Recursos encontrados",
    resourcesIntro: "Estas opciones coinciden con el condado, la edad y las áreas elegidas. El enlace de la fuente es la autoridad para las reglas actuales.",
    resourceSourceLanguageNotice: "Los detalles proporcionados por las organizaciones pueden permanecer en su idioma original mientras esperan una traducción revisada.",
    nearbyTherapeuticRecreationTitle: "Recreación terapéutica cercana",
    nearbyTherapeuticRecreationIntro: "Esta opción local separada coincide con el condado y la edad del niño y ofrece recreación y apoyo terapéutico. No creó una nueva inferencia de área de apoyo.",
    resourceSource: "Fuente",
    resourceVerified: "Revisado el {date}",
    resourceAgeBand: "Rango de edad",
    resourceContact: "Cómo empezar",
    resourceReferralMode: "Ruta de referido",
    resourceHumanVerify: "Confirma los datos actuales con una persona antes de actuar.",
    resourceActNow: "Por qué actuar ahora",
    resourceAllAges: "Todas las edades",
    resourceAgeFrom: "Desde los {min} años",
    resourceAgeThrough: "Desde el nacimiento hasta los {max} años",
    resourceAgeBetween: "Edades de {min} a {max} años",
    referralSelfServe: "Empezar en línea",
    referralCall: "Llamar directamente",
    referralProvider: "Pedir un referido a un profesional",
    referralSchool: "Contactar a la escuela",
    referralNavigator: "Pedir ayuda a un navegador",
    resourceSave: "Guardar",
    resourceSaved: "Guardado",
    resourceShare: "Compartir",
    resourceShareConsent: "Acepto compartir este recurso ahora.",
    resourceShareConsentRequired: "Marca la casilla de consentimiento antes de compartir.",
    resourceShareComplete: "Se registró el intercambio con tu consentimiento.",
    resourceOpenSource: "Abrir enlace de la fuente",
    resourceAlreadyEnrolled: "Ya recibe este apoyo",
    resourceMarkEnrolled: "Marcar como apoyo que ya recibe",
    resourceUnmarkEnrolled: "Quitar la marca de apoyo que ya recibe",
    savedResourcesTitle: "Recursos guardados",
    savedResourcesEmpty: "Los recursos que guardes aparecerán aquí para tu próxima visita.",
    emptyFallbackTitle: "Aún no hay una opción local exacta",
    emptyFallbackBody: "Empieza con apoyos estatales para familias, el directorio de HDI, recursos de kynect o el 211 mientras sigues buscando localmente.",
    emptyNavigatorHonesty: "Un navegador familiar puede ayudar a buscar opciones locales. Este demo no puede prometer que un servicio, cupo o beneficio esté disponible.",
    timelineTitle: "Lo correcto en el momento correcto",
    timelineIntro: "Esta cronología de consulta usa la edad y las fechas ingresadas. Sirve para planificar; no es un servicio de recordatorios ni una decisión de elegibilidad.",
    timelineNow: "Ahora",
    timelineNext: "Próximo",
    timelineLater: "Más adelante",
    timelineNoProfile: "Agrega un perfil familiar para ver momentos de planificación.",
    timelineEmpty: "Aún no hay momentos de planificación que coincidan con el perfil actual.",
    timelineYearOnlyNotice: "El momento se muestra temprano porque solo se conoce el año de nacimiento.",
    timelineFirstStepsTitle: "Contacta a First Steps ahora",
    timelineFirstStepsBody: "First Steps no acepta referidos nuevos durante los últimos 45 días antes de los tres años. Contacta el punto de entrada local para confirmar si la ventana sigue abierta y pregunta por opciones de transición si ya cerró.",
    timelineAgeThreeTransitionTitle: "Planifica la transición antes de los tres años",
    timelineAgeThreeTransitionBody: "Pide la conferencia de transición y mantén la inscripción en First Steps para que un niño elegible pueda tener un IEP listo al cumplir tres años.",
    timelineSchoolEnrollmentTitle: "Prepárate para la inscripción escolar",
    timelineSchoolEnrollmentBody: "Conoce el proceso ARC e IEP de Kentucky antes de la inscripción en preescolar o kindergarten.",
    timelineWaiverApplyTitle: "Pregunta por la solicitud de la exención Michelle P.",
    timelineWaiverApplyBody: "La lista de espera de Michelle P. se ordena por fecha, así que pregunta a Kentucky cómo solicitar ahora. Kentucky decide la elegibilidad y el lugar en la lista.",
    timelineSchoolArcTitle: "Prepárate para la reunión ARC escolar",
    timelineSchoolArcBody: "Reúne las preocupaciones de la familia y pregunta a la escuela cómo solicitar una reunión ARC o evaluación para un IEP.",
    timelineParentConnectionTitle: "Conecta con otra familia",
    timelineParentConnectionBody: "Un grupo de padres o mentor puede ayudar a la familia a conocer los próximos pasos sin navegar sola.",
    timelineSiblingRespiteTitle: "Explora apoyo para hermanos y respiro",
    timelineSiblingRespiteBody: "Busca opciones locales honestas para hermanos y descansos planificados del cuidado.",
    timelineMissionTransitionTitle: "Empieza la planificación de transición",
    timelineMissionTransitionBody: "Usa el proceso ARC escolar y los recursos de transición de Kentucky para empezar a planificar la vida adulta.",
    timelineBeforeEighteenTitle: "Prepárate para los dieciocho años",
    timelineBeforeEighteenBody: "Revisa la nueva solicitud de SSI, la toma de decisiones con apoyo frente a la tutela y las opciones de cuenta STABLE antes de los dieciocho años."
  }
};

export function tFamily(
  language: Language,
  key: FamilyStringKey,
  vars?: Record<string, string | number>
): string {
  const template = familyStrings[language]?.[key] ?? familyStrings.en[key];
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
