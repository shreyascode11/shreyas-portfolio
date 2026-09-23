// =====================================================================
// TECH STACK — rendered into the Stack section (03).
// `icon` is a key in ./icons.js (Simple Icons slug). Items without a
// brand logo (concepts like RAG, or tools Simple Icons doesn't carry)
// set `mono` instead: a short monogram drawn in the icon slot.
// =====================================================================
export const stack = [
  {
    title: "AI & Machine Learning",
    note: "Agents, retrieval and models behind real products",
    items: [
      { name: "LangChain", icon: "langchain" },
      { name: "LangGraph", icon: "langgraph" },
      { name: "RAG", mono: "RAG" },
      { name: "MCP", icon: "modelcontextprotocol" },
      { name: "XGBoost", mono: "XG" },
      { name: "SHAP", mono: "SH" },
      { name: "Groq Vision", mono: "GQ" },
      { name: "Ollama", icon: "ollama" }
    ]
  },
  {
    title: "Backend & Languages",
    note: "APIs, real-time services and the languages under them",
    items: [
      { name: "Python", icon: "python" },
      { name: "TypeScript", icon: "typescript" },
      { name: "C", icon: "c" },
      { name: "C++", icon: "cplusplus" },
      { name: "Java", icon: "openjdk" },
      { name: "FastAPI", icon: "fastapi" },
      { name: "Node.js", icon: "nodedotjs" },
      { name: "WebSockets", mono: "WS" }
    ]
  },
  {
    title: "Frontend",
    note: "Interfaces, 3D worlds and motion",
    items: [
      { name: "React", icon: "react" },
      { name: "Next.js", icon: "nextdotjs" },
      { name: "Three.js / WebGL", icon: "threedotjs" },
      { name: "React Three Fiber", mono: "R3F" },
      { name: "GSAP", icon: "gsap" },
      { name: "Vite", icon: "vite" },
      { name: "Tailwind CSS", icon: "tailwindcss" }
    ]
  },
  {
    title: "Cloud, Data & Tooling",
    note: "Storing, deploying and automating",
    items: [
      { name: "PostgreSQL", icon: "postgresql" },
      { name: "Redis", icon: "redis" },
      { name: "AWS", icon: "amazonwebservices" },
      { name: "Vercel", icon: "vercel" },
      { name: "Render", icon: "render" },
      { name: "Railway", icon: "railway" },
      { name: "Docker", icon: "docker" },
      { name: "GitHub Actions", icon: "githubactions" },
      { name: "n8n", icon: "n8n" },
      { name: "Postman", icon: "postman" },
      { name: "Git", icon: "git" },
      { name: "GitHub", icon: "github" }
    ]
  }
];
