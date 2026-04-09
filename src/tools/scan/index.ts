import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import * as child_process from "child_process";
import {
  getMaxPrioritizedIssues,
  getScanTags,
  getTimeout,
  getScanUrl,
} from "../../config";
import { runAxeCliScan } from "./axeRunner";
import { ScanSummary } from "../../types";

const exec = promisify(child_process.exec);

interface ScanToolInput {
  url?: string;
}

async function ensureChromedriver(): Promise<string> {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const bdmRoot = path.join(home, ".browser-driver-manager");
  const exe =
    process.platform === "win32" ? "chromedriver.exe" : "chromedriver";

  const candidate = findChromedriver(bdmRoot, exe);
  if (candidate) return candidate;

  await exec("npx browser-driver-manager@latest install chromedriver", {
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 10,
    env: { ...process.env, PATH: process.env.PATH },
  });

  const downloaded = findChromedriver(bdmRoot, exe);
  if (!downloaded) throw new Error("ChromeDriver installed but not found.");

  return downloaded;
}

function findChromedriver(root: string, exeName: string): string | null {
  try {
    const dir = path.join(root, "chromedriver");
    if (!fs.existsSync(dir)) return null;

    for (const v of fs.readdirSync(dir)) {
      const vp = path.join(dir, v);
      if (!fs.statSync(vp).isDirectory()) continue;

      for (const platformDir of fs.readdirSync(vp)) {
        const p = path.join(vp, platformDir, exeName);
        if (fs.existsSync(p)) return p;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export class ScanTool implements vscode.LanguageModelTool<ScanToolInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ScanToolInput>,
    token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify({ error: "No workspace folder found." }),
        ),
      ]);
    }

    const url = options.input.url?.trim() || getScanUrl();
    const timeoutMs = getTimeout();
    const scanTags = getScanTags();
    const maxPrioritizedIssues = getMaxPrioritizedIssues();

    try {
      const chromedriverPath = await ensureChromedriver();
      const scanSummary: ScanSummary = await runAxeCliScan({
        url,
        timeoutMs,
        scanTags,
        maxPrioritizedIssues,
        chromedriverPath,
        workspaceDir: workspace.uri.fsPath,
        token,
      });

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify(
            {
              ok: true,
              url,
              scanSummary,
            },
            null,
            2,
          ),
        ),
      ]);
    } catch (e: any) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          JSON.stringify(
            { ok: false, url, error: e?.message || String(e) },
            null,
            2,
          ),
        ),
      ]);
    }
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ScanToolInput>,
  ): Promise<vscode.PreparedToolInvocation> {
    const url = options.input.url?.trim() || getScanUrl();

    return {
      invocationMessage: `Scanning ${url} with axe...`,
      confirmationMessages: {
        title: "Run accessibility scan",
        message: new vscode.MarkdownString(
          `Run an axe accessibility scan for:\n\n\`\`\`\n${url}\n\`\`\``,
        ),
      },
    };
  }
}
