import fs from 'fs';
import path from 'path';
import { Octokit } from 'octokit';
import { fileURLToPath } from 'url';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_EVENT = JSON.parse(
  fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')
);

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const owner = GITHUB_EVENT.repository.owner.login;
const repo = GITHUB_EVENT.repository.name;
const prNumber = GITHUB_EVENT.pull_request.number;

// Use __dirname for robust path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.join(__dirname, '..', '.github', 'pr-resolution-cache.json');
const CONTEXT_LINES = 15;

// Load cache
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
  return { processedPairs: {}, resolutions: {}, batchResolutions: {} };
}

function generateBatchCacheKey(comment, candidates) {
  const commitShas = candidates.map(c => c.sha).sort().join(',');
  return `${comment.id}-${commitShas}`;
}

// Save cache
function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}




// GraphQL: Fetch review threads to get accurate `isOutdated`/`isResolved`
// GraphQL: Fetch all review threads
async function getAllReviewThreads() {
  const query = `
    query($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          reviewThreads(first: 100) {
            nodes {
              id
              isResolved
              isOutdated
              comments(first: 50) {
                nodes {
                  id
                  databaseId
                  body
                  path
                  line
                  author { login }
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { owner, repo, prNumber };
  console.log(`    🔍 GraphQL Variables:`, JSON.stringify(variables));

  const res = await octokit.request('POST /graphql', {
    query,
    variables,
  });

  if (res.errors) {
    console.error('    ❌ GraphQL Errors:', JSON.stringify(res.errors, null, 2));
  }

  return res.data?.data?.repository?.pullRequest?.reviewThreads?.nodes ?? [];
}

// REST: Fetch review threads and filter outdated/unresolved
// GraphQL: Resolve a review thread by ID
async function resolveReviewThread(threadId) {
  const mutation = `
    mutation($threadId: ID!) {
      resolveReviewThread(input: { threadId: $threadId }) {
        thread { id isResolved }
      }
    }
  `;

  try {
    console.log(`    📡 Resolving thread ${threadId} via GraphQL...`);
    const res = await octokit.request('POST /graphql', {
      query: mutation,
      variables: { threadId },
    });



    const resolved = !!res.data?.data?.resolveReviewThread?.thread?.isResolved;
    if (resolved) {
      console.log(`    ✨ Thread ${threadId} resolved successfully`);
      return true;
    }
    console.warn(`    ⚠️ Thread ${threadId} did not report resolved state`);
    return false;
  } catch (error) {
    console.error(`    ❌ Failed to resolve thread ${threadId}: ${error.message}`);
    return false;
  }
}


// Get all commits in PR with diffs
async function getCommitsWithDiffs() {
  const response = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
  });

  const commits = [];
  for (const commit of response.data) {
    // Use repos.getCommit to get the full commit details including files
    let filesData = [];
    try {
      const commitDetail = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: commit.sha,
      });
      filesData = commitDetail.data.files || [];
    } catch (error) {
      console.error(`  Error fetching details for commit ${commit.sha.substring(0, 8)}:`, error.message);
    }

    console.log(`  Commit ${commit.sha.substring(0, 8)}: ${filesData.length} files modified`);
    if (filesData.length > 0) {
      console.log(`    Files: ${filesData.map(f => f.filename).join(', ')}`);
    } else {
      console.warn(`    ⚠️ No files found for commit ${commit.sha.substring(0, 8)}`);
    }

    commits.push({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      files: filesData,
    });
  }

  return commits;
}

// Get diff for a specific file in a commit
// Get diff for a specific file in a commit
async function getFileDiff(commit, filename) {
  // Use the diff information already attached to the commit object by getCommitsWithDiffs
  const file = commit.files?.find(f => f.filename === filename);
  return file?.patch || '';
}

// Call OpenAI to analyze if ANY of the candidate commits resolve the comment
async function analyzeBatchWithOpenAI(comment, commits) {
  const commitsContext = commits.map((c, i) => `
COMMIT #${i + 1}:
SHA: ${c.sha}
MESSAGE: ${c.message}
DIFF:
${c.diff.substring(0, 2000)}
`).join('\n---\n');

  const prompt = `You are a code review assistant. 
Review Comment: "${comment.body}"
File: ${comment.path}

I have a list of commits that modified this file. Determine if ANY of them resolve the issue described in the review comment.

${commitsContext}

Task:
1. Understand the issue from the review comment.
2. Check each commit to see if it fixes the issue.
3. If multiple commits address it, pick the one that fully resolves it.
4. If a commit only PARTIALLY resolves it, or attempts to but fails, return "resolves": false and "partial": true.
5. If NO commit resolves it, return false.
Respond in JSON:
{
  "resolves": true/false, // STRICT: Only true if the commit COMPLETELY resolves the comment.
  "partial": true/false,  // Set to true if the commit addresses the issue but is incomplete or you are unsure.
  "resolvingConfirmIndices": [1, 3], // List of indices (1-based) of commits that contribute to the fix.
  "confidence": 0-100,
  "reasoning": "Explanation..."
}`;

  try {
    const promptLen = prompt.length;
    console.log(`\n🧠 OpenAI Batch Analyze -> comment #${comment.id} with ${commits.length} candidates`);
    console.log(`   • prompt length=${promptLen} chars`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('   ❌ OpenAI API error:', data);
      return null;
    }

    const content = data.choices[0]?.message?.content ?? '';
    const jsonMatch = content.match(/\{[\s\S]*}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`   ✅ Result: resolves=${parsed.resolves} confidence=${parsed.confidence}`);
    return parsed;
  } catch (error) {
    console.error('   ❌ Error calling OpenAI:', error);
    return null;
  }
}

