import * as vscode from "vscode";
import * as chatUtils from "@vscode/chat-extension-utils";
import { A11Y_SYSTEM_PROMPT, HELP_MODE_PROMPT } from "../../prompts";
import { collectContextSnapshot } from "../../context";
import { formatContextBlock } from "../../utils/text";

type HelpArgs = {
  request: vscode.ChatRequest;
  context: vscode.ChatContext;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
  model: vscode.LanguageModelChat;
};

export async function handleHelp({ request, context, stream, token, model }: HelpArgs) {
  const snapshot = await collectContextSnapshot();
  const ctxBlock = formatContextBlock(snapshot);

  const prompt = `
${A11Y_SYSTEM_PROMPT}

${HELP_MODE_PROMPT}

Project context (optional):
${ctxBlock}

User request:
${request.prompt ?? ""}
`.trim();

  const libResult = chatUtils.sendChatParticipantRequest(
    request,
    context,
    {
      prompt,
      model,
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
