import { Header } from "@/components/Header";

const MOCK_TRANSACTIONS = [
  { txHash: "0x1a2b...3c4d", block: 19283746, from: "0x7a3b...f1e2", to: "0x9c4d...a8b7", value: "0.5 ETH", status: "Success", timestamp: "2 mins ago" },
  { txHash: "0x5e6f...7g8h", block: 19283745, from: "0x2b1c...d3e4", to: "0x8e5f...b9c0", value: "1.2 ETH", status: "Success", timestamp: "3 mins ago" },
  { txHash: "0x9i0j...1k2l", block: 19283744, from: "0x4c5d...e6f7", to: "0x1a2b...3c4d", value: "0.05 ETH", status: "Pending", timestamp: "4 mins ago" },
  { txHash: "0x3m4n...5o6p", block: 19283743, from: "0x6f7g...h8i9", to: "0x5e6f...7g8h", value: "2.0 ETH", status: "Success", timestamp: "5 mins ago" },
  { txHash: "0x7q8r...9s0t", block: 19283742, from: "0x0j1k...2l3m", to: "0x9i0j...1k2l", value: "0.15 ETH", status: "Success", timestamp: "6 mins ago" },
];

const MOCK_STATS = [
  { label: "Latest Block", value: "19,283,746" },
  { label: "Transactions", value: "1,234,567" },
  { label: "Gas Price", value: "24 Gwei" },
];

export default function ExplorerPage() {
  return (
    <div className="relative flex size-full min-h-screen flex-col overflow-x-hidden bg-surface">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-4 md:px-10 lg:px-40 flex flex-1 flex-col py-8">
          <div className="max-w-[1200px] w-full mx-auto">
            <h1 className="text-white text-2xl font-bold mb-6">Web3 Transaction Explorer</h1>
            <p className="text-muted text-sm mb-6">Monitor transactions and contract interactions.</p>

            <div className="mb-8">
              <input
                type="text"
                placeholder="Search by address, tx hash, or block..."
                className="w-full max-w-xl px-4 py-3 rounded bg-input border border-border text-white placeholder:text-muted text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {MOCK_STATS.map(({ label, value }) => (
                <div key={label} className="p-4 border border-border rounded bg-surfaceAlt">
                  <div className="text-muted text-xs mb-1">{label}</div>
                  <div className="text-white font-medium">{value}</div>
                </div>
              ))}
            </div>

            <h2 className="text-white text-lg font-semibold mb-4">Latest Transactions</h2>
            <div className="border border-border rounded overflow-hidden bg-surfaceAlt">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-muted text-xs uppercase bg-input">
                    <th className="p-3 font-medium">Tx Hash</th>
                    <th className="p-3 font-medium">Block</th>
                    <th className="p-3 font-medium">From</th>
                    <th className="p-3 font-medium">To</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TRANSACTIONS.map((tx) => (
                    <tr key={tx.txHash} className="border-b border-border last:border-0 text-sm bg-surfaceAlt hover:bg-input/50 transition-colors">
                      <td className="p-3 text-brand">{tx.txHash}</td>
                      <td className="p-3 text-white">{tx.block}</td>
                      <td className="p-3 text-white">{tx.from}</td>
                      <td className="p-3 text-white">{tx.to}</td>
                      <td className="p-3 text-white">{tx.value}</td>
                      <td className="p-3 text-muted">{tx.status}</td>
                      <td className="p-3 text-muted">{tx.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