// Pre-filter: find commits that touch the same file as the comment
function preFilterCommits(comments, commits) {
  const filtered = [];

  console.log(`\n🔍 Pre-filtering: ${comments.length} comments vs ${commits.length} commits`);

  for (const comment of comments) {
    const commentFile = comment.path;
    console.log(`\n  📄 Comment file: "${commentFile}"`);

    const matchingCommits = commits.filter(commit => {
      const hasFile = commit.files.some(
        file => file.filename === commentFile
      );
      if (!hasFile && commit.files.length > 0) {
        console.log(`    Files in commit: ${commit.files.map(f => f.filename).join(', ')}`);
      }
      return hasFile;
    });

    console.log(`    ✓ Found ${matchingCommits.length} matching commits`);

    if (matchingCommits.length > 0) {
      filtered.push({
        comment,
        candidates: matchingCommits,
      });
    }
  }

  return filtered;
}

// Check if commit touches the region around the comment line
function isInRegion(diff, commentLine) {
  if (commentLine == null || Number.isNaN(Number(commentLine))) {
    return true;
  }
  const lines = diff.split('\n');
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
      if (match) {
        currentLine = parseInt(match[1]);
      }
    } else if (!line.startsWith('-')) {
      currentLine++;

      if (Math.abs(currentLine - commentLine) <= CONTEXT_LINES) {
        return true;
      }
    }
  }

  return false;
}

