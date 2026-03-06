import * as https from 'https';
import * as url from 'url';
import { readConfig, readClaudeJson } from '../config';

interface StopHookInput {
  session_id: string;
  cwd: string;
  stop_hook_active?: boolean;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    // Timeout fallback if no stdin
    setTimeout(() => resolve(data), 1000);
  });
}

function fireAndForget(endpoint: string, apiKey: string, payload: Record<string, unknown>): void {
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

export async function collect(): Promise<void> {
  const config = readConfig();
  if (!config) {
    process.exit(0); // Silently exit if not configured
  }

  const stdinRaw = await readStdin();
  let hookInput: StopHookInput = { session_id: '', cwd: '' };
  try {
    hookInput = JSON.parse(stdinRaw);
  } catch {
    // If stdin isn't valid JSON, still proceed with what we have
  }

  const claudeJson = readClaudeJson();
  if (!claudeJson) {
    process.exit(0); // Silently exit if no .claude.json
  }

  const payload = {
    sessionId: hookInput.session_id,
    cwd: hookInput.cwd,
    claudeJson,
    collectorVersion: '0.1.0',
    collectedAt: new Date().toISOString(),
  };

  fireAndForget(`${config.baseUrl}/ingest`, config.apiKey, payload);
}
