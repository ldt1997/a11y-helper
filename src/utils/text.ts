import type { ContextSnapshot } from "../types";

function fence(lang: string, code: string): string {
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}

export function formatContextBlock(snapshot: ContextSnapshot): string {
  const parts: string[] = [];

  if (snapshot.editorSnippet) {
    parts.push(
      `## Active Editor Snippet (around cursor)\n` +
        `File: ${snapshot.editorSnippet.fileName}\n` +
        `Language: ${snapshot.editorSnippet.languageId}\n` +
        `Cursor line: ${snapshot.editorSnippet.selectionLine}\n\n` +
        fence(snapshot.editorSnippet.languageId, snapshot.editorSnippet.text),
    );
  } else {
    parts.push(`## Active Editor Snippet\n(No active editor)`);
  }

  if (snapshot.dependenciesJson) {
    parts.push(
      `## package.json dependencies\n` +
        fence("json", JSON.stringify(snapshot.dependenciesJson, null, 2)),
    );
  }

  return parts.join("\n\n");
}