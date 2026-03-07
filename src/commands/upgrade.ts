import { readConfig } from '../config';
import { configureOtelSettings } from './init';

export async function upgrade(): Promise<void> {
  const config = readConfig();
  if (!config) {
    console.error('ClaudeTrail is not configured. Run "claudetrail init <api-token>" first.');
    process.exit(1);
  }

  configureOtelSettings(config.apiKey, config.baseUrl);
  console.log('Upgraded to OTel mode:');
  console.log('  - OpenTelemetry → api.claudetrail.com/otlp');
  console.log('  - SessionEnd hook → transcript upload');
}
