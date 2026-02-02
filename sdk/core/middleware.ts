// Intent Capture (SDK): User transaction initiate karta hai (e.g., Swap on Uniswap or Bridge via LI.FI).

// Route Decision: SDK detect karta hai ki transaction Same Chain hai ya Cross-Chain.

// Parallel Trigger: SDK do requests simultaneously fire karta hai:

//     VDF Loop: Agar amount threshold se zyada hai, toh server-side computation start hoti hai.

//     Guardian Voting: Irrespective of amount, Guardians ko transaction details (target, data, value) alert ke taur par mil jaate hain.

// Continuous Polling: SDK dono endpoints (VDF Worker aur Guardian Node) ko poll karta rehta hai status ke liye.

// Aggregation: Jab VDF proof ready ho jaye aur 7/10 Guardians sign kar dein, SDK dono proofs ko combine karke Middleware.sol par bhej deta hai.

// Final Execution: Contract dono ko verify karke protocol (Uniswap/LI.FI) ko call kar deta hai.


