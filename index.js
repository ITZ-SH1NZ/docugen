#!/usr/bin/env node
import { runBatch } from './src/batch.js';

// CLI:
//   document-generator --template t.json --csv data.csv \
//                      --output-dir ./output --batch-id batch_20260621_143000
//
// --batch-id is optional; a timestamped id is generated when omitted.

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }
      args[key] = val;
      i++;
    }
  }
  return args;
}

function defaultBatchId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `batch_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const missing = ['template', 'csv', 'output-dir'].filter((k) => !args[k]);
  if (missing.length > 0) {
    console.error(`Missing required argument(s): ${missing.map((m) => `--${m}`).join(', ')}`);
    console.error(
      'Usage: document-generator --template <t.json> --csv <data.csv> ' +
        '--output-dir <dir> [--batch-id <id>]',
    );
    process.exit(2);
  }

  const batchId = args['batch-id'] || defaultBatchId();

  try {
    const metadata = await runBatch({
      templatePath: args.template,
      csvPath: args.csv,
      outputDir: args['output-dir'],
      batchId,
    });
    // Print metadata to stdout so the Node API layer can capture it directly.
    console.log(JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
