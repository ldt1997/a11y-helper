import * as vscode from "vscode";
import { routeRequest } from "./router";
import { handleHelp } from "./handlers/helpHandler";
import { handleScan } from "./handlers/scanHandler";
import { handleFix } from "./handlers//fixHandler";
import { resolvePreferredChatModel } from "../utils/modelSelection";

const PARTICIPANT_ID = "a11yhelper.a11yhelper";

export function registerA11yParticipant(extContext: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request,
    context,
    stream,
    token,
  ) => {
    const route = routeRequest(request);
    const { model, usesFallback } = await resolvePreferredChatModel(request);

    if (usesFallback) {
      stream.markdown(
        "$(info) Preferred model copilot/gpt-4o is unavailable. Using the currently selected chat model.",
      );
    }

    if (route.kind === "scan")
      return handleScan({ request, context, stream, token, model });
    if (route.kind === "fix")
      return handleFix({ request, context, stream, token, model });

    return handleHelp({ request, context, stream, token, model });
  };

  const participant = vscode.chat.createChatParticipant(
    PARTICIPANT_ID,
    handler,
  );
  participant.iconPath = vscode.Uri.joinPath(
    extContext.extensionUri,
    "icon_bot.png",
  );
  extContext.subscriptions.push(participant);
}