// Main workflow
async function main() {
  console.log(`🔍 Analyzing PR #${prNumber}...\n`);

  const cache = loadCache();
  const cachedCount = Object.keys(cache.batchResolutions || {}).length;
  console.log(`📦 Cache loaded with ${cachedCount} entries`);

  const commits = await getCommitsWithDiffs();

  // Fetch all threads once
  console.log(`🔎 Fetching all review threads (GraphQL)...\n`);
  const allThreads = await getAllReviewThreads();

  // 1. Handle Outdated Threads
  const outdatedThreads = allThreads.filter(t => t.isOutdated === true && t.isResolved === false);
  console.log(`📊 Found ${outdatedThreads.length} outdated thread(s)\n`);

  let resolvedOutdatedCount = 0;
  for (const thread of outdatedThreads) {
    const threadId = thread.id;
    console.log(`  🔄 Resolving outdated thread ${threadId}...`);
    const ok = await resolveReviewThread(threadId);
    if (ok) {
      resolvedOutdatedCount++;
      console.log(`  ✅ Resolved outdated thread ${threadId}`);
    } else {
      console.log(`  ❌ Failed to resolve outdated thread ${threadId}`);
    }
  }

  if (resolvedOutdatedCount > 0) {
    console.log(`\n🎯 Resolved ${resolvedOutdatedCount} outdated comment(s)\n`);
  }

  // 2. Handle Unresolved Comments (Active Threads)
  // Filter for:
  // - Not valid outdated (handled above)
  // - isResolved = false
  // - No "Fixed by commits: ..." reply from bot

  const unresolvedThreads = allThreads.filter(t => {
    if (t.isResolved) return false;
    if (t.isOutdated) return false; // Already tried to resolve if it was outdated

    // Check for existing bot resolution reply
    const hasBotResolution = t.comments.nodes.some(c =>
      c.body.includes('Fixed by commits') || c.body.includes('Fixed by commit')
    );

    return !hasBotResolution;
  });

  // Map to comment objects for analysis (use the first comment in the thread)
  const comments = unresolvedThreads
    .map(t => {
      const first = t.comments.nodes[0];
      if (!first) return null;
      return {
        id: first.databaseId, // Use databaseId for REST API compatibility
        threadId: t.id,       // Capture GraphQL thread ID for resolution
        body: first.body,
        path: first.path,
        line: first.line
      };
    })
    .filter(c => c !== null);

  console.log(`📊 Found ${comments.length} unresolved comments and ${commits.length} commits\n`);

  const filtered = preFilterCommits(comments, commits);
  console.log(`🎯 Pre-filtered to ${filtered.length} comment/commit pairs\n`);

  const results = {
    resolved: [],
    partial: [],
    lowConfidence: [],
    notResolved: [],
  };

  // Pre-execution estimate of OpenAI calls (upper bound)
  filtered.reduce((sum, { candidates }) => sum + candidates.length, 0);
  // Optimize: Batch analysis
  // Group 1: Filter potential candidates strictly FIRST (isInRegion)
  const commentsToAnalyze = [];
  let apiCalls = 0;
  let cacheHits = 0;


  for (const { comment, candidates } of filtered) {
    const validCandidates = [];
    const hasLine = comment.line != null && !Number.isNaN(Number(comment.line));

    if (!hasLine) {
      console.log(`   ℹ️ Comment #${comment.id} missing line check: checking all ${candidates.length} candidates.`);
    }

    for (const commit of candidates) {
      const diff = await getFileDiff(commit, comment.path);

      if (!hasLine) {
        validCandidates.push({ ...commit, diff });
        continue;
      }

      if (isInRegion(diff, comment.line)) {
        validCandidates.push({ ...commit, diff });
      }
    }

    if (validCandidates.length > 0) {
      commentsToAnalyze.push({ comment, validCandidates });
    }
  }

  console.log(`\n📉 Optimized Plan: ${commentsToAnalyze.length} OpenAI calls for ${filtered.length} total comments.`);

  // Analyze each comment with its batch of valid candidates
  for (const { comment, validCandidates } of commentsToAnalyze) {
    const cacheKey = generateBatchCacheKey(comment, validCandidates);
    let analysis;

    // Check cache
    if (cache.batchResolutions && cache.batchResolutions[cacheKey]) {
      console.log(`\n⏭️  Skipping OpenAI (Cache Hit) for Comment #${comment.id}`);
      analysis = cache.batchResolutions[cacheKey];
      cacheHits++;
    } else {
      apiCalls++;
      console.log(`\n⏳ Cache Miss -> OpenAI Batch Call ${apiCalls} / ${commentsToAnalyze.length} (Comment #${comment.id})`);

      analysis = await analyzeBatchWithOpenAI(comment, validCandidates);

      // Cache result if valid
      if (analysis) {
        if (!cache.batchResolutions) cache.batchResolutions = {};
        cache.batchResolutions[cacheKey] = analysis;
      }

      // Rate limit only on API call
      await new Promise(r => setTimeout(r, 500));
    }
    if (analysis) {
      // Extract resolving commits for both complete and partial cases
      const resolvingCommits = (analysis.resolvingConfirmIndices || [])
        .map(idx => validCandidates[idx - 1])
        .filter(c => c)
        .map(c => ({ sha: c.sha.substring(0, 8), confidence: analysis.confidence }));
      if (analysis.resolves && analysis.confidence >= 85) {
        if (resolvingCommits.length > 0) {
          results.resolved.push({
            commentId: comment.id,
            threadId: comment.threadId,
            line: comment.line,
            commits: resolvingCommits,
            body: comment.body.substring(0, 100)
          });
          console.log(`   ✅ Resolved by: ${resolvingCommits.map(c => c.sha).join(', ')}`);
        }
      } else if (analysis.partial) {
        results.partial.push({
          commentId: comment.id,
          line: comment.line,
          highestConfidence: analysis.confidence,
          commits: resolvingCommits || [],
          body: comment.body.substring(0, 100)
        });
      } else if (analysis.resolves && analysis.confidence > 0) {
        results.lowConfidence.push({
          commentId: comment.id,
          line: comment.line,
          highestConfidence: analysis.confidence,
          body: comment.body.substring(0, 100)
        });
      } else {
        results.notResolved.push({
          commentId: comment.id,
          threadId: comment.threadId, // Pass threadId for GraphQL resolution
          line: comment.line,
          body: comment.body.substring(0, 100)
        });
      }
    } else if (analysis && analysis.resolves && analysis.confidence > 0) {
      results.lowConfidence.push({
        commentId: comment.id,
        line: comment.line,
        highestConfidence: analysis.confidence,
        body: comment.body.substring(0, 100)
      });
    } else {
      results.notResolved.push({
        commentId: comment.id,
        line: comment.line,
        body: comment.body.substring(0, 100)
      });
    }
  }

  // Save updated cache
  saveCache(cache);

  // Post resolutions to PR
  for (const resolution of results.resolved) {
    const commitShas = resolution.commits
      .map(c => `${c.sha}`)
      .join(', ');

    try {
      await octokit.rest.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        comment_id: resolution.commentId,
        body: `🎉 Fixed by commits: ${commitShas}`,
      });
      console.log(`    📬 Posted resolution comment for #${resolution.commentId}`);

      // Also mark the thread as resolved using GraphQL
      if (resolution.threadId) {
        await resolveReviewThread(resolution.threadId);
      } else {
        console.warn(`    ⚠️ Missing threadId for comment #${resolution.commentId}, skipping thread resolution.`);
      }
    } catch (error) {
      console.error(`    ❌ Failed to post resolution for comment ${resolution.commentId}:`, error.message);
    }
  }

  // Save updated cache
  saveCache(cache);
  // Post resolutions to PR
  for (const resolution of results.resolved) {
    const commitShas = resolution.commits
      .map(c => `${c.sha}`)
      .join(', ');
    try {
      await octokit.rest.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        comment_id: resolution.commentId,
        body: `🎉 Fixed by commits: ${commitShas}`,
      });
      console.log(`    📬 Posted resolution comment for #${resolution.commentId}`);

    } catch (error) {
      console.error(`    ❌ Failed to post resolution for comment ${resolution.commentId}:`, error.message);
    }
  }
  // Post partial resolution notifications
  for (const partial of results.partial) {
    const commitShas = (partial.commits || []).map(c => c.sha).join(', ');
    const body = commitShas
      ? `🛠️ Fixed partially in commits: ${commitShas}.`
      : `🛠️ Fixed partially.`;
    try {
      await octokit.rest.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        comment_id: partial.commentId,
        body: body,
      });
      console.log(`    📬 Posted partial resolution comment for #${partial.commentId}`);
    } catch (error) {
      console.error(`    ❌ Failed to post partial resolution for comment ${partial.commentId}:`, error.message);
    }
  }
  // Low confidence results are included in the summary but we do not post individual replies to avoid noise.

  // Only post summary comment if there are comments to analyze and work was done
  const totalAnalyzed = results.resolved.length + results.partial.length + results.lowConfidence.length + results.notResolved.length;

  if (comments.length > 0 && totalAnalyzed > 0) {
    const resolvedCount = results.resolved.length;
    // Condition to skip posting:
    // 1. No resolutions found (resolvedCount === 0)
    // 2. All analyzed items came from cache (totalAnalyzed === cacheHits)
    const shouldSkipSummary = resolvedCount === 0 && totalAnalyzed === cacheHits;

    if (shouldSkipSummary) {
      console.log('✨ Skipping summary comment (No resolutions, all cached, no API calls).');
    } else {
      // Post summary comment
      const summaryComment = formatSummary(results, apiCalls, cacheHits);
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: summaryComment,
      });
    }
  }

  // Write to job summary
  if (totalAnalyzed > 0) {
    const jobSummary = formatJobSummary(results, apiCalls, cacheHits);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, jobSummary);
    console.log(jobSummary);
  } else {
    console.log("\n✨ No new analysis performed. Everything looks up to date.");
  }

}

