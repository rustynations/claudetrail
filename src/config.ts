import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.claudetrail');
const CLAUDE_JSON_PATH = path.join(os.homedir(), '.claude.json');

interface ClaudeTrailConfig {
  apiKey: string;
  endpoint: string;
}

export function readConfig(): ClaudeTrailConfig | null {
  const envKey = process.env.CLAUDETRAIL_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      endpoint: process.env.CLAUDETRAIL_ENDPOINT || 'https://api.claudetrail.com/ingest',
    };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as ClaudeTrailConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: ClaudeTrailConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function readClaudeJson(): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export { CONFIG_PATH, CLAUDE_JSON_PATH };
