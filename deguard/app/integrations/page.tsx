import Link from "next/link";
import { Header } from "@/components/Header";
import { ExchangeCard } from "@/components/ExchangeCard";

const EXCHANGES = [
  { name: "Exchange A" },
  { name: "Exchange B" },
  { name: "Exchange C" },
  { name: "Exchange D" },
  { name: "Exchange E" },
  { name: "Exchange F" },
  { name: "Exchange G" },
  { name: "Exchange H" },
  { name: "Exchange I" },
];

export default function IntegrationsPage() {
  return (
    <div className="relative flex size-full min-h-screen flex-col bg-surface overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1 w-full">
            <div className="flex flex-wrap justify-between gap-3 p-4">
              <div className="flex min-w-0 flex-col gap-3">
                <h1 className="text-white tracking-light text-[32px] font-bold leading-tight">
                  Integrations
                </h1>
                <p className="text-muted text-sm font-normal leading-normal">
                  Connect deGuard to exchanges and protocols for protected contract interactions.
                </p>
              </div>
            </div>
            <div className="pb-3">
              <div className="flex border-b border-borderAlt px-4 gap-8">
                <Link
                  href="#"
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-brand text-white pb-[13px] pt-4"
                >
                  <span className="text-white text-sm font-bold leading-normal tracking-[0.015em]">
                    Card View
                  </span>
                </Link>
                <Link
                  href="#"
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-muted pb-[13px] pt-4"
                >
                  <span className="text-muted text-sm font-bold leading-normal tracking-[0.015em]">
                    List View
                  </span>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 p-4">
              {EXCHANGES.map((exchange) => (
                <ExchangeCard key={exchange.name} name={exchange.name} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
