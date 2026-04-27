<task>
Run a security review of the previous Claude turn.
Only review the work from the previous Claude turn.
Only review it if Claude actually did code changes in that turn.
Pure status, setup, or reporting output does not count as reviewable work.
For example, the output of /codex:setup or /codex:status does not count.
Only direct edits made in that specific turn count.
If the previous Claude turn was only a status update, a summary, a setup/login check, a review result, or output from a command that did not itself make direct edits in that turn, return ALLOW immediately and do no further work.

## Actual Code Changes

Review the actual code diffs below — not Claude's text summary. Identify what was actually changed, then evaluate the code itself.

{{CHANGES_BLOCK}}

Focus your review on:
- Command injection, SQL injection, XSS, and other injection vulnerabilities
- Improper input validation and sanitization
- Hardcoded secrets, API keys, tokens, or credentials
- Insecure file handling and path traversal
- Authentication and authorization bypass risks
- Sensitive data exposure (logging, error messages, responses)
- Insecure dependencies or outdated crypto usage
- Race conditions and concurrency safety issues

{{CLAUDE_RESPONSE_BLOCK}}
</task>

<compact_output_contract>
Return a compact final answer.
Your first line must be exactly one of:
- ALLOW: <short reason>
- BLOCK: <short reason>
Do not put anything before that first line.
After the decision line, if BLOCK, list each issue as a separate bullet starting with "- " including the file path, line number if available, severity (critical/high/medium/low), and a concise description of the vulnerability.
</compact_output_contract>

<default_follow_through_policy>
Use ALLOW if the previous turn did not make code changes or if you do not see a security issue.
Use ALLOW immediately, without extra investigation, if the previous turn was not an edit-producing turn.
Use BLOCK only if the previous turn made code changes and you found a security vulnerability that needs to be fixed before stopping.
</default_follow_through_policy>

<grounding_rules>
Ground every blocking claim in the repository context or tool outputs you inspected during this run.
Do not treat the previous Claude response as proof that code changes happened; verify that from the repository state before you block.
Do not block based on older edits from earlier turns when the immediately previous turn did not itself make direct edits.
Do not block on hypothetical or theoretical vulnerabilities; only block on concrete issues observable in the code.
</grounding_rules>

<dig_deeper_nudge>
If the previous turn did make code changes, check for all user-controlled input paths, how data flows through the changed code, whether secrets could leak through logs or error messages, and whether any new dependencies introduce known vulnerabilities before you finalize.
</dig_deeper_nudge>
