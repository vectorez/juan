import { useState } from "react";
import { ReportsManager } from "./ReportsManager";
import { ReportBuilder } from "./ReportBuilder";
import { ReportViewer } from "./ReportViewer";

type View =
  | { mode: "list" }
  | { mode: "build"; id?: number }
  | { mode: "view"; id: number };

export function ReportsPage() {
  const [view, setView] = useState<View>({ mode: "list" });

  if (view.mode === "build") {
    return (
      <ReportBuilder
        reportId={view.id}
        onBack={() => setView({ mode: "list" })}
        onViewReport={id => setView({ mode: "view", id })}
      />
    );
  }

  if (view.mode === "view") {
    return (
      <ReportViewer
        reportId={view.id}
        onBack={() => setView({ mode: "list" })}
      />
    );
  }

  return (
    <ReportsManager
      onEdit={id => setView({ mode: "build", id })}
      onView={id => setView({ mode: "view", id })}
    />
  );
}
