# a11y-helper

`a11y-helper` is a VS Code Chat extension for accessibility engineering workflows.

It combines:

- On-demand page scan with `axe-core`
- Code-level fix guidance for snippets
- General accessibility coaching in chat

The extension is designed for practical WCAG 2.1 A/AA remediation with minimal disruption to existing code.

## What It Can Do

### 1) `/scan` mode

Runs an accessibility scan against a target URL and returns a structured, prioritized summary.

Output includes:

- Violation overview (rule count, affected nodes, impact distribution)
- Top prioritized issues
- Why each issue matters
- Actionable fix hints

### 2) `/fix` mode

Analyzes the current snippet/context and proposes minimal, local accessibility fixes.

Behavior highlights:

- Semantic HTML preferred over ARIA when possible
- Explicit TODO/FIXME markers when human judgment is required
- Keeps edits targeted, avoids broad refactors

### 3) Help mode

Handles general accessibility questions.

It can also guide users to the best next mode:

- Suggest `/scan` for page-wide validation
- Suggest `/fix` for snippet-level remediation

Guidance is intentionally conservative and only appears when relevant signals exist in the user prompt.

## Extension Settings

The extension contributes the following settings:

- `a11yhelper.scanUrl`
	- Default URL used by `/scan`
	- Default: `http://127.0.0.1:8080`

- `a11yhelper.timeout`
	- Timeout for scan execution in milliseconds
	- Default: `15000`

- `a11yhelper.scanTags`
	- Comma-separated `axe` tags used to filter scan scope
	- Default: `wcag2a,wcag2aa,wcag21aa,best-practice`

- `a11yhelper.maxPrioritizedIssues`
	- Number of prioritized issues returned in scan summary
	- Default: `3`

- `a11yhelper.confirmUrlBeforeScan`
	- Whether `/scan` asks for URL confirmation before execution
	- Default: `true`

Example workspace settings:

```json
{
	"a11yhelper.scanUrl": "http://localhost:3000",
	"a11yhelper.timeout": 20000,
	"a11yhelper.scanTags": "wcag2a,wcag2aa,wcag21aa,best-practice",
	"a11yhelper.maxPrioritizedIssues": 5,
	"a11yhelper.confirmUrlBeforeScan": true
}
```

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.108+

### Install dependencies

```bash
npm install
```

### Compile

```bash
npm run compile
```

### Watch mode

```bash
npm run watch
```

### Lint

```bash
npm run lint
```

### Debug extension

- Run the `Run Extension` launch configuration in VS Code.
- This starts an Extension Development Host with the compiled output under `out/`.
