import React, { type ReactNode } from "react";

// A 390px phone bezel for stakeholder walkthroughs, built with base tokens.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="h-[720px] w-[390px] max-w-full overflow-hidden rounded-[2.5rem] border-8 border-ink bg-paper shadow-xl">
      {children}
    </div>
  );
}
