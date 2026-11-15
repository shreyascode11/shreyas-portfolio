// =====================================================================
// PROJECT DATA — add a new object to this array and the Work section
// (including the WebGL hover distortion) picks it up automatically.
// Media lives in /public/assets/projects/:
//   video: "/assets/projects/xxx.mp4"  → looping muted video thumbnail
//                                        (wins over image if both set)
//   image: "/assets/projects/xxx.jpg"  → static thumbnail
// If neither file exists, a generated cover card is used instead.
// Order = display order (strongest first).
//
// Optional fields:
//   slug     URL-safe id → each row is linkable at #project-<slug>
//            (derived from `name` when omitted)
//   kind     filter buckets for the Work section: "ai" | "web" | "3d"
//   metrics  before → after strip: [{ label, before, after }]
//   links.extra  more links beside Live / GitHub: [{ label, url }]
// =====================================================================
export const projects = [
  {
    name: "Level Up at SRM",
    slug: "srm-redesign",
    year: "2026",
    blurb: "A concept redesign of srmist.edu.in that turns a university site into something you play — your years at SRM become a character who levels up, the real campus becomes a 3D world you can walk, and every fee, date and ranking comes from SRM's own published data.",
    role: "Lead Developer — Design & Build",
    kind: ["web", "3d", "ai"],
    why: "The official site is 10 MB, takes over 20 seconds to paint on a slow 4G phone, and buries the answers students and parents actually need — what a course really costs, which hostel, how to apply. The redesign keeps every fact, makes it 9× lighter, and adds the tools a first-time visitor is missing.",
    features: [
      "Walk SRM — the Kattankulathur campus rebuilt from OpenStreetMap as a toon-shaded open world: 40+ real places, 17 characters with 14 quests, a live-time clock tower, and peer-to-peer multiplayer over WebRTC with no game server",
      "Ask SRM — an assistant grounded in SRM's published data, in English, Tamil and Hindi; AI search can only pick real programmes, and fees always come from the data, never the model",
      "Full cost of every course (tuition, hostel, mess), Parent Mode, a three-way programme compare and a 3D hostel finder",
      "Lite Mode and offline support via a hand-written service worker; WCAG 2.2 AA with zero axe-core violations and a strict Content-Security-Policy"
    ],
    metrics: [
      { label: "Performance", before: "49", after: "94" },
      { label: "Accessibility", before: "81", after: "100" },
      { label: "Page weight", before: "10.1 MB", after: "1.1 MB" },
      { label: "First paint · 4G", before: "21.8 s", after: "1.2 s" }
    ],
    tech: ["Next.js", "React", "TypeScript", "React Three Fiber", "GSAP", "next-intl", "WebRTC", "Tailwind CSS"],
    links: {
      live: "https://srm-redesign-one.vercel.app",
      github: "https://github.com/shreyascode11/SRM-Redesign",
      extra: [{ label: "Play Walk SRM", url: "https://srm-redesign-one.vercel.app/walk" }]
    },
    image: "/assets/projects/srm-redesign.jpg"
  },
  {
    name: "Aegis",
    kind: ["ai"],
    year: "2026",
    blurb: "An MCP server that audits the 'blast radius' of AI agents — mapping their full capability graph across every connected tool, detecting toxic permission combinations, and auto-applying a policy fix before a dangerous connection ships to production.",
    role: "Team Lead — TeamX (team project)",
    award: "1st Place — NitroStack × MCP To The Moon Buildathon, 806 participants · Aug 2026",
    why: "Wiring agents into Gmail, databases, Slack and file systems looks safe one connection at a time — but the combinations open real attack paths, the kind that leaked private GitHub repos and database tokens in 2026. Aegis maps the graph and flags the 'lethal trifecta' — private-data access, untrusted-content exposure, external communication — before it ships.",
    features: [
      "Deterministic graph traversal — no LLM in the detection path, so attack-path detection can't be prompt-injected or hallucinate",
      "Detects toxic permission combinations, e.g. read-private-data + send-external, the exact pattern behind 2026 MCP breaches at GitHub, Cursor and Asana",
      "Four MCP tools — connect_tool, get_capability_graph, detect_attack_paths, apply_policy_fix — cover audit through remediation",
      "Live capability-graph visualization in React Flow, so risky permission paths are visible, not buried in logs"
    ],
    tech: ["TypeScript", "MCP", "React Flow", "NitroStack SDK"],
    links: {
      github: "https://github.com/prince-rai88/aegis-mcp"
    },
    image: "/assets/projects/aegis.jpg"
  },
  {
    name: "Domain",
    kind: ["web", "3d"],
    year: "2026",
    blurb: "A 3D platformer that teaches web development: every level is a real web page. Fix the HTML, CSS or JavaScript and the world rebuilds so you can walk across what you built — 120 lessons from a first tag to async JavaScript.",
    role: "Solo — Design & Build",
    why: "Beginner courses teach code in a text box, disconnected from what the browser actually does with it. Domain makes layout physical: a bridge that's too short is a CSS bug you can see, and fixing the code is how you get across.",
    features: [
      "The browser is the rules engine — each level lays out in a hidden iframe and every element is measured into a walkable block, so CSS is never simulated",
      "120 lessons across HTML, CSS, Flexbox and JavaScript with hints, debriefs and quizzes, plus a real website that grows one piece per lesson",
      "Sandboxed JavaScript runner: acorn parsing, inserted loop guards, module rewriting, a console and a pretend server for fetch",
      "React Three Fiber world with custom platformer physics, in-world DevTools for any block, and procedural textures and audio — no image or sound files"
    ],
    tech: ["Next.js", "React", "TypeScript", "Three.js", "React Three Fiber", "Zustand", "Tailwind CSS"],
    links: {
      live: "https://domain-indol-nine.vercel.app",
      github: "https://github.com/shreyascode11/Domain"
    },
    image: "/assets/projects/domain.jpg"
  },
  {
    name: "EcoScan",
    kind: ["ai", "web"],
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
    image: "/assets/projects/ecoscan.jpg"
  },
  {
    name: "Insider-Agent",
    kind: ["ai"],
    year: "2026",
    blurb: "An agentic RAG assistant that serves as the official AI for the SRM Insiders Club — answering questions about club policies, roles, and deadlines with responses grounded in the official club manuals.",
    role: "Solo — Design & Build",
    tech: ["LangGraph", "RAG", "ChromaDB", "Groq", "Ollama", "Streamlit", "Python"],
    why: "Club members kept asking the same policy and deadline questions, and generic chatbots make answers up. Insider-Agent retrieves from the official club manuals before it answers, so responses stay tied to real documents.",
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
    image: "/assets/projects/insider-agent.jpg"
  },
  {
    name: "The-Last-CEO",
    kind: ["ai", "web", "3d"],
    year: "2026",
    blurb: "An AI-powered business strategy simulator: lead a company through the AI revolution to 2035, with every quarterly boardroom decision scored by a live XGBoost prediction engine.",
    role: "Full-Stack & Data (team project)",
    award: "Best Project — SRM Insider Community · Jun 2026",
    why: "Leaders make high-stakes AI-adoption calls with no way to see the long-term consequences — most simulators either lack realistic AI scenarios or never explain why an outcome happened.",
    features: [
      "Quarterly decisions scored live by XGBoost models trained on real AI-adoption data",
      "Explainable forecasts — every prediction broken down factor by factor, in dollars",
      "3D playable voxel office, dynamic events (recessions, cyberattacks, viral hits) and 8 endings",
      "A what-if sandbox: drag strategy levers and the model re-forecasts revenue, ROI and risk in real time"
    ],
    tech: ["TypeScript", "React", "FastAPI", "XGBoost", "Python"],
    links: {
      live: "https://the-last-ceo-eight.vercel.app/",
      github: "https://github.com/shreyascode11/The-Last-CEO"
    },
    image: "/assets/projects/the-last-ceo.jpg"
  }
];

