"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isOnboardingComplete } from "@/state/storage";

// First-run gate. A returning user (onboarding marker set) goes straight to the
// status-first home; a fresh install is offered the condition picker. The marker
// lives outside AppState, so this never fights the reset-to-demo validation.
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isOnboardingComplete() ? "/today" : "/onboarding");
  }, [router]);

  return null;
}
