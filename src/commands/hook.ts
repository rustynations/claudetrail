import { spawn } from 'child_process';
import { log } from '../utils/log';

interface HookInput {
  hook_event_name: string;
  session_id: string;
  transcript_path?: string;
  cwd?: string;
  model?: string;
  source?: string;
  [key: string]: unknown;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

export async function hook(): Promise<void> {
  log('hook', 'started');

  const stdinRaw = await readStdin();
  let input: HookInput = { hook_event_name: '', session_id: '' };
  try {
    input = JSON.parse(stdinRaw);
  } catch {
    log('hook', `stdin parse failed, raw length=${stdinRaw.length}`);
    process.exit(0);
  }

  log('hook', `event=${input.hook_event_name} session=${input.session_id} cwd=${input.cwd ?? 'none'}`);

  if (!input.session_id) {
    log('hook', 'no session_id, exiting');
    process.exit(0);
  }

  if (input.hook_event_name === 'SessionStart') {
    // Spawn detached session-start process
    const args = [
      require.resolve('../cli'),
      'session-start',
      input.session_id,
      input.cwd || '',
      input.model || '',
      input.source || 'startup',
    ];
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    log('hook', `spawned session-start process pid=${child.pid}`);
  } else if (input.hook_event_name === 'SessionEnd') {
    if (input.transcript_path) {
      const child = spawn(process.execPath, [
        require.resolve('../cli'),
        'upload',
        input.session_id,
        input.transcript_path,
      ], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      log('hook', `spawned upload process pid=${child.pid}`);
    } else {
      log('hook', 'no transcript_path in input, skipping upload');
    }
  } else {
    log('hook', `unhandled event: ${input.hook_event_name}, exiting`);
  }

  log('hook', 'finished');
}
