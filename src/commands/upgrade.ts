import { readConfig } from '../config';
import { configureOtelSettings } from './init';
import { log } from '../utils/log';

export async function upgrade(): Promise<void> {
  log('upgrade', 'started');

  const config = readConfig();
  if (!config) {
    console.error('ClaudeTrail is not configured. Run "claudetrail init <api-token>" first.');
    process.exit(1);
  }

  configureOtelSettings(config.apiKey, config.baseUrl);
  log('upgrade', 'settings reconfigured');
  console.log('Upgraded to OTel mode:');
  console.log('  - OpenTelemetry → api.claudetrail.com/otlp');
  console.log('  - SessionStart hook → auto-project assignment');
  console.log('  - SessionEnd hook → transcript upload');

  log('upgrade', 'finished');
}
