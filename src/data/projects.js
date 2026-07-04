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
    links: {
      live: "https://srm-insider-agent.streamlit.app/",
      github: "https://github.com/shreyascode11/Insider-Agent"
    },
    image: "/assets/projects/insider-agent.jpg" // [PLACEHOLDER]
  },
  {
    name: "The-Last-CEO",
    year: "2026",
    blurb: "A full-stack data application exploring corporate AI adoption — pairing a TypeScript front end with a Python analysis/ML layer over a corporate AI-adoption dataset.",
    role: "Full-Stack & Data (team project)",
    tech: ["TypeScript", "Python", "Data Analysis", "SQLite"],
    links: {
      live: "https://the-last-ceo-eight.vercel.app/",
      github: "https://github.com/shreyascode11/The-Last-CEO"
    },
    image: "/assets/projects/the-last-ceo.jpg" // [PLACEHOLDER]
  }
];