function formatSummary(results, apiCalls, cacheHits) {
  const total = results.resolved.length + results.partial.length + results.lowConfidence.length + results.notResolved.length;
  return `🤖 **Auto-Resolution Summary**

✅ **Resolved:** ${results.resolved.length}
🛠️ **Partial:** ${results.partial.length}
⚠️ **Low Confidence:** ${results.lowConfidence.length}
❌ **Not Resolved:** ${results.notResolved.length}

📊 **Stats:** ${apiCalls} API calls | ${cacheHits} cache hits | ${total} total analyzed`;
}

function formatJobSummary(results, apiCalls, cacheHits) {
  let summary = `# 🤖 Auto-Resolution Report\n\n`;

  if (results.resolved.length > 0) {
    summary += `## ✅ Resolved (${results.resolved.length})\n`;
    results.resolved.forEach(r => {
      summary += `- Comment #${r.commentId} (line ${r.line}) → ${r.commits.map(c => c.sha).join(', ')}\n`;
    });
    summary += '\n';
  }

  if (results.partial.length > 0) {
    summary += `## 🛠️ Partial (${results.partial.length})\n`;
    results.partial.forEach(r => {
      const commitInfo = r.commits.length > 0
        ? `→ ${r.commits.map(c => c.sha).join(', ')}`
        : '- no specific commits identified';
      summary += `- Comment #${r.commentId} (line ${r.line}) ${commitInfo}\n`;
    });
    summary += '\n';
  }

  if (results.lowConfidence.length > 0) {
    summary += `## ⚠️ Low Confidence (${results.lowConfidence.length})\n`;
    results.lowConfidence.forEach(r => {
      summary += `- Comment #${r.commentId} (line ${r.line}) - ${r.highestConfidence}% confidence\n`;
    });
    summary += '\n';
  }

  if (results.notResolved.length > 0) {
    summary += `## ❌ Not Resolved (${results.notResolved.length})\n`;
    results.notResolved.forEach(r => {
      summary += `- Comment #${r.commentId} (line ${r.line})\n`;
    });
    summary += '\n';
  }

  summary += `## 📊 Stats\n`;
  summary += `- API Calls: ${apiCalls}\n`;
  summary += `- Cache Hits: ${cacheHits}\n`;
  summary += `- Total Analyzed: ${results.resolved.length + results.partial.length + results.lowConfidence.length + results.notResolved.length}\n`;

  return summary;
}

main().catch(error => {
  console.error('❌ Workflow failed:', error.message);
  process.exit(1);
});
