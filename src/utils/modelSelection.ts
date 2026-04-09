import * as vscode from "vscode";

const PREFERRED_MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-4o",
};

export type ModelSelectionResult = {
  model: vscode.LanguageModelChat;
  usesFallback: boolean;
};

export async function resolvePreferredChatModel(
  request: vscode.ChatRequest,
): Promise<ModelSelectionResult> {
  try {
    const [preferred] = await vscode.lm.selectChatModels(PREFERRED_MODEL_SELECTOR);
    if (preferred) {
      return { model: preferred, usesFallback: false };
    }
  } catch {
    // Fallback to request.model when selection fails.
  }

  return { model: request.model, usesFallback: true };
}
