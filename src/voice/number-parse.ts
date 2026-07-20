import type { MeasurementContext } from "@/domain/types";
import type { Language } from "@/i18n/strings";

type ParsedBp = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  contexts: MeasurementContext[];
};

type ParsedGlucose = { valueMgDl: number; contexts: MeasurementContext[] };

const contextPhrases: Record<Language, Array<[MeasurementContext, string[]]>> = {
  en: [
    ["morning", ["in the morning", "this morning", "morning"]],
    ["evening", ["in the evening", "at night", "this evening", "evening"]],
    ["before_medicine", ["before medicine", "before medication", "before my medicine"]],
    ["after_medicine", ["after medicine", "after medication", "after my medicine"]],
    ["after_coffee", ["after coffee"]],
    ["after_resting", ["after resting", "after rest"]],
    ["during_symptoms", ["during symptoms", "while having symptoms", "with symptoms"]]
  ],
  es: [
    ["morning", ["en la manana", "por la manana", "esta manana", "manana"]],
    ["evening", ["en la noche", "por la noche", "esta noche", "noche"]],
    ["before_medicine", ["antes del medicamento", "antes de la medicina", "antes de mi medicina"]],
    ["after_medicine", ["despues del medicamento", "despues de la medicina", "despues de mi medicina"]],
    ["after_coffee", ["despues del cafe"]],
    ["after_resting", ["despues de descansar", "despues del descanso"]],
    ["during_symptoms", ["durante los sintomas", "con sintomas"]]
  ]
};

const enValues: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

const esValues: Record<string, number> = {
  cero: 0,
  uno: 1,
  un: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90
};

const esHundreds: Record<string, number> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  trescientos: 300,
  cuatrocientos: 400,
  quinientos: 500,
  seiscientos: 600,
  setecientos: 700,
  ochocientos: 800,
  novecientos: 900
};

function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ");
}

function contextsIn(text: string, language: Language): MeasurementContext[] {
  const normalized = normalize(text);
  return contextPhrases[language]
    .filter(([, phrases]) => phrases.some((phrase) => normalized.includes(phrase)))
    .map(([context]) => context);
}

function parseUnderOneHundred(tokens: string[], values: Record<string, number>, joiner: string): number | null {
  const clean = tokens.filter((token) => token !== joiner);
  if (clean.length === 1) return values[clean[0]] ?? null;
  if (clean.length !== 2) return null;
  const tens = values[clean[0]];
  const ones = values[clean[1]];
  return tens !== undefined && tens >= 20 && tens % 10 === 0 && ones !== undefined && ones > 0 && ones < 10
    ? tens + ones
    : null;
}

function parseEnglish(tokens: string[]): number | null {
  const clean = tokens.filter((token) => token !== "and");
  const hundredAt = clean.indexOf("hundred");
  if (hundredAt >= 0) {
    if (hundredAt !== 1) return null;
    const multiplier = enValues[clean[0]];
    if (multiplier === undefined || multiplier < 1 || multiplier > 19) return null;
    const remainder = clean.length === 2 ? 0 : parseUnderOneHundred(clean.slice(2), enValues, "and");
    return remainder === null ? null : multiplier * 100 + remainder;
  }

  const simple = parseUnderOneHundred(clean, enValues, "and");
  if (simple !== null) return simple;
  if (clean.length >= 2) {
    const hundreds = enValues[clean[0]];
    const remainder = parseUnderOneHundred(clean.slice(1), enValues, "and");
    if (hundreds !== undefined && hundreds >= 1 && hundreds <= 9 && remainder !== null && remainder >= 10) {
      return hundreds * 100 + remainder;
    }
  }
  return null;
}

function parseSpanish(tokens: string[]): number | null {
  const clean = tokens.filter((token) => token !== "y");
  const hundred = esHundreds[clean[0]];
  if (hundred !== undefined) {
    const remainder = clean.length === 1 ? 0 : parseUnderOneHundred(clean.slice(1), esValues, "y");
    return remainder === null ? null : hundred + remainder;
  }
  return parseUnderOneHundred(clean, esValues, "y");
}

function isNumberWord(token: string, language: Language): boolean {
  if (language === "en") return token in enValues || token === "hundred" || token === "and";
  return token in esValues || token in esHundreds || token === "y";
}

function numberFrom(text: string, language: Language): number | null {
  const normalized = normalize(text);
  const digit = normalized.match(/(?:^|\D)(\d{1,4})(?!\d)/);
  if (digit) {
    const value = Number(digit[1]);
    return value <= 1999 ? value : null;
  }

  const tokens = normalized.match(/[a-z]+/g) ?? [];
  const first = tokens.findIndex((token) => isNumberWord(token, language) && token !== "and" && token !== "y");
  if (first < 0) return null;
  const words: string[] = [];
  for (let index = first; index < tokens.length && isNumberWord(tokens[index], language); index += 1) {
    words.push(tokens[index]);
  }
  const value = language === "en" ? parseEnglish(words) : parseSpanish(words);
  return value !== null && value <= 1999 ? value : null;
}

export function parseBpUtterance(text: string, language: Language): ParsedBp | null {
  const normalized = normalize(text);
  const separator = normalized.match(/\s*(?:\/|\bover\b|\bsobre\b)\s*/);
  if (!separator || separator.index === undefined) return null;

  const left = normalized.slice(0, separator.index);
  const rightStart = separator.index + separator[0].length;
  const remainder = normalized.slice(rightStart);
  const pulseSeparator = remainder.match(/\b(?:pulse|pulso)\b/);
  const right = pulseSeparator?.index === undefined ? remainder : remainder.slice(0, pulseSeparator.index);
  const pulseText = pulseSeparator?.index === undefined
    ? null
    : remainder.slice(pulseSeparator.index + pulseSeparator[0].length);
  const systolic = numberFrom(left, language);
  const diastolic = numberFrom(right, language);
  const pulse = pulseText === null ? null : numberFrom(pulseText, language);

  if (systolic === null || diastolic === null || (pulseText !== null && pulse === null)) return null;
  return { systolic, diastolic, pulse, contexts: contextsIn(text, language) };
}

export function parseGlucoseUtterance(text: string, language: Language): ParsedGlucose | null {
  const valueMgDl = numberFrom(text, language);
  if (valueMgDl === null) return null;
  return { valueMgDl, contexts: contextsIn(text, language) };
}
