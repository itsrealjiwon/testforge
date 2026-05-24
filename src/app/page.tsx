"use client";

import { useState } from "react";

interface TestCase {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pass" | "fail" | "skip" | null;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  expanded: boolean;
}

const FEATURE_CHIPS = [
  { label: "🔐 Login/Register", prompt: "User login and registration with email/password" },
  { label: "🛒 Checkout Flow", prompt: "E-commerce checkout with payment and order confirmation" },
  { label: "📝 CRUD Operations", prompt: "Create, read, update, delete operations for a resource" },
  { label: "🔍 Search & Filter", prompt: "Search with filters, sorting, and pagination" },
  { label: "📱 File Upload", prompt: "File upload with validation, preview, and progress" },
  { label: "💳 Payment Gateway", prompt: "Payment processing with multiple payment methods" },
];

const PRIORITY_STYLES: Record<string, { tag: string; label: string }> = {
  critical: { tag: "tag-red", label: "🔴 CRITICAL" },
  high: { tag: "tag-yellow", label: "🟡 HIGH" },
  medium: { tag: "tag-blue", label: "🔵 MEDIUM" },
  low: { tag: "tag-purple", label: "🟣 LOW" },
};

export default function Home() {
  const [featureDesc, setFeatureDesc] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const toggleExpand = (id: string) => {
    setTestCases(testCases.map((tc) => (tc.id === id ? { ...tc, expanded: !tc.expanded } : tc)));
  };

  const setStatus = (id: string, status: "pass" | "fail" | "skip") => {
    setTestCases(testCases.map((tc) => (tc.id === id ? { ...tc, status: tc.status === status ? null : status } : tc)));
  };

  const generateCases = async () => {
    if (!featureDesc.trim()) return;
    setLoading(true);
    setGenerated(false);

    const prompt = `Generate 8-10 test cases for this feature: "${featureDesc}"

Return a JSON array. Each test case object must have:
- title: string (short descriptive title)
- category: string (e.g. "Happy Path", "Edge Case", "Error Handling", "Security", "Performance")
- priority: "critical" | "high" | "medium" | "low"
- preconditions: string[] (what needs to be set up first)
- steps: string[] (numbered steps to execute)
- expectedResult: string (what should happen)

Mix happy paths, edge cases, error scenarios, and security checks. Be thorough but realistic.

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      let cases: TestCase[] = [];
      try {
        // Try to extract JSON from response
        let content = data.content || "[]";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        const parsed = JSON.parse(content);
        cases = parsed.map((c: Record<string, unknown>, i: number) => ({
          id: `tc-${Date.now()}-${i}`,
          title: c.title || `Test Case ${i + 1}`,
          category: c.category || "General",
          priority: ["critical", "high", "medium", "low"].includes(c.priority as string) ? c.priority : "medium",
          status: null,
          preconditions: Array.isArray(c.preconditions) ? c.preconditions : [],
          steps: Array.isArray(c.steps) ? c.steps : [],
          expectedResult: typeof c.expectedResult === "string" ? c.expectedResult : "",
          expanded: false,
        }));
      } catch {
        // Fallback: show raw content as single test case
        cases = [
          {
            id: `tc-${Date.now()}-0`,
            title: "Generated Test Cases",
            category: "AI Generated",
            priority: "medium",
            status: null,
            preconditions: [],
            steps: [data.content || "No content generated"],
            expectedResult: "See steps above",
            expanded: true,
          },
        ];
      }

      setTestCases(cases);
      setGenerated(true);
    } catch {
      setTestCases([
        {
          id: `tc-${Date.now()}-err`,
          title: "Connection Error",
          category: "Error",
          priority: "critical",
          status: null,
          preconditions: [],
          steps: ["Failed to connect to AI service. Check if the service is running."],
          expectedResult: "Service should be available",
          expanded: true,
        },
      ]);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: testCases.length,
    critical: testCases.filter((t) => t.priority === "critical").length,
    pass: testCases.filter((t) => t.status === "pass").length,
    fail: testCases.filter((t) => t.status === "fail").length,
    pending: testCases.filter((t) => t.status === null).length,
    coverage: testCases.length > 0 ? Math.round(((testCases.filter((t) => t.status === "pass").length) / testCases.length) * 100) : 0,
  };

  const exportMarkdown = () => {
    const md = [
      `# Test Cases: ${featureDesc}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `Total: ${stats.total} | Pass: ${stats.pass} | Fail: ${stats.fail} | Pending: ${stats.pending}`,
      "",
      ...testCases.map(
        (tc, i) =>
          `## ${i + 1}. ${tc.title}\n**Priority:** ${tc.priority.toUpperCase()} | **Category:** ${tc.category} | **Status:** ${tc.status || "pending"}\n\n` +
          (tc.preconditions.length > 0 ? `**Preconditions:**\n${tc.preconditions.map((p) => `- ${p}`).join("\n")}\n\n` : "") +
          `**Steps:**\n${tc.steps.map((s, j) => `${j + 1}. ${s}`).join("\n")}\n\n` +
          `**Expected Result:** ${tc.expectedResult}\n`
      ),
    ].join("\n---\n\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-cases-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Top Nav */}
      <nav className="neo-border border-t-0 border-l-0 border-r-0 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 neo-border neo-shadow flex items-center justify-center bg-[var(--accent)] text-white text-xl">
                🔨
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">TestForge</h1>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                AI Test Case Generator — no cap 🧢
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-[var(--green)] neo-border"></span>
            <span className="text-xs font-bold uppercase">Online</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero Input Section */}
        <div className="neo-card neo-shadow-lg p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black mb-1">
              Describe Your Feature 👇
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">
              Tell us what you want to test, and our AI will generate comprehensive test cases. It&apos;s that simple.
            </p>
          </div>

          <textarea
            value={featureDesc}
            onChange={(e) => setFeatureDesc(e.target.value)}
            className="neo-input min-h-[100px] resize-none mb-4 font-medium"
            placeholder="e.g. User can reset password via email, then login with the new password. Must validate expired tokens too..."
          />

          {/* Quick Chips */}
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              ⚡ Quick picks — click to load:
            </p>
            <div className="flex flex-wrap gap-2">
              {FEATURE_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => setFeatureDesc(chip.prompt)}
                  className="tag tag-blue hover:scale-105 transition-transform"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateCases}
            disabled={!featureDesc.trim() || loading}
            className="neo-btn neo-btn-primary w-full py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "🍳 Cooking up test cases..." : "🔥 Generate Test Cases!"}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="neo-card p-6 mb-6 animate-bounce-in">
            <div className="flex items-center gap-4">
              <div className="text-4xl animate-spin">⚙️</div>
              <div>
                <p className="font-black text-lg">Processing...</p>
                <p className="text-sm text-[var(--text-muted)]">
                  AI is analyzing all possible scenarios for your feature
                </p>
              </div>
            </div>
            <div className="mt-4 h-3 bg-[var(--yellow-bg)] neo-border overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-1000"
                style={{ width: loading ? "70%" : "0%" }}
              ></div>
            </div>
          </div>
        )}

        {/* Results */}
        {generated && !loading && testCases.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="neo-card p-4 mb-6 animate-slide-up">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-sm font-bold">
                  <span>📊 Total: <span className="font-black">{stats.total}</span></span>
                  <span className="tag tag-red text-[10px] py-0.5 px-2">{stats.critical} Critical</span>
                  <span className="tag tag-green text-[10px] py-0.5 px-2">{stats.pass} Pass</span>
                  <span className="tag tag-red text-[10px] py-0.5 px-2">{stats.fail} Fail</span>
                  <span className="tag tag-yellow text-[10px] py-0.5 px-2">{stats.pending} Pending</span>
                </div>
                <button
                  onClick={exportMarkdown}
                  className="neo-btn text-xs py-1.5 px-4 bg-white"
                >
                  📥 Export .md
                </button>
              </div>
              {stats.total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>Coverage</span>
                    <span>{stats.coverage}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 neo-border">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${stats.coverage}%`,
                        background: stats.coverage >= 80 ? "var(--green)" : stats.coverage >= 50 ? "var(--yellow)" : "var(--red)",
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Test Cases */}
            <div className="space-y-4">
              {testCases.map((tc, index) => {
                const prio = PRIORITY_STYLES[tc.priority] || PRIORITY_STYLES.medium;
                return (
                  <div key={tc.id} className="neo-card animate-slide-up" style={{ animationDelay: `${index * 60}ms` }}>
                    {/* Card Header */}
                    <div
                      className="p-4 cursor-pointer flex items-start justify-between gap-3"
                      onClick={() => toggleExpand(tc.id)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          {tc.status === "pass" && <span className="text-xl">✅</span>}
                          {tc.status === "fail" && <span className="text-xl">❌</span>}
                          {tc.status === "skip" && <span className="text-xl">⏭️</span>}
                          {tc.status === null && (
                            <span className="inline-block w-6 h-6 neo-border bg-white text-center text-xs font-bold leading-6">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-base leading-tight">{tc.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className={`tag text-[10px] py-0.5 px-2 ${prio.tag}`}>{prio.label}</span>
                            <span className="tag text-[10px] py-0.5 px-2 bg-gray-100">{tc.category}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-lg flex-shrink-0">{tc.expanded ? "▼" : "▶"}</span>
                    </div>

                    {/* Card Body */}
                    {tc.expanded && (
                      <div className="px-4 pb-4 border-t-2 border-dashed border-gray-200 pt-4 animate-slide-up">
                        {/* Preconditions */}
                        {tc.preconditions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">
                              📋 Preconditions
                            </h4>
                            <ul className="space-y-1">
                              {tc.preconditions.map((p, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <span className="text-[var(--accent)] font-bold">→</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Steps */}
                        <div className="mb-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            🚶 Steps
                          </h4>
                          <ol className="space-y-2">
                            {tc.steps.map((s, i) => (
                              <li key={i} className="text-sm flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-[var(--accent)] text-white text-[11px] font-black flex items-center justify-center neo-border">
                                  {i + 1}
                                </span>
                                <span className="pt-0.5">{s}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Expected Result */}
                        <div className="neo-border bg-[var(--green-bg)] p-3 mb-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                            ✨ Expected Result
                          </h4>
                          <p className="text-sm font-semibold">{tc.expectedResult}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatus(tc.id, "pass");
                            }}
                            className={`neo-btn text-xs py-1.5 px-4 ${tc.status === "pass" ? "bg-[var(--green)] text-white" : "bg-white"}`}
                          >
                            ✅ Pass
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatus(tc.id, "fail");
                            }}
                            className={`neo-btn text-xs py-1.5 px-4 ${tc.status === "fail" ? "bg-[var(--red)] text-white" : "bg-white"}`}
                          >
                            ❌ Fail
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatus(tc.id, "skip");
                            }}
                            className={`neo-btn text-xs py-1.5 px-4 ${tc.status === "skip" ? "bg-[var(--yellow)] text-white" : "bg-white"}`}
                          >
                            ⏭️ Skip
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {!generated && !loading && testCases.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🧪</div>
            <h3 className="text-xl font-black mb-2">No test cases yet</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
              Describe your feature above, then click{" "}
              <span className="font-bold text-[var(--accent)]">Generate Test Cases</span>{" "}
              and our AI will create them for you. Easy, right? 😎
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 mt-8">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            TestForge — Built with ☕ and AI
          </p>
        </footer>
      </main>
    </div>
  );
}
