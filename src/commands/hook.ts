import { readConfig, readClaudeJson } from '../config';
import { sendEvent } from '../utils/sendEvent';
import { uploadTranscript } from '../utils/uploadTranscript';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as url from 'url';

interface HookInput {
  hook_event_name: string;
  session_id: string;
  cwd?: string;
  // SessionStart fields
  permission_mode?: string;
  // PostToolUse / PostToolUseFailure fields
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  duration_ms?: number;
  was_successful?: boolean;
  error_type?: string;
  // Stop fields
  stop_hook_active?: boolean;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 1000);
  });
}

function fireAndForgetIngest(baseUrl: string, apiKey: string, payload: Record<string, unknown>): void {
  const endpoint = `${baseUrl}/ingest`;
  const parsed = new url.URL(endpoint);
  const body = JSON.stringify(payload);

  const req = https.request({
    hostname: parsed.hostname,
    port: 443,
    path: parsed.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key': apiKey,
    },
  });

  req.on('error', () => {});
  req.on('socket', (socket) => { socket.unref(); });
  req.write(body);
  req.end();
}

function handleSessionStart(config: { baseUrl: string; apiKey: string }, input: HookInput): void {
  sendEvent(config.baseUrl, config.apiKey, {
    eventType: 'SessionStart',
    sessionId: input.session_id,
    timestamp: new Date().toISOString(),
    payload: {
      cwd: input.cwd,
      permissionMode: input.permission_mode,
    },
  });
}

function handlePostToolUse(config: { baseUrl: string; apiKey: string }, input: HookInput): void {
  sendEvent(config.baseUrl, config.apiKey, {
    eventType: 'PostToolUse',
    sessionId: input.session_id,
    timestamp: new Date().toISOString(),
    payload: {
      toolName: input.tool_name,
      durationMs: input.duration_ms,
      wasSuccessful: input.was_successful,
    },
  });
}

function handlePostToolUseFailure(config: { baseUrl: string; apiKey: string }, input: HookInput): void {
  sendEvent(config.baseUrl, config.apiKey, {
    eventType: 'PostToolUseFailure',
    sessionId: input.session_id,
    timestamp: new Date().toISOString(),
    payload: {
      toolName: input.tool_name,
      errorType: input.error_type,
    },
  });
}

function handleStop(config: { baseUrl: string; apiKey: string; legacyIngest: boolean }, input: HookInput): void {
  // Send lightweight stop event
  const claudeJson = readClaudeJson();
  sendEvent(config.baseUrl, config.apiKey, {
    eventType: 'Stop',
    sessionId: input.session_id,
    timestamp: new Date().toISOString(),
    payload: {
      cwd: input.cwd,
    },
  });

  // Optionally send full snapshot to /ingest (legacy mode)
  if (config.legacyIngest && claudeJson) {
    fireAndForgetIngest(config.baseUrl, config.apiKey, {
      sessionId: input.session_id,
      cwd: input.cwd,
      claudeJson,
      collectorVersion: '0.2.0',
      collectedAt: new Date().toISOString(),
    });
  }
}

async function handleSessionEnd(config: { baseUrl: string; apiKey: string }, input: HookInput): Promise<void> {
  sendEvent(config.baseUrl, config.apiKey, {
    eventType: 'SessionEnd',
    sessionId: input.session_id,
    timestamp: new Date().toISOString(),
    payload: {
      cwd: input.cwd,
    },
  });

  // Upload transcript if available
  const transcriptDir = path.join(os.homedir(), '.claude', 'projects');
  // The transcript path depends on the project — try the session-specific .jsonl
  // Claude Code stores transcripts at ~/.claude/projects/<project-hash>/<session-id>.jsonl
  // We can't know the exact project hash, so we search for the session file
  const { findTranscript } = await import('../utils/findTranscript');
  const transcriptPath = findTranscript(input.session_id);
  if (transcriptPath) {
    await uploadTranscript(config.baseUrl, config.apiKey, input.session_id, transcriptPath);
  }
}

export async function hook(): Promise<void> {
  const config = readConfig();
  if (!config) {
    process.exit(0);
  }

  const stdinRaw = await readStdin();
  let input: HookInput = { hook_event_name: '', session_id: '' };
  try {
    input = JSON.parse(stdinRaw);
  } catch {
    process.exit(0);
  }

  if (!input.hook_event_name || !input.session_id) {
    process.exit(0);
  }

  switch (input.hook_event_name) {
    case 'SessionStart':
      handleSessionStart(config, input);
      break;
    case 'PostToolUse':
      handlePostToolUse(config, input);
      break;
    case 'PostToolUseFailure':
      handlePostToolUseFailure(config, input);
      break;
    case 'Stop':
      handleStop(config, input);
      break;
    case 'SessionEnd':
      await handleSessionEnd(config, input);
      break;
  }

  // No process.exit() — unref'd sockets let the process exit naturally
  // after data is flushed to the OS buffer. Hook timeout (5s/15s) is the backstop.
}
