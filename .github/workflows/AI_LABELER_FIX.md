# AI Labeler PR Close Fix

## Problem

The AI Labeler workflow was incorrectly labeling closed pull requests with `status: open` because it didn't check the actual state of the PR before allowing the AI to suggest a status.

### Error Log Evidence

From the workflow logs when PR #33 was closed:
```
##[notice]Unresolved threads: 0
##[notice]AI response: ```json
["type: refactor", "status: open", "area: background", "area: content", "area: popup", "area: tests"]
```
##[notice]Status label 'status: open' is already present.
```

The workflow detected no unresolved threads and no bot review needed, so it didn't set a forced status. The AI then defaulted to suggesting `status: open` without knowing the PR was actually closed.

## Solution

Added PR state detection logic that takes **priority** over other status checks:

1. **First**: Check if `pr.state === 'closed'`
   - Force `status: closed` (whether merged or closed without merge)

2. **Then**: Only if no forced status was set, check for unresolved threads and bot review needs

### Code Changes

In `.github/workflows/ai-labeler.yml`:

```javascript
// Fetch current PR state to ensure we have up-to-date information
// (especially important for pull_request_review events where payload may be stale)
const { data: currentPR } = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pr.number
});

// 1. Check if PR is closed or merged (takes priority)
if (currentPR.state === 'closed') {
    forcedStatus = 'status: closed';
    const closeType = currentPR.merged ? 'merged' : 'closed without merge';
    core.notice(`PR is ${closeType}, forcing status: closed`);
}

// 2. Count unresolved threads (only if PR is still open)
if (!forcedStatus) {
    // ... existing thread checking logic
}
```

### Key Implementation Details

1. **API fetch for current state**: Uses `github.rest.pulls.get()` to fetch the most recent PR state, avoiding stale data from the event payload (particularly important for `pull_request_review` events)

2. **Proper merged field handling**: Uses `currentPR.merged` (truthy check) instead of `currentPR.merged === true` to handle cases where the field might be `undefined`

## Required Labels

The fix assumes these status labels exist in the repository:
- `status: closed` - For closed or merged pull requests
- `status: open` - For open pull requests
- `status: in-progress` - For PRs with unresolved review threads
- `status: review-needed` - For PRs needing bot review

## Behavior

### Before Fix
- PR closes → AI suggests `status: open` → Wrong label applied

### After Fix
- PR merged → Force `status: closed` → Correct label applied
- PR closed without merge → Force `status: closed` → Correct label applied
- PR open with unresolved threads → Force `status: in-progress`
- PR open, no threads, bot review needed → Force `status: review-needed`
- PR open, no special conditions → AI suggests status from PR content

## Testing

To verify the fix works:

1. Close a PR without merging → Should get `status: closed`
2. Merge a PR → Should get `status: closed`
3. Reopen a PR → Should update status appropriately based on conditions
