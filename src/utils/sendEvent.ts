import * as https from 'https';
import * as url from 'url';

interface ClaudeTrailEvent {
  eventType: string;
  sessionId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function sendEvent(baseUrl: string, apiKey: string, event: ClaudeTrailEvent): void {
  const endpoint = `${baseUrl}/events`;
  const parsed = new url.URL(endpoint);
  const body = JSON.stringify(event);

  const req = https.request({
    hostname: parsed.hostname,
    port: 443,
    path: parsed.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key': apiKey,
    },
  });

  req.on('error', () => {});
  req.on('socket', (socket) => { socket.unref(); });
  req.write(body);
  req.end();
}
