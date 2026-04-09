import * as vscode from "vscode";
import { A11Y_SYSTEM_PROMPT, HELP_MODE_PROMPT } from "../../prompts";
import { collectContextSnapshot } from "../../context";
import { formatContextBlock } from "../../utils/text";
import type { ContextSnapshot } from "../../types";

type HelpArgs = {
  request: vscode.ChatRequest;
  context: vscode.ChatContext;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
  model: vscode.LanguageModelChat;
};

function buildMessages(userPrompt: string, snapshot: ContextSnapshot) {
  const ctx = formatContextBlock(snapshot);

  const instruction = `${A11Y_SYSTEM_PROMPT}

${HELP_MODE_PROMPT}

You will receive optional project context below. Use it only when helpful.
If context is missing, do not complain; just answer based on the question.

${ctx}

Now answer the user's request.`;

  // Using User messages is the common pattern in VS Code samples.
  return [
    vscode.LanguageModelChatMessage.User(instruction),
    vscode.LanguageModelChatMessage.User(userPrompt),
  ];
}

function buildModeNudge(userPrompt: string): string | null {
  const p = userPrompt.toLowerCase();

  const scanSignals =
    /(scan|audit|axe|url|website|web\s?page|whole\s?page|page-wide|production)/.test(
      p,
    );
  const fixSignals =
    /(fix|patch|refactor|snippet|html|jsx|tsx|aria|label|button|input)/.test(p);

  if (scanSignals && fixSignals) {
    return [
      "## Next best mode",
      "- Run `/scan` first to identify and prioritize real page issues.",
      "- Then use `/fix` with one concrete snippet to get minimal, targeted code changes.",
    ].join("\n");
  }

  if (scanSignals) {
    return [
      "## Next best mode",
      "- Use `/scan` to get page-wide findings and a prioritized issue list from the live URL.",
    ].join("\n");
  }

  if (fixSignals) {
    return [
      "## Next best mode",
      "- Use `/fix` with the relevant snippet to receive minimal accessibility-focused edits.",
    ].join("\n");
  }

  return null;
}

export async function handleHelp({ request, stream, token, model }: HelpArgs) {
  const snapshot = await collectContextSnapshot();
  const userPrompt = request.prompt ?? "";
  const messages = buildMessages(userPrompt, snapshot);

  try {
    const resp = await model.sendRequest(messages, {}, token);
    for await (const chunk of resp.text) {
      stream.markdown(chunk);
    }

    const modeNudge = buildModeNudge(userPrompt);
    if (modeNudge) {
      stream.markdown(`\n\n${modeNudge}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stream.markdown(`⚠️ Error: ${msg}`);
  }

  return { metadata: { command: "help" } } satisfies vscode.ChatResult;
}
