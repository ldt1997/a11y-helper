import * as vscode from "vscode";
import type { RouteResult } from "../types";

export function routeRequest(request: vscode.ChatRequest): RouteResult {
  const cmd = (request.command ?? "").toLowerCase();
  if (cmd === "scan") return { kind: "scan" };
  if (cmd === "fix") return { kind: "fix" };
  const prompt = request.prompt?.toLowerCase() ?? "";
  if (
    prompt.startsWith("scan ") ||
    prompt.includes("run axe") ||
    prompt.includes("axe scan") ||
    prompt.includes("run /scan")
  ) {
    return { kind: "scan" };
  }
  if (prompt.includes("fix")) {
    return { kind: "fix" };
  }
  return { kind: "help" };
}
