import { readConfig } from '../config';
import { uploadTranscript } from '../utils/uploadTranscript';

interface HookInput {
  hook_event_name: string;
  session_id: string;
  transcript_path?: string;
  [key: string]: unknown;
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

  if (input.hook_event_name !== 'SessionEnd' || !input.session_id) {
    process.exit(0);
  }

  if (input.transcript_path) {
    await uploadTranscript(config.baseUrl, config.apiKey, input.session_id, input.transcript_path);
  }
}
