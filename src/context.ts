import * as vscode from "vscode";
import type { ContextSnapshot } from "./types";
import { readWorkspaceJsonIfExists } from "./utils/fs";

const SNIPPET_TOTAL_LINES = 160;
const IMPORT_BLOCK_MAX_LINES = 60;

const MAX_FULL_FILE_LINES = 300;
const MAX_SNIPPET_CHARS = 24_000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getRangeText(
  doc: vscode.TextDocument,
  start0: number,
  end0: number,
): string {
  const safeStart0 = clamp(start0, 0, doc.lineCount - 1);
  const safeEnd0 = clamp(end0, 0, doc.lineCount - 1);

  const range = new vscode.Range(
    new vscode.Position(safeStart0, 0),
    new vscode.Position(safeEnd0, doc.lineAt(safeEnd0).text.length),
  );
  return doc.getText(range);
}

function findImportBlockEndLine0(
  doc: vscode.TextDocument,
  maxLines: number,
): number {
  const limit = Math.min(doc.lineCount, maxLines);
  let end = 0;

  for (let i = 0; i < limit; i++) {
    const t = doc.lineAt(i).text.trim();

    if (t === "") {
      end = i;
      continue;
    }

    const isComment =
      t.startsWith("//") ||
      t.startsWith("/*") ||
      t.startsWith("*") ||
      t.startsWith("*/");

    const isImportLike =
      t.startsWith("import ") ||
      t.startsWith("export {") ||
      t.startsWith("export * from");

    if (isComment || isImportLike) {
      end = i;
      continue;
    }

    break;
  }

  return end;
}

function buildLargeFileSnippet(
  doc: vscode.TextDocument,
  cursorLine0: number,
): { startLine0: number; endLine0: number; text: string } {
  const importEnd0 = findImportBlockEndLine0(doc, IMPORT_BLOCK_MAX_LINES);
  const importsText = getRangeText(doc, 0, importEnd0);

  const half = Math.floor(SNIPPET_TOTAL_LINES / 2);
  const winStart0 = Math.max(0, cursorLine0 - half);
  const winEnd0 = Math.min(doc.lineCount - 1, cursorLine0 + half);
  const windowText = getRangeText(doc, winStart0, winEnd0);

  let combined = `${importsText}\n\n/* --- Cursor Window --- */\n\n${windowText}`;

  if (combined.length > MAX_SNIPPET_CHARS) {
    const budgetForWindow = Math.max(
      1000,
      MAX_SNIPPET_CHARS - importsText.length - 80,
    );

    const windowTrimmed =
      windowText.length > budgetForWindow
        ? windowText.slice(0, budgetForWindow) +
          "\n/* --- Window truncated by maxChars --- */\n"
        : windowText;

    combined = `${importsText}\n\n/* --- Cursor Window --- */\n\n${windowTrimmed}`;
  }

  const startLine0 = 0;
  const endLine0 = Math.max(importEnd0, winEnd0);

  return { startLine0, endLine0, text: combined };
}

function getEditorSnippet(): ContextSnapshot["editorSnippet"] {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;

  const doc = editor.document;
  const totalLines = doc.lineCount;

  const cursorLine0 = editor.selection.active.line;
  const cursorLine1 = cursorLine0 + 1;

  if (totalLines <= MAX_FULL_FILE_LINES) {
    const fullText = doc.getText();
    const text =
      fullText.length > MAX_SNIPPET_CHARS
        ? fullText.slice(0, MAX_SNIPPET_CHARS) +
          "\n/* --- File truncated by maxChars --- */\n"
        : fullText;

    return {
      languageId: doc.languageId,
      fileName: doc.fileName,
      selectionLine: cursorLine1,
      startLine: 1,
      endLine: totalLines,
      totalLines,
      isFullFile: true,
      text,
    };
  }

  const { startLine0, endLine0, text } = buildLargeFileSnippet(doc, cursorLine0);

  return {
    languageId: doc.languageId,
    fileName: doc.fileName,
    selectionLine: cursorLine1,
    startLine: startLine0 + 1,
    endLine: endLine0 + 1,
    totalLines,
    isFullFile: false,
    text,
  };
}

function mergeDependencies(
  deps?: Record<string, string>,
  devDeps?: Record<string, string>,
): Record<string, string> | undefined {
  const merged: Record<string, string> = { ...(deps ?? {}) };

  // Prefer devDependencies when a package exists in both fields.
  for (const [name, version] of Object.entries(devDeps ?? {})) {
    merged[name] = version;
  }

  return Object.keys(merged).length ? merged : undefined;
}

export async function collectContextSnapshot(): Promise<ContextSnapshot> {
  const editorSnippet = getEditorSnippet();

  const pkg = await readWorkspaceJsonIfExists<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>("package.json");

  const dependenciesJson = mergeDependencies(pkg?.dependencies, pkg?.devDependencies);

  return {
    editorSnippet,
    dependenciesJson,
  };
}