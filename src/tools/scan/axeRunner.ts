import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import {
  AxeImpact,
  PrioritizedA11yIssue,
  RepresentativeA11yNode,
  ScanOverview,
  ScanSummary,
} from "../../types";

const IMPACT_SCORE: Record<AxeImpact, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
  unknown: 0,
};

function resolveAxeCliPath(): string {
  try {
    const pkgPath = require.resolve("@axe-core/cli/package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const bin =
      typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.axe || pkg.bin?.cli;

    if (!bin) {
      throw new Error("No bin entry in @axe-core/cli package.json");
    }

    return path.join(path.dirname(pkgPath), bin);
  } catch {
    const candidates = [
      path.join(__dirname, "..", "..", "node_modules", ".bin", "axe"),
      path.join(
        __dirname,
        "..",
        "..",
        "node_modules",
        "@axe-core",
        "cli",
        "dist",
        "src",
        "bin",
        "cli.js",
      ),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    throw new Error("Could not locate axe-cli executable.");
  }
}

function toAxeImpact(value: unknown): AxeImpact {
  if (
    value === "critical" ||
    value === "serious" ||
    value === "moderate" ||
    value === "minor"
  ) {
    return value;
  }

  return "unknown";
}

function trimText(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}...`;
}

function toRepresentativeNode(rawNode: any): RepresentativeA11yNode {
  return {
    target: Array.isArray(rawNode?.target) ? rawNode.target.slice(0, 3) : undefined,
    html: trimText(rawNode?.html, 220),
    failureSummary: trimText(rawNode?.failureSummary, 320),
  };
}

function formatImpactSummary(counts: Record<AxeImpact, number>): string {
  const parts = [
    `${counts.critical} critical`,
    `${counts.serious} serious`,
    `${counts.moderate} moderate`,
    `${counts.minor} minor`,
  ];

  if (counts.unknown > 0) {
    parts.push(`${counts.unknown} unknown`);
  }

  return parts.join(", ");
}

function humanizeRuleId(ruleId: string): string {
  return ruleId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildWhyItMatters(ruleId: string, help: string): string {
  const known: Record<string, string> = {
    "button-name":
      "Screen reader users may not understand what the button does if it has no accessible name.",
    "image-alt":
      "Users who cannot see the image may miss important meaning when alternative text is missing or unclear.",
    label:
      "Form controls become harder to understand and operate when they do not have clear labels.",
    "link-name":
      "Links without clear names make navigation harder for screen reader and keyboard users.",
    "aria-input-field-name":
      "Interactive controls need clear accessible names so assistive technologies can announce their purpose.",
    "select-name":
      "Select controls need an accessible name so users understand what input is expected.",
    "input-button-name":
      "Input buttons need a clear accessible name so users know the action they trigger.",
  };

  return known[ruleId] ?? help ?? "This issue can make the interface harder to understand or operate with assistive technologies.";
}

function buildFixHint(ruleId: string, help: string): string {
  const known: Record<string, string> = {
    "button-name":
      "Add visible button text, or add a concise aria-label when the button is icon-only.",
    "image-alt":
      "Provide meaningful alt text for informative images, or use empty alt for decorative images.",
    label:
      "Associate each form control with a visible label or an equivalent accessible name.",
    "link-name":
      "Make sure each link has descriptive text or an accessible name that explains its destination.",
    "aria-input-field-name":
      "Add a programmatic label using visible text, aria-label, or aria-labelledby.",
    "select-name":
      "Add a label element or another valid accessible name for the select control.",
    "input-button-name":
      "Give the input button a value, label, or accessible name that describes its action.",
  };

  return known[ruleId] ?? help ?? "Apply a minimal fix that gives the element correct semantics and a clear accessible name or relationship.";
}

function toPrioritizedIssue(rawViolation: any): PrioritizedA11yIssue {
  const impact = toAxeImpact(rawViolation?.impact);
  const nodes = Array.isArray(rawViolation?.nodes) ? rawViolation.nodes : [];
  const affectedNodeCount = nodes.length;
  const ruleId = rawViolation?.id ?? "unknown";

  const priorityScore = IMPACT_SCORE[impact] * 100 + affectedNodeCount;
  const help = rawViolation?.help ?? "";

  return {
    ruleId,
    title: humanizeRuleId(ruleId),
    impact,
    description: rawViolation?.description ?? "",
    help,
    helpUrl: rawViolation?.helpUrl,
    tags: Array.isArray(rawViolation?.tags) ? rawViolation.tags : undefined,
    affectedNodeCount,
    priorityScore,
    whyItMatters: buildWhyItMatters(ruleId, help),
    fixHint: buildFixHint(ruleId, help),
    representativeNodes: nodes.slice(0, 2).map(toRepresentativeNode),
  };
}

function buildOverview(violations: any[]): ScanOverview {
  const impactCounts: Record<AxeImpact, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    unknown: 0,
  };

  let affectedNodeCount = 0;

  for (const violation of violations) {
    const impact = toAxeImpact(violation?.impact);
    impactCounts[impact] += 1;

    const nodeCount = Array.isArray(violation?.nodes) ? violation.nodes.length : 0;
    affectedNodeCount += nodeCount;
  }

  return {
    violationRuleCount: violations.length,
    affectedNodeCount,
    impactCounts,
    impactSummary: formatImpactSummary(impactCounts),
  };
}

function buildEmptyScanSummary(): ScanSummary {
  const impactCounts: Record<AxeImpact, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    unknown: 0,
  };

  return {
    overview: {
      violationRuleCount: 0,
      affectedNodeCount: 0,
      impactCounts,
      impactSummary: formatImpactSummary(impactCounts),
    },
    prioritizedIssues: [],
  };
}

function buildScanSummary(raw: any, maxPrioritizedIssues: number): ScanSummary {
  const violations = Array.isArray(raw?.violations) ? raw.violations : [];

  const prioritizedIssues = violations
    .map(toPrioritizedIssue)
    .sort((a: any, b: any) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      return b.affectedNodeCount - a.affectedNodeCount;
    })
    .slice(0, maxPrioritizedIssues);

  return {
    overview: buildOverview(violations),
    prioritizedIssues,
  };
}

function runProcess(
  command: string,
  args: string[],
  timeoutMs: number,
  token?: { onCancellationRequested: (cb: () => void) => void },
): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });

    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Scan timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    token?.onCancellationRequested(() => {
      child.kill();
      clearTimeout(timer);
      reject(new Error("Scan cancelled by user."));
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start process: ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0 && stderr.trim()) {
        console.warn(`axe-cli exited with code ${code}. stderr:\n${stderr}`);
      }

      resolve({ stderr });
    });
  });
}

export async function runAxeCliScan(args: {
  url: string;
  timeoutMs: number;
  scanTags: string;
  maxPrioritizedIssues: number;
  chromedriverPath: string;
  workspaceDir: string;
  token?: any;
}): Promise<ScanSummary> {
  const logsDir = path.join(args.workspaceDir, ".a11yhelper-logs");
  fs.mkdirSync(logsDir, { recursive: true });

  const outPath = path.join(logsDir, "axe-results.json");
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

  const axeCliPath = resolveAxeCliPath();
  const nodeExec = process.execPath;

  const procArgs = [
    axeCliPath,
    args.url,
    "--tags",
    args.scanTags,
    "--save",
    outPath,
    "--chromedriver-path",
    args.chromedriverPath,
    "--verbose",
  ];

  await runProcess(nodeExec, procArgs, args.timeoutMs, args.token);

  if (!fs.existsSync(outPath)) {
    throw new Error(
      "Axe failed to generate results file. Check URL accessibility and ChromeDriver.",
    );
  }

  const text = fs.readFileSync(outPath, "utf8").trim();
  if (!text) {
    return buildEmptyScanSummary();
  }

  const json = JSON.parse(text);
  const resultObj = Array.isArray(json) ? json[0] : json;

  return buildScanSummary(resultObj, args.maxPrioritizedIssues);
}