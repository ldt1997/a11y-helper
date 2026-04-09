import * as vscode from "vscode";
import { registerA11yParticipant } from "./participant";
import { ScanTool } from "./tools/scan";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.lm.registerTool("a11yhelper_scan", new ScanTool()),
  );
  registerA11yParticipant(context);
}

export function deactivate() {}
