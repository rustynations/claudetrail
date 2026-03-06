import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { writeConfig } from '../config';

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

function readSettings(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(settings: Record<string, unknown>): void {
  const dir = path.dirname(CLAUDE_SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

function askConfirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

export async function init(token: string): Promise<void> {
  if (!token) {
    console.error('Usage: claudetrail init <api-token>');
    process.exit(1);
  }

  if (!token.startsWith('ct_')) {
    console.error('Invalid token format. Token should start with "ct_".');
    process.exit(1);
  }

  // Write config
  writeConfig({
    apiKey: token,
    endpoint: 'https://api.claudetrail.com/ingest',
  });
  console.log('Token saved to ~/.claudetrail');

  // Configure Stop hook
  const confirmed = await askConfirm('Add ClaudeTrail Stop hook to Claude Code settings?');
  if (!confirmed) {
    console.log('Skipped hook configuration. Add it manually to your Claude Code settings.');
    return;
  }

  const settings = readSettings();
  const hooks = (settings.hooks || {}) as Record<string, unknown[]>;
  const stopHooks = (hooks.Stop || []) as Record<string, unknown>[];

  // Check if already configured
  const alreadyConfigured = stopHooks.some((h: Record<string, unknown>) => {
    const innerHooks = h.hooks as Record<string, unknown>[];
    return innerHooks?.some((ih) => (ih.command as string)?.includes('claudetrail'));
  });

  if (alreadyConfigured) {
    console.log('ClaudeTrail Stop hook already configured.');
    return;
  }

  stopHooks.push({
    matcher: '',
    hooks: [
      {
        type: 'command',
        command: 'claudetrail collect',
        timeout: 5,
      },
    ],
  });

  hooks.Stop = stopHooks;
  settings.hooks = hooks;
  writeSettings(settings);
  console.log('Stop hook added to Claude Code settings.');
  console.log('ClaudeTrail is now configured.');
}
