"use client";

import { ActionCard } from "@/components/action-card";
import { AppShell } from "@/components/app-shell";
import { buildTodayTasks } from "@/domain/tasks";
import { useHealthState } from "@/state/store";

export default function TodayPage() {
  const { state } = useHealthState();
  const tasks = buildTodayTasks(state);

  return (
    <AppShell title="Today">
      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium text-care">Hi {state.patient.preferredName}</p>
          <h2 className="mt-1 text-2xl font-semibold">Here is what matters at home today.</h2>
        </div>
        <div className="grid gap-3">
          {tasks.map((task) => (
            <ActionCard key={task.id} task={task} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
