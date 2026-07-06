"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { FoodAskBar } from "@/components/food-ask-bar";
import { FoodConversation } from "@/components/food-conversation";
import { FoodFactsCard } from "@/components/food-facts-card";
import { FoodViewfinder } from "@/components/food-viewfinder";
import { PantryRecipes } from "@/components/pantry-recipes";
import { MealLogList } from "@/components/meal-log-list";
import { createSafeAiResponse } from "@/ai/safety-gate";
import { PantryProvider, PANTRY_REQUEST_TEXT } from "@/ai/pantry-provider";
import { selectLens } from "@/domain/condition-lens";
import { computeFoodFlags, type FoodFlag } from "@/domain/food-flags";
import { buildMealLogEntry } from "@/domain/meal-log";
import { foodLookupResponseSchema, mealLogEntrySchema } from "@/domain/schemas";
import { t } from "@/i18n/strings";
import { useFoodCamera } from "@/hooks/use-food-camera";
import { useBarcodeScan } from "@/hooks/use-barcode-scan";
import { useFoodVoiceSession, type VoiceSafetyIntercept } from "@/hooks/use-food-voice-session";
import { useHealthState } from "@/state/store";
import type { AiMessage, IdentifiedFood, PantryResult } from "@/domain/types";
import type { LiveSessionContext } from "@/ai/types";

