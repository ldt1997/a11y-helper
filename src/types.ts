export type RouteKind = "scan" | "fix" | "help";

export type RouteResult = {
  kind: RouteKind;
};

export type EditorSnippet = {
  languageId: string;
  fileName: string;

  // Cursor line (1-based).
  selectionLine: number;

  // Snippet boundaries (1-based, inclusive).
  startLine: number;
  endLine: number;

  totalLines: number;
  isFullFile: boolean;

  text: string;
};

export type ContextSnapshot = {
  editorSnippet: EditorSnippet | null;
  readmeText?: string;
  dependenciesJson?: Record<string, string>;
};

export type AxeImpact =
  | "critical"
  | "serious"
  | "moderate"
  | "minor"
  | "unknown";

export interface RepresentativeA11yNode {
  target?: string[];
  html?: string;
  failureSummary?: string;
}

export interface PrioritizedA11yIssue {
  ruleId: string;
  title: string;
  impact: AxeImpact;
  description: string;
  help: string;
  helpUrl?: string;
  tags?: string[];

  affectedNodeCount: number;
  priorityScore: number;

  whyItMatters: string;
  fixHint: string;

  representativeNodes: RepresentativeA11yNode[];
}

export interface ScanOverview {
  violationRuleCount: number;
  affectedNodeCount: number;
  impactCounts: Record<AxeImpact, number>;
  impactSummary: string;
}

export interface ScanSummary {
  overview: ScanOverview;
  prioritizedIssues: PrioritizedA11yIssue[];
}