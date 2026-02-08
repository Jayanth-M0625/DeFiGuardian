import { Header } from "@/components/Header";

const STATS = [
  { label: "Signals today", value: "12" },
  { label: "VDF checks", value: "8" },
  { label: "FROST checks", value: "3" },
  { label: "Alerts", value: "1" },
];

export default function DashboardPage() {
  return (
    <div className="relative flex size-full min-h-screen flex-col bg-surface overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-4 md:px-10 lg:px-40 flex flex-1 py-8">
          <div className="max-w-[960px] w-full">
            <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight mb-2">
              Dashboard
            </h1>
            <p className="text-muted text-sm md:text-base mb-6">
              Monitor transaction signals, VDF and FROST check results, and
              contract interaction alerts here.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {STATS.map(({ label, value }) => (
                <div
                  key={label}
                  className="p-4 border border-border rounded-xl bg-surfaceAlt"
                >
                  <div className="text-muted text-xs mb-1">{label}</div>
                  <div className="text-white font-semibold text-lg">{value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-surfaceAlt p-6 text-muted text-sm">
              Dashboard content (transactions, signals, checks) will appear here.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
