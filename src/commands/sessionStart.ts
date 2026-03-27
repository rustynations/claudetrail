import { readConfig } from '../config';
import { postSessionStart } from '../utils/postSessionStart';
import { log } from '../utils/log';

export async function sessionStart(
  sessionId: string,
  cwd: string,
  model: string,
  source: string,
): Promise<void> {
  log('session-start', `started session=${sessionId} cwd=${cwd} model=${model} source=${source}`);

  const config = readConfig();
  if (!config) {
    log('session-start', 'no config found, exiting');
    process.exit(1);
  }

  try {
    const t0 = Date.now();
    const result = await postSessionStart(config.baseUrl, config.apiKey, sessionId, cwd, model, source);
    const ms = Date.now() - t0;

    if (result.projectId) {
      log('session-start', `OK in ${ms}ms — matched project "${result.projectName}" (${result.projectId})`);
    } else {
      log('session-start', `OK in ${ms}ms — no project match`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('session-start', `FAILED: ${msg}`);
  }
}
