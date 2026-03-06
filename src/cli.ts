#!/usr/bin/env node

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'init': {
      const { init } = await import('./commands/init');
      const token = process.argv[3];
      await init(token);
      break;
    }
    case 'collect': {
      const { collect } = await import('./commands/collect');
      await collect();
      break;
    }
    case '--version':
    case '-v': {
      const pkg = require('../package.json');
      console.log(pkg.version);
      break;
    }
    default: {
      console.log('Usage:');
      console.log('  claudetrail init <api-token>   Configure token and Stop hook');
      console.log('  claudetrail collect             Capture and send telemetry (called by Stop hook)');
      console.log('  claudetrail --version           Show version');
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
