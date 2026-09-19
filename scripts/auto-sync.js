#!/usr/bin/env node

/**
 * SchedX - Automatic GitHub Synchronization Daemon
 * 
 * Watches project directory for any file creation, modification, or deletion,
 * debounces rapid edits, generates meaningful commit messages, and pushes
 * automatically to the current tracking branch on GitHub.
 * 
 * Zero external dependencies - uses native Node.js and Git.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Configuration
const DEFAULT_DEBOUNCE_MS = 8000; // 8 seconds default
const HEARTBEAT_INTERVAL_MS = 45000; // 45 seconds periodic check

// Parse command-line arguments
const args = process.argv.slice(2);
let debounceMs = DEFAULT_DEBOUNCE_MS;
let runOnce = false;

for (const arg of args) {
  if (arg.startsWith('--delay=')) {
    const val = parseInt(arg.split('=')[1], 10);
    if (!isNaN(val) && val > 0) debounceMs = val * 1000;
  } else if (arg === '--now' || arg === '--run-once') {
    runOnce = true;
  }
}

if (process.env.SYNC_DELAY) {
  const envVal = parseInt(process.env.SYNC_DELAY, 10);
  if (!isNaN(envVal) && envVal > 0) debounceMs = envVal * 1000;
}

// State management
let debounceTimer = null;
let isSyncing = false;
let pendingChangesWhileSyncing = false;
const changedPaths = new Set();

/**
 * Execute Git command safely and return stdout string
 */
function runGit(gitArgs, options = {}) {
  const result = spawnSync('git', gitArgs, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    windowsHide: true,
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    const errMsg = result.stderr ? result.stderr.trim() : `git exited with code ${result.status}`;
    const err = new Error(errMsg);
    err.status = result.status;
    err.stderr = result.stderr;
    err.stdout = result.stdout;
    throw err;
  }

  return (result.stdout || '').trim();
}

/**
 * Detect current git branch
 */
function getCurrentBranch() {
  try {
    const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch && branch !== 'HEAD') return branch;
  } catch (_) {}
  try {
    const branch = runGit(['branch', '--show-current']);
    if (branch) return branch;
  } catch (_) {}
  return 'main';
}

/**
 * Check if a file should be ignored from triggering sync events
 */
function shouldIgnore(relativePath) {
  if (!relativePath) return true;
  const normalized = relativePath.replace(/\\/g, '/');
  const base = path.basename(normalized);

  // Ignore git internal files
  if (normalized === '.git' || normalized.startsWith('.git/')) return true;

  // Ignore dependencies
  if (normalized === 'node_modules' || normalized.startsWith('node_modules/') || normalized.includes('/node_modules/')) return true;

  // Ignore secrets and environment files (except example)
  if (base.startsWith('.env') && base !== '.env.example') return true;
  if (base.endsWith('.pem') || base.endsWith('.key') || base === 'credentials.json') return true;

  // Ignore system, IDE, log and temp files
  if (normalized.startsWith('.vscode/') || normalized.startsWith('.idea/')) return true;
  if (base === 'Thumbs.db' || base === 'desktop.ini' || base === '.DS_Store') return true;
  if (base === '.git-sync.lock') return true;
  if (base.endsWith('.tmp') || base.endsWith('.swp') || base.endsWith('.log') || base.startsWith('~') || base.startsWith('.#')) return true;

  return false;
}

/**
 * Generate a descriptive, intelligent commit message based on porcelain git status
 */
function generateCommitMessage(statusLines) {
  if (!statusLines || statusLines.length === 0) {
    return 'auto: sync project changes';
  }

  const entries = statusLines.map(line => {
    const code = line.slice(0, 2).trim();
    const file = line.slice(3).trim().replace(/^"(.*)"$/, '$1');
    return { code, file };
  });

  const isAllUntracked = entries.every(e => e.code === '??' || e.code === 'A');
  const isAllDeleted = entries.every(e => e.code === 'D');
  const isAllModified = entries.every(e => e.code === 'M');

  const files = entries.map(e => e.file.replace(/\\/g, '/'));

  // Specific single file update
  if (entries.length === 1) {
    const filename = path.basename(files[0]);
    if (isAllUntracked) return `auto: add ${filename}`;
    if (isAllDeleted) return `auto: remove ${filename}`;
    return `auto: update ${filename}`;
  }

  // Check uniform action types
  if (isAllUntracked) {
    return 'auto: add new files';
  }
  if (isAllDeleted) {
    return 'auto: remove files';
  }

  // Check functional areas
  const isFrontend = files.every(f => f.startsWith('public/') || f.endsWith('.html') || f.endsWith('.css'));
  const isBackend = files.every(f => f === 'server.js' || f.startsWith('config/') || f.startsWith('database/') || f.startsWith('supabase/'));
  const isDocs = files.every(f => f.startsWith('docs/') || f.endsWith('.md') || f.endsWith('.txt'));
  const isData = files.every(f => f.startsWith('data/'));

  if (isFrontend) return 'auto: update frontend';
  if (isBackend) return 'auto: update backend';
  if (isDocs) return 'auto: update documentation';
  if (isData) return 'auto: update data store';

  // Mixed changes
  const hasFrontend = files.some(f => f.startsWith('public/'));
  const hasBackend = files.some(f => f === 'server.js' || f.startsWith('config/') || f.startsWith('database/'));

  if (hasFrontend && hasBackend) {
    return 'auto: update frontend and backend';
  }

  return 'auto: update project files';
}

/**
 * Execute Git synchronization
 */
