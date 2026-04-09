import * as vscode from "vscode";

function getWorkspaceRoot(): vscode.Uri | undefined {
  const ws = vscode.workspace.workspaceFolders?.[0];
  return ws?.uri;
}

export async function readWorkspaceFileIfExists(
  relativePath: string,
): Promise<string | null> {
  const root = getWorkspaceRoot();
  if (!root) return null;

  const uri = vscode.Uri.joinPath(root, relativePath);
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString("utf8");
  } catch {
    return null;
  }
}

export async function readWorkspaceJsonIfExists<T>(
  relativePath: string,
): Promise<T | null> {
  const raw = await readWorkspaceFileIfExists(relativePath);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
