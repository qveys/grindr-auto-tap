# Check Bot Review Status

This is a reusable composite action that checks if a pull request needs a bot review based on commits and existing reviews.

## Description

This action analyzes a pull request to determine if it needs a bot review by:

1. Finding the latest content-changing commit (excluding merge commits, reverts, and commits with `[skip review]`)
2. Checking for existing bot reviews
3. Comparing the timestamp of the latest bot review with the latest commit

## Inputs

- `github-token` (required): GitHub token for API access
- `pr-number` (required): Pull request number to check

## Outputs

- `needs-review`: Whether the PR needs a bot review (`true` or `false`)
- `latest-commit-sha`: SHA of the latest content-changing commit
- `latest-bot-review-date`: Date of the latest bot review (if any)

## Usage

```yaml
- name: Check bot review status
  id: bot-review
  uses: ./.github/actions/check-bot-review
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    pr-number: ${{ github.event.pull_request.number }}

- name: Use the output
  run: |
    echo "Needs review: ${{ steps.bot-review.outputs.needs-review }}"
    echo "Latest commit: ${{ steps.bot-review.outputs.latest-commit-sha }}"
```

## Example

This action is used in the AI Labeler workflow to determine if a PR should be labeled with `status: review-needed`.
