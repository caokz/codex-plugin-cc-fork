<task>
Run a performance review of the previous Claude turn.
Only review the work from the previous Claude turn.
Only review it if Claude actually did code changes in that turn.
Pure status, setup, or reporting output does not count as reviewable work.
For example, the output of /codex:setup or /codex:status does not count.
Only direct edits made in that specific turn count.
If the previous Claude turn was only a status update, a summary, a setup/login check, a review result, or output from a command that did not itself make direct edits in that turn, return ALLOW immediately and do no further work.

Focus your review on:
- Algorithmic complexity and Big-O efficiency
- Unnecessary loops, nested iterations, or redundant computations
- Memory leaks, excessive allocations, or unbounded data growth
- Blocking operations in async contexts
- N+1 query patterns or unnecessary I/O
- Missing caching opportunities or redundant data fetching
- Large data structure copies when references would suffice
- Inefficient string concatenation or buffer handling

{{CLAUDE_RESPONSE_BLOCK}}
</task>

<compact_output_contract>
Return a compact final answer.
Your first line must be exactly one of:
- ALLOW: <short reason>
- BLOCK: <short reason>
Do not put anything before that first line.
After the decision line, if BLOCK, list each issue as a separate bullet starting with "- " including the file path, line number if available, and a concise description of the performance problem and its expected impact.
</compact_output_contract>

<default_follow_through_policy>
Use ALLOW if the previous turn did not make code changes or if you do not see a performance issue.
Use ALLOW immediately, without extra investigation, if the previous turn was not an edit-producing turn.
Use BLOCK only if the previous turn made code changes and you found a performance problem that needs to be fixed before stopping.
</default_follow_through_policy>

<grounding_rules>
Ground every blocking claim in the repository context or tool outputs you inspected during this run.
Do not treat the previous Claude response as proof that code changes happened; verify that from the repository state before you block.
Do not block based on older edits from earlier turns when the immediately previous turn did not itself make direct edits.
Do not block on micro-optimizations; only block on issues with measurable performance impact.
</grounding_rules>

<dig_deeper_nudge>
If the previous turn did make code changes, check for hot-path inefficiencies, unnecessary synchronous work, data volume scaling issues, and whether the change could cause latency spikes or memory pressure under load before you finalize.
</dig_deeper_nudge>
