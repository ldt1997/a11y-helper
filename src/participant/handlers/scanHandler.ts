import * as vscode from "vscode";
import * as chatUtils from "@vscode/chat-extension-utils";
import { A11Y_SYSTEM_PROMPT, SCAN_ANALYST_PROMPT } from "../../prompts";
import { collectContextSnapshot } from "../../context";
import { formatContextBlock } from "../../utils/text";
import { getConfirmUrlBeforeScan, getScanUrl } from "../../config";

type ScanArgs = {
  request: vscode.ChatRequest;
  context: vscode.ChatContext;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
  model: vscode.LanguageModelChat;
};

function pickScanTool(): vscode.LanguageModelChatTool[] {
  // Prefer tags if you added them, otherwise fall back to name match.
  const byTag = vscode.lm.tools.filter((t) => t.tags?.includes("a11yhelper"));
  if (byTag.length) return byTag;

  const byName = vscode.lm.tools.filter((t) => t.name === "a11yhelper_scan");
  return byName;
}

async function askUserForUrl(defaultUrl: string): Promise<string | null> {
  const result = await vscode.window.showInputBox({
    title: "Accessibility Scan",
    prompt: "Confirm or modify the website URL to scan",
    value: defaultUrl,
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value.trim()) return "URL cannot be empty.";
      try {
        new URL(value);
        return null;
      } catch {
        return "Please enter a valid URL.";
      }
    },
  });

  return result ?? null;
}

export async function handleScan({
  request,
  context,
  stream,
  token,
  model,
}: ScanArgs) {
  const defaultUrl = getScanUrl();
  const shouldConfirmUrl = getConfirmUrlBeforeScan();

  const confirmedUrl = shouldConfirmUrl
    ? await askUserForUrl(defaultUrl)
    : defaultUrl;
  if (!confirmedUrl) {
    stream.markdown("Scan cancelled.");
    return { metadata: { command: "scan" } };
  }

  const snapshot = await collectContextSnapshot();
  const ctxBlock = formatContextBlock(snapshot);

  const tools = pickScanTool();

  const prompt = `
${A11Y_SYSTEM_PROMPT}

${SCAN_ANALYST_PROMPT}

The scan URL to use is:
${confirmedUrl}

Project context (optional):
${ctxBlock}
`.trim();

  const libResult = chatUtils.sendChatParticipantRequest(
    request,
    context,
    {
      prompt,
      model,
      tools,
      responseStreamOptions: {
        stream,
        responseText: true,
        references: true,
      },
    },
    token,
  );

  return await libResult.result;
}