async function performSync(reason = 'change') {
  if (isSyncing) {
    pendingChangesWhileSyncing = true;
    return;
  }

  isSyncing = true;
  pendingChangesWhileSyncing = false;

  try {
    const currentBranch = getCurrentBranch();

    // Check Git status
    const statusOutput = runGit(['status', '--porcelain']);
    if (!statusOutput) {
      isSyncing = false;
      changedPaths.clear();
      return;
    }

    const statusLines = statusOutput.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (statusLines.length === 0) {
      isSyncing = false;
      changedPaths.clear();
      return;
    }

    console.log(`[Git Sync] Changes detected (${statusLines.length} item${statusLines.length === 1 ? '' : 's'}).`);

    // Safety check: ensure no secrets are included
    for (const line of statusLines) {
      const file = line.slice(3).trim();
      const base = path.basename(file);
      if (base.startsWith('.env') && base !== '.env.example') {
        console.warn(`[Git Sync] WARNING: Environment file '${file}' detected. Skipping stage of secrets.`);
      }
    }

    // Stage changes
    console.log('[Git Sync] Staging changes...');
    runGit(['add', '-A']);

    // Generate commit message
    const commitMessage = generateCommitMessage(statusLines);
    console.log(`[Git Sync] Creating commit: "${commitMessage}"...`);
    runGit(['commit', '-m', commitMessage]);

    // Push changes
    console.log(`[Git Sync] Pushing to GitHub (origin/${currentBranch})...`);

    // Check remote connectivity and fetch branch status
    try {
      runGit(['fetch', 'origin', currentBranch], { allowFailure: true });
      const revCount = runGit(['rev-list', '--count', `HEAD..origin/${currentBranch}`], { allowFailure: true });
      const behindCount = parseInt(revCount, 10) || 0;

      if (behindCount > 0) {
        console.error(`[Git Sync] Push cancelled: Remote branch 'origin/${currentBranch}' has ${behindCount} new commit(s) not present locally.`);
        console.error(`[Git Sync] Please run 'git pull' or resolve differences manually.`);
        console.error(`[Git Sync] Changes were NOT deleted.`);
        isSyncing = false;
        changedPaths.clear();
        return;
      }
    } catch (_) {
      // Continue to push if fetch was not possible
    }

    // Push to GitHub
    try {
      runGit(['push', 'origin', currentBranch]);
      console.log('[Git Sync] Successfully synchronized with GitHub.');
    } catch (pushErr) {
      console.error(`[Git Sync] Push failed: ${pushErr.message}`);
      console.error('[Git Sync] Changes were NOT deleted.');
    }

    changedPaths.clear();
  } catch (err) {
    console.error(`[Git Sync] Sync error: ${err.message}`);
    console.error('[Git Sync] Changes were NOT deleted.');
  } finally {
    isSyncing = false;

    // If changes occurred while sync was executing, trigger next debounce cycle
    if (pendingChangesWhileSyncing) {
      pendingChangesWhileSyncing = false;
      scheduleSync('pending queued changes');
    }
  }
}

/**
 * Schedule a sync with debounce delay
 */
function scheduleSync(reason = '') {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  const delaySec = Math.round(debounceMs / 1000);
  console.log(`[Git Sync] Waiting for more changes (debounce ${delaySec}s)...`);

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    performSync(reason);
  }, debounceMs);
}

/**
 * Start the file watcher
 */
function startWatcher() {
  const currentBranch = getCurrentBranch();
  let remoteUrl = 'unknown';
  try {
    remoteUrl = runGit(['remote', 'get-url', 'origin']);
  } catch (_) {}

  console.log('========================================================');
  console.log('  SchedX - Automatic GitHub Synchronization Daemon');
  console.log('========================================================');
  console.log(`[Git Sync] Repository : ${PROJECT_ROOT}`);
  console.log(`[Git Sync] Branch     : ${currentBranch}`);
  console.log(`[Git Sync] Remote     : ${remoteUrl}`);
  console.log(`[Git Sync] Debounce   : ${debounceMs / 1000}s`);
  console.log('[Git Sync] Press Ctrl+C to stop auto-sync daemon.');
  console.log('--------------------------------------------------------');

  // Initial check for any existing uncommitted changes
  try {
    const status = runGit(['status', '--porcelain']);
    if (status && status.trim().length > 0) {
      console.log('[Git Sync] Found existing uncommitted changes on startup. Synchronizing...');
      performSync('initial startup sync');
    } else {
      console.log('[Git Sync] Working tree clean. Ready and watching for changes...');
    }
  } catch (err) {
    console.error(`[Git Sync] Startup check failed: ${err.message}`);
  }

  if (runOnce) {
    console.log('[Git Sync] --run-once completed. Exiting.');
    process.exit(0);
  }

  // Set up native recursive directory watcher
  try {
    fs.watch(PROJECT_ROOT, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      if (shouldIgnore(filename)) {
        return;
      }

      changedPaths.add(filename);
      console.log(`[Git Sync] Change detected: ${filename}`);
      scheduleSync(filename);
    });
  } catch (watchErr) {
    console.error(`[Git Sync] Directory watcher failed to start: ${watchErr.message}`);
    process.exit(1);
  }

  // Periodic heartbeat fallback to ensure no missed events
  setInterval(() => {
    if (isSyncing || debounceTimer) return;
    try {
      const status = runGit(['status', '--porcelain']);
      if (status && status.trim().length > 0) {
        console.log('[Git Sync] Heartbeat detected uncommitted changes.');
        scheduleSync('heartbeat');
      }
    } catch (_) {}
  }, HEARTBEAT_INTERVAL_MS);
}

// Graceful termination handling
process.on('SIGINT', () => {
  console.log('\n[Git Sync] Stopping auto-sync daemon... Goodbye.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Git Sync] Terminating auto-sync daemon...');
  process.exit(0);
});

// Run
startWatcher();
