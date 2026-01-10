const fs = require('fs');
const path = require('path');
const { Octokit } = require('octokit');

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
const CACHE_FILE = path.join(__dirname, '..', '.github', 'pr-resolution-cache.json');
const CONFIDENCE_THRESHOLD = 0.85;
const CONTEXT_LINES = 15;

// Load cache
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
  return { processedPairs: {}, resolutions: {} };
}

// Save cache
function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// Get all unresolved comments in PR
async function getUnresolvedComments() {
  const response = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Filter only unresolved threads (comments without "Fixed by" resolution)
  return response.data.filter(comment => {
    return !comment.body.includes('Fixed by commit');
  });
}


// GraphQL: Fetch review threads to get accurate `isOutdated`/`isResolved`
async function getOutdatedThreads() {
  const query = `
    query($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          reviewThreads(first: 100) {
            nodes {
              id
              isResolved
              isOutdated
              comments(first: 1) {
                nodes { id body path line }
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

  // Log full structure to debug nulls

  console.log('    🔍 Full GraphQL Response:', JSON.stringify(res.data, null, 2));

  const nodes = res.data?.data?.repository?.pullRequest?.reviewThreads?.nodes ?? [];

  console.log(`    🔍 GraphQL Raw Stats: Fetched ${nodes.length} threads`);
  nodes.forEach((t, i) => {
    console.log(`      [${i}] id=${t.id} isOutdated=${t.isOutdated} isResolved=${t.isResolved}`);
    if (t.comments?.nodes?.length > 0) {
      console.log(`          Sample comment: ${t.comments.nodes[0].body.substring(0, 50)}...`);
    }
  });

  return nodes.filter(t => t.isOutdated === true && t.isResolved === false);
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
    const resolved = !!res.data?.resolveReviewThread?.thread?.isResolved;
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
async function getFileDiff(commit, filename) {
  const response = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: commit.sha,
  });

  const file = response.files?.find(f => f.filename === filename);
  return file?.patch || '';
}

// Call OpenAI to analyze if commit resolves comment
async function analyzeWithOpenAI(comment, commitMessage, diff) {
  const prompt = `You are a code review assistant. Analyze if the given commit resolves the review comment.

REVIEW COMMENT:
${comment.body}

COMMIT MESSAGE:
${commitMessage}

CHANGED CODE (diff):
${diff.substring(0, 3000)}  # Limited to first 3000 chars to save tokens

Task:
1. Extract the core problem/request from the review comment
2. Determine if the commit + diff addresses this problem
3. Provide a confidence score (0-100) of resolution

IMPORTANT:
- The commit must change the same file where the comment was made
- The changes must logically address the problem described in the comment
- Be strict about what constitutes a valid resolution

Respond in JSON format:
{
  "problemExtracted": "Brief description of what the comment asks for",
  "resolves": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation"
}`;

  try {
    const diffLen = typeof diff === 'string' ? diff.length : 0;
    const promptLen = prompt.length;
    const commitMsgLen = typeof commitMessage === 'string' ? commitMessage.length : 0;
    console.log(`\n🧠 OpenAI analyze start -> comment #${comment?.id ?? 'n/a'} @ ${comment?.path ?? 'n/a'}:${comment?.line ?? 'n/a'}`);
    console.log(`   • model=gpt-4o-mini • temperature=0.3 • max_tokens=500`);
    console.log(`   • lengths: diff=${diffLen} chars, commitMsg=${commitMsgLen} chars, prompt=${promptLen} chars`);
    console.time(`openai_request_${comment?.id ?? 'n/a'}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    console.timeEnd(`openai_request_${comment?.id ?? 'n/a'}`);
    console.log(`   ← OpenAI status: ${response.status}`);
    if (!response.ok) {
      // Check if it's a blocking authentication error
      if (data.error && (data.error.code === 'invalid_api_key' || data.error.code === 'authentication_error')) {
        console.error('\n❌ FATAL ERROR: OpenAI Authentication Failed');
        console.error(`   Error: ${data.error.message}`);
        console.error('   Please verify your OPENAI_API_KEY environment variable is set correctly.');
        throw new Error(`OpenAI API Authentication Error: ${data.error.message}`);
      }
      console.error('   ❌ OpenAI API error:', data);
      return null;
    }

    if (data?.usage) {
      console.log(`   • usage: prompt=${data.usage.prompt_tokens} completion=${data.usage.completion_tokens} total=${data.usage.total_tokens}`);
    }
    if (data?.id) {
      console.log(`   • response id: ${data.id}`);
    }

    const choicesCount = Array.isArray(data.choices) ? data.choices.length : 0;
    console.log(`   ✅ OpenAI OK. choices=${choicesCount}`);
    const content = data.choices[0]?.message?.content ?? '';
    console.log(`   🧾 Content head: ${content.slice(0, 140).replace(/\n/g, ' ')}`);
    const jsonMatch = content.match(/\{[\s\S]*}/);
    if (!jsonMatch) {
      console.error('   ⚠️ Failed to parse OpenAI response. Raw head:', content.slice(0, 200).replace(/\n/g, ' '));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const probHead = String(parsed.problemExtracted ?? '').slice(0, 100).replace(/\n/g, ' ');
    console.log(`   ✅ Parsed: resolves=${parsed.resolves} confidence=${parsed.confidence} problem="${probHead}"`);
    return parsed;
  } catch (error) {
    console.error('   ❌ Error calling OpenAI:', error?.message ?? error);
    throw error; // Re-throw to make it blocking
  }
}

// Pre-filter: find commits that touch the same file as the comment
function preFilterCommits(comments, commits) {
  const filtered = [];

  console.log(`\n🔍 Pre-filtering: ${comments.length} comments vs ${commits.length} commits`);
  console.log(`📝 Commits files structure sample:`, commits[0]?.files?.slice(0, 2));

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
    console.log('   ℹ️ Skipping region check: missing comment line');
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
  const commits = await getCommitsWithDiffs();

  // Resolve outdated review threads: detect via GraphQL
  console.log(`🔎 Checking for outdated review threads (GraphQL)...\n`);
  const outdatedThreads = await getOutdatedThreads();
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

  // Then get remaining unresolved comments
  const comments = await getUnresolvedComments();
  console.log(`📊 Found ${comments.length} unresolved comments and ${commits.length} commits\n`);

  const filtered = preFilterCommits(comments, commits);
  console.log(`🎯 Pre-filtered to ${filtered.length} comment/commit pairs\n`);

  const results = {
    resolved: [],
    lowConfidence: [],
    notResolved: [],
  };

  // Pre-execution estimate of OpenAI calls (upper bound)
  const totalPairs = filtered.reduce((sum, {candidates }) => sum + candidates.length, 0);
  const cachedPairs = filtered.reduce((sum, { comment, candidates }) => {
    return sum + candidates.filter(c => {
      const pairId = `${comment.id}-${c.sha}`;
      return cache.processedPairs && cache.processedPairs[pairId];
    }).length;
  }, 0);
  const plannedCallsUpperBound = totalPairs - cachedPairs;
  console.log(`🧮 Planned OpenAI calls (upper bound): ${plannedCallsUpperBound} (total pairs=${totalPairs}, cache hits=${cachedPairs})`);

  let apiCalls = 0;
  const cacheHits = [];

  // Analyze each comment against candidate commits
  for (const { comment, candidates } of filtered) {
    const pairKey = `${comment.id}`;
    const resolvingCommits = [];
    let highestConfidence = 0;

    for (const commit of candidates) {
      const pairId = `${comment.id}-${commit.sha}`;

      // Check cache
      if (cache.processedPairs && cache.processedPairs[pairId]) {
        const cached = cache.processedPairs[pairId];
        if (cached.resolves && cached.confidence >= CONFIDENCE_THRESHOLD) {
          resolvingCommits.push({
            sha: commit.sha.substring(0, 8),
            confidence: cached.confidence,
          });
          cacheHits.push(pairId);
        } else if (cached.confidence > highestConfidence) {
          highestConfidence = cached.confidence;
        }
        continue;
      }

      // Get file diff
      const diff = await getFileDiff(commit, comment.path);

      // Check if commit touches the region
      if (!isInRegion(diff, comment.line)) {
        if (!cache.processedPairs) cache.processedPairs = {};
        cache.processedPairs[pairId] = {
          resolves: false,
          confidence: 0,
          reason: 'Not in region',
        };
        console.log(`   🧩 Cache[${pairId}] set: resolves=false, reason=Not in region`);
        continue;
      }

      // Call OpenAI
      const analysis = await analyzeWithOpenAI(
        comment,
        commit.message,
        diff
      );
      apiCalls++;

      if (!analysis) {
        if (!cache.processedPairs) cache.processedPairs = {};
        cache.processedPairs[pairId] = {
          resolves: false,
          confidence: 0,
          reason: 'OpenAI analysis failed',
        };
        console.log(`   🧩 Cache[${pairId}] set: resolves=false, reason=OpenAI analysis failed`);
        continue;
      }

      const confidence = analysis.confidence / 100;
      if (!cache.processedPairs) cache.processedPairs = {};
      cache.processedPairs[pairId] = {
        resolves: analysis.resolves,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
      };
      console.log(`   🧩 Cache[${pairId}] set: resolves=${analysis.resolves}, confidence=${analysis.confidence}`);

      if (analysis.resolves && confidence >= CONFIDENCE_THRESHOLD) {
        resolvingCommits.push({
          sha: commit.sha.substring(0, 8),
          confidence: analysis.confidence,
        });
      } else if (confidence > highestConfidence) {
        highestConfidence = confidence;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Store results
    if (resolvingCommits.length > 0) {
      results.resolved.push({
        commentId: comment.id,
        line: comment.line,
        commits: resolvingCommits,
        body: comment.body.substring(0, 100),
      });
      if (!cache.resolutions) cache.resolutions = {};
      cache.resolutions[pairKey] = resolvingCommits.map(c => c.sha);
      console.log(`   🗂️ Resolutions[${pairKey}] = ${cache.resolutions[pairKey].join(', ')}`);
    } else if (highestConfidence > 0) {
      results.lowConfidence.push({
        commentId: comment.id,
        line: comment.line,
        highestConfidence,
        body: comment.body.substring(0, 100),
      });
    } else {
      results.notResolved.push({
        commentId: comment.id,
        line: comment.line,
        body: comment.body.substring(0, 100),
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
    } catch (error) {
      console.error(`    ❌ Failed to post resolution for comment ${resolution.commentId}:`, error.message);
    }
  }

  // Post low-confidence notifications
  for (const lowConf of results.lowConfidence) {
    await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      comment_id: lowConf.commentId,
      body: `⚠️ Potentially resolved (${lowConf.highestConfidence}% confidence). Please review manually.`,
    });
  }


  // Only post summary comment if there are comments to analyze
  if (comments.length > 0) {
    // Post summary comment
    const summaryComment = formatSummary(results, apiCalls, cacheHits.length);
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: summaryComment,
    });
  }

  // Write to job summary
  const jobSummary = formatJobSummary(results, apiCalls, cacheHits.length);
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, jobSummary);

  console.log(jobSummary);
}

function formatSummary(results, apiCalls, cacheHits) {
  return `🤖 **Auto-Resolution Summary**

✅ **Resolved:** ${results.resolved.length} review comment(s)
⚠️ **Low Confidence:** ${results.lowConfidence.length} review comment(s)  
❌ **Not Resolved:** ${results.notResolved.length} review comment(s)

📊 **Stats:** ${apiCalls} API calls | ${cacheHits} cache hits | ${results.resolved.length + results.lowConfidence.length + results.notResolved.length} total analyzed`;
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
  summary += `- Total Analyzed: ${results.resolved.length + results.lowConfidence.length + results.notResolved.length}\n`;

  return summary;
}

main().catch(error => {
  console.error('❌ Workflow failed:', error.message);
  process.exit(1);
});
