import * as vscode from "vscode";

export function getScanUrl(): string {
  return vscode.workspace
    .getConfiguration("a11yhelper")
    .get("scanUrl", "http://127.0.0.1:8080");
}

export function getTimeout(): number {
  return vscode.workspace.getConfiguration("a11yhelper").get("timeout", 15000);
}

export function getScanTags(): string {
  return vscode.workspace
    .getConfiguration("a11yhelper")
    .get("scanTags", "wcag2a,wcag2aa,wcag21aa,best-practice");
}

export function getMaxPrioritizedIssues(): number {
  return vscode.workspace
    .getConfiguration("a11yhelper")
    .get("maxPrioritizedIssues", 3);
}

export function getConfirmUrlBeforeScan(): boolean {
  return vscode.workspace
    .getConfiguration("a11yhelper")
    .get("confirmUrlBeforeScan", true);
}
