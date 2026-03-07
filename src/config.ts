import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.claudetrail');

interface ClaudeTrailConfig {
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = 'https://api.claudetrail.com';

export function readConfig(): ClaudeTrailConfig | null {
  const envKey = process.env.CLAUDETRAIL_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: process.env.CLAUDETRAIL_BASE_URL || DEFAULT_BASE_URL,
    };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const stored = JSON.parse(raw);
    return {
      apiKey: stored.apiKey,
      baseUrl: stored.baseUrl || DEFAULT_BASE_URL,
    };
  } catch {
    return null;
  }
}

export function writeConfig(config: ClaudeTrailConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export { CONFIG_PATH, DEFAULT_BASE_URL };
export type { ClaudeTrailConfig };
