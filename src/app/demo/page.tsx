import React from "react";
import { PhoneFrame } from "@/components/phone-frame";

// Not in the app nav — a standalone bezel for stakeholder walkthroughs. The
// iframe is same-origin, so it shares this browser's localStorage and shows the
// live demo state (use the Privacy page to load the Brent demo first).
export default function DemoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-4 bg-paper p-6 text-ink">
      <h1 className="text-xl font-semibold">Patient Centered — phone demo</h1>
      <PhoneFrame>
        <iframe className="h-full w-full border-0" src="/today" title="Patient Centered demo" />
      </PhoneFrame>
      <p className="max-w-md text-center text-sm text-ink/70">
        Live demo — this frame shares the saved data in this browser. Load the Brent demo from the Privacy page to show
        the blood-pressure + diabetes story.
      </p>
    </main>
  );
}