export default function FoodPage() {
  const { state, dispatch } = useHealthState();
  const language = state.patient.language;
  const lens = useMemo(() => selectLens(state.carePlan.condition), [state.carePlan.condition]);

  const camera = useFoodCamera();
  const [identifiedFood, setIdentifiedFood] = useState<IdentifiedFood | null>(null);
  const [logged, setLogged] = useState(false);

  const { activeBarcode } = useBarcodeScan({
    videoRef: camera.videoRef,
    enabled: camera.status === "active",
    onBarcode: () => setLogged(false)
  });

  const flags = useMemo<FoodFlag[]>(
    () => computeFoodFlags(identifiedFood, lens, { medications: state.medications, readings: state.readings }, language),
    [identifiedFood, lens, state.medications, state.readings, language]
  );

  const foodRef = useRef<IdentifiedFood | null>(null);
  foodRef.current = identifiedFood;
  const flagsRef = useRef<FoodFlag[]>([]);
  flagsRef.current = flags;
  const lastAssistantRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getContext = useCallback((): LiveSessionContext => {
    return {
      frameDataUrl: camera.grabFrame(),
      identifiedFood: foodRef.current,
      flagTexts: flagsRef.current.map((flag) => flag.text)
    };
  }, [camera]);

  const appendMessage = useCallback(
    (role: "patient" | "assistant", content: string) => {
      if (role === "assistant") {
        lastAssistantRef.current = content;
      }
      const message: AiMessage = {
        id: crypto.randomUUID(),
        mode: "food",
        role,
        content,
        createdAt: new Date().toISOString(),
        safety: "allowed",
        sources: role === "assistant" ? [stateRef.current.carePlan.id] : []
      };
      dispatch({ type: "addAiMessage", message });
    },
    [dispatch]
  );

  const appendIntercept = useCallback(
    (intercept: VoiceSafetyIntercept) => {
      const message: AiMessage = {
        id: crypto.randomUUID(),
        mode: "food",
        role: "assistant",
        content: intercept.content,
        createdAt: new Date().toISOString(),
        safety: intercept.safety,
        sources: [],
        banner: intercept.banner,
        actions: intercept.actions
      };
      dispatch({ type: "addAiMessage", message });
    },
    [dispatch]
  );

  const voice = useFoodVoiceSession({
    language,
    getState: () => stateRef.current,
    getContext,
    onFinalTranscript: appendMessage,
    onSafetyIntercept: appendIntercept
  });

  const [pantryResult, setPantryResult] = useState<PantryResult | null>(null);
  const [pantryLoading, setPantryLoading] = useState(false);

  const findPantryRecipes = useCallback(async () => {
    if (pantryLoading) {
      return;
    }
    setPantryLoading(true);
    setPantryResult(null);
    const passcode =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("k") ?? undefined : undefined;
    const image = camera.grabFrame() ?? undefined;
    try {
      // Same safety gate as every other AI answer: crisis + reading escalation run
      // on the synthetic pantry utterance, and grounding runs on the recipe summary.
      const response = await createSafeAiResponse(
        { mode: "food", patientInput: PANTRY_REQUEST_TEXT, state: stateRef.current, image },
        new PantryProvider({ passcode })
      );
      if (response.recipes && response.recipes.length > 0) {
        setPantryResult({ detectedItems: response.detectedItems ?? [], recipes: response.recipes });
      } else if (response.safety !== "allowed") {
        appendIntercept({
          safety: response.safety,
          content: response.content,
          banner: response.banner,
          actions: response.actions ?? []
        });
      } else {
        appendMessage("assistant", response.content);
      }
    } finally {
      setPantryLoading(false);
    }
  }, [appendIntercept, appendMessage, camera, pantryLoading]);

  useEffect(() => {
    void camera.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) {
        camera.stop();
        voice.stop();
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
    };
  }, [camera, voice]);

  useEffect(() => {
    let cancelled = false;
    if (!activeBarcode) {
      setIdentifiedFood(null);
      return;
    }
    void fetch(`/api/food/lookup?barcode=${activeBarcode}`)
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) {
          return;
        }
        const parsed = foodLookupResponseSchema.safeParse(json);
        setIdentifiedFood(parsed.success && parsed.data.found ? parsed.data.food : null);
        setLogged(false);
      })
      .catch(() => {
        if (!cancelled) {
          setIdentifiedFood(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeBarcode]);

  const canLog = identifiedFood !== null || lastAssistantRef.current !== null;

  const onLog = useCallback(() => {
    const entry = buildMealLogEntry({
      patientId: stateRef.current.patient.id,
      food: foodRef.current,
      flags: flagsRef.current,
      lastAssistantText: lastAssistantRef.current,
      language
    });
    const parsed = mealLogEntrySchema.safeParse(entry);
    if (!parsed.success) {
      return;
    }
    dispatch({ type: "addMealLogEntry", entry });
    setLogged(true);
  }, [dispatch, language]);

  const foodMessages = state.aiMessages.filter((message) => message.mode === "food");
  const recentMeals = state.mealLog.slice(-5).reverse();
  const scanChip = identifiedFood ? (identifiedFood.brand ? `${identifiedFood.brand} ${identifiedFood.name}` : identifiedFood.name) : activeBarcode;

  return (
    <AppShell title={t(language, "pageTitle")}>
      <div className="grid gap-4">
        <FoodViewfinder
          videoRef={camera.videoRef}
          cameraStatus={camera.status}
          sessionStatus={voice.status}
          scanChip={scanChip}
          language={language}
        />

        {voice.error ? (
          <div className="grid gap-2 rounded-control border border-pulse/30 bg-pulse/5 p-3">
            <p className="text-sm text-pulse">{voice.error}</p>
            <div className="flex gap-2">
              <button className="rounded-control border border-care px-3 py-2 text-sm font-semibold text-care" onClick={() => void voice.start()} type="button">
                {t(language, "retry")}
              </button>
            </div>
          </div>
        ) : null}

        <FoodAskBar
          mode={voice.mode}
          status={voice.status}
          onStart={() => void voice.start()}
          onStop={voice.stop}
          onSendText={voice.sendUserText}
          language={language}
        />

        <button
          className="min-h-14 w-full rounded-control border border-care bg-white px-4 py-2 font-semibold text-care disabled:opacity-40"
          onClick={() => void findPantryRecipes()}
          disabled={pantryLoading || camera.status !== "active"}
          type="button"
        >
          {pantryLoading ? t(language, "pantryScanning") : t(language, "pantryButton")}
        </button>

        {pantryResult ? (
          <PantryRecipes detectedItems={pantryResult.detectedItems} recipes={pantryResult.recipes} language={language} />
        ) : null}

        {identifiedFood || flags.length > 0 ? (
          <FoodFactsCard food={identifiedFood} flags={flags} logged={logged} canLog={canLog} onLog={onLog} language={language} />
        ) : null}

        <FoodConversation
          messages={foodMessages}
          partialAssistantText={voice.partialAssistantText}
          language={language}
          clinic={{ name: state.patient.primaryClinicName, phone: state.patient.primaryClinicPhone }}
        />

        <MealLogList entries={recentMeals} language={language} />
      </div>
    </AppShell>
  );
}
