import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { writeConfig, DEFAULT_BASE_URL } from '../config';
import { log } from '../utils/log';

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

function configureOtelSettings(apiKey: string, baseUrl: string): void {
  const settings = readSettings();

  // Set OTel env vars in Claude Code settings
  const env = (settings.env || {}) as Record<string, string>;
  env['CLAUDE_CODE_ENABLE_TELEMETRY'] = '1';
  env['OTEL_METRICS_EXPORTER'] = 'otlp';
  env['OTEL_LOGS_EXPORTER'] = 'otlp';
  env['OTEL_EXPORTER_OTLP_PROTOCOL'] = 'http/json';
  env['OTEL_EXPORTER_OTLP_ENDPOINT'] = `${baseUrl}/otlp`;
  env['OTEL_EXPORTER_OTLP_HEADERS'] = `x-api-key=${apiKey}`;
  env['OTEL_LOG_USER_PROMPTS'] = '1';
  env['OTEL_LOG_TOOL_DETAILS'] = '1';
  settings.env = env;

  // Configure hooks
  const hooks = (settings.hooks || {}) as Record<string, unknown[]>;
  const sessionEndEntries = (hooks['SessionEnd'] || []) as Record<string, unknown>[];

  const hasClaudetrail = sessionEndEntries.some((entry) => {
    const innerHooks = entry.hooks as Record<string, unknown>[];
    return innerHooks?.some((h) => (h.command as string)?.includes('claudetrail'));
  });

  if (!hasClaudetrail) {
    sessionEndEntries.push({
      matcher: '',
      hooks: [{
        type: 'command',
        command: 'claudetrail hook',
        timeout: 120,
      }],
    });
  }

  hooks['SessionEnd'] = sessionEndEntries;

  // Configure SessionStart hook
  const sessionStartEntries = (hooks['SessionStart'] || []) as Record<string, unknown>[];

  const hasSessionStartClaudetrail = sessionStartEntries.some((entry) => {
    const innerHooks = entry.hooks as Record<string, unknown>[];
    return innerHooks?.some((h) => (h.command as string)?.includes('claudetrail'));
  });

  if (!hasSessionStartClaudetrail) {
    sessionStartEntries.push({
      matcher: '',
      hooks: [{
        type: 'command',
        command: 'claudetrail hook',
        timeout: 60,
      }],
    });
  }

  hooks['SessionStart'] = sessionStartEntries;
  settings.hooks = hooks;

  writeSettings(settings);
}

export async function init(token: string): Promise<void> {
  log('init', 'started');

  if (!token) {
    console.error('Usage: claudetrail init <api-token>');
    process.exit(1);
  }

  if (!token.startsWith('ct_')) {
    console.error('Invalid token format. Token should start with "ct_".');
    process.exit(1);
  }

  // Write config for transcript upload
  writeConfig({ apiKey: token, baseUrl: DEFAULT_BASE_URL });
  log('init', 'config written to ~/.claudetrail');
  console.log('Token saved to ~/.claudetrail');

  // Configure Claude Code OTel settings + SessionEnd hook
  configureOtelSettings(token, DEFAULT_BASE_URL);
  log('init', 'claude settings configured');
  console.log('Claude Code configured:');
  console.log('  - OpenTelemetry → api.claudetrail.com/otlp');
  console.log('  - SessionStart hook → auto-project assignment');
  console.log('  - SessionEnd hook → transcript upload');
  console.log('');
  console.log('ClaudeTrail is ready. Start a Claude Code session to begin collecting data.');

  log('init', 'finished');
}

// Export for upgrade command
export { configureOtelSettings };
