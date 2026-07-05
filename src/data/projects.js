// =====================================================================
// PROJECT DATA — add a new object to this array and the Work section
// (including the WebGL hover distortion) picks it up automatically.
// Media lives in /public/assets/projects/:
//   video: "/assets/projects/xxx.mp4"  → looping muted video thumbnail
//                                        (wins over image if both set)
//   image: "/assets/projects/xxx.jpg"  → static thumbnail
// If neither file exists, a generated cover card is used instead.
// =====================================================================
export const projects = [
  {
    name: "EcoScan",
    year: "2026",
    blurb: "AI-powered, real-time community waste-management platform. Citizens report waste spots on an interactive map; volunteers claim and clean them, and every cleanup is auto-verified by an AI vision model.",
    role: "Full-Stack Contributor (team project)",
    tech: ["React", "Vite", "FastAPI", "Groq Vision", "Leaflet", "WebSockets", "PostgreSQL"],
    why: "Community cleanups usually fail on trust and coordination — reports vanish into complaint queues, and there's no proof a cleanup actually happened. EcoScan closes that loop with AI verification at both ends.",
    features: [
      "Interactive Leaflet map with severity markers and a heat overlay of waste hotspots",
      "Groq Vision compares before/after photos to auto-approve or reject every cleanup",
      "A second AI pipeline cross-checks report photos against Street View to catch fake GPS locations",
      "Gamified leaderboard with point tiers, real-time WebSocket updates, and a 5-language UI"
    ],
    links: {
      live: "https://eco-scan-eight.vercel.app",
      github: "https://github.com/shreyascode11/EcoScan"
    },
    image: "/assets/projects/ecoscan.jpg" // [PLACEHOLDER]
  },
  {
    name: "Insider-Agent",
    year: "2026",
    blurb: "An agentic RAG assistant that serves as the official AI for the SRM Insiders Club — answering questions about club policies, roles, and deadlines with hallucination-free, source-grounded responses.",
    role: "Solo — Design & Build",
    tech: ["LangGraph", "RAG", "ChromaDB", "Groq", "Ollama", "Streamlit", "Python"],
    why: "Club members kept asking the same policy and deadline questions, and generic chatbots make answers up. Insider-Agent answers only from the official club manuals — if it isn't in the documents, it doesn't claim it.",
    features: [
      "LangGraph state-machine agent decides when to search vs. answer and holds multi-turn context",
      "ChromaDB vector search retrieves exact manual passages before any answer is generated",
      "Dual deployment: Groq Llama-3.1 in the cloud, or fully-offline Ollama with automatic model fallbacks",
      "Streamlit chat UI, live on Streamlit Community Cloud"
    ],
    links: {
      live: "https://srm-insider-agent.streamlit.app/",
      github: "https://github.com/shreyascode11/Insider-Agent"
    },
    image: "/assets/projects/insider-agent.jpg" // [PLACEHOLDER]
  },
  {
    name: "The-Last-CEO",
    year: "2026",
    blurb: "An AI-powered business strategy simulator: lead a company through the AI revolution to 2035, with every quarterly boardroom decision scored by a live XGBoost prediction engine.",
    role: "Full-Stack & Data (team project)",
    award: "Best Project — SRM Insider Community · Jun 2026",
    why: "Leaders make high-stakes AI-adoption calls with no way to see the long-term consequences — most simulators either lack realistic AI scenarios or never explain why an outcome happened.",
    features: [
      "Quarterly decisions scored live by XGBoost models trained on real AI-adoption data",
      "Explainable forecasts — SHAP breaks every prediction down by factor, in dollars",
      "3D playable voxel office, dynamic events (recessions, cyberattacks, viral hits) and 8 endings",
      "A what-if sandbox: drag strategy levers and the model re-forecasts revenue, ROI and risk in real time"
    ],
    tech: ["TypeScript", "React", "FastAPI", "XGBoost", "Python", "SHAP"],
    links: {
      live: "https://the-last-ceo-eight.vercel.app/",
      github: "https://github.com/shreyascode11/The-Last-CEO"
    },
    image: "/assets/projects/the-last-ceo.jpg" // [PLACEHOLDER]
  }
];
