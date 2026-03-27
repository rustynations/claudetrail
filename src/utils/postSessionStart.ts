import * as https from 'https';
import * as url from 'url';

const pkg = require('../../package.json');
const UA = `claudetrail/${pkg.version}`;

interface SessionStartResponse {
  sessionId: string;
  projectId: string | null;
  projectName: string | null;
  projectSource: string | null;
}

export async function postSessionStart(
  baseUrl: string,
  apiKey: string,
  sessionId: string,
  cwd: string,
  model: string,
  source: string,
): Promise<SessionStartResponse> {
  const endpoint = `${baseUrl}/session-start`;
  const parsed = new url.URL(endpoint);
  const body = JSON.stringify({ sessionId, cwd, model, source });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': apiKey,
        'User-Agent': UA,
      },
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`session-start failed: ${res.statusCode} ${responseBody}`));
          return;
        }
        try {
          resolve(JSON.parse(responseBody));
        } catch {
          reject(new Error('Invalid session-start response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
