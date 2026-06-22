// Smoke test: regenerate the sample template, run a batch over the test
// fixtures, and assert the headline metadata is sane.
import { rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runBatch } from '../src/batch.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'output');
const batchId = 'batch_test_001';

// Ensure the sample template exists.
try {
  await access(join(root, 'test', 'certificate_template.pdf'));
} catch {
  await import('./make-sample-template.js');
}

await rm(join(outputDir, batchId), { recursive: true, force: true });

const meta = await runBatch({
  templatePath: join(root, 'test', 'test_template.json'),
  csvPath: join(root, 'test', 'test_data.csv'),
  outputDir,
  batchId,
});

const checks = [
  ['total_rows is 5', meta.total_rows === 5],
  ['generated_count is 5', meta.generated_count === 5],
  ['all 5 rows present', meta.all_rows.length === 5],
  ['at least 1 flagged row', meta.flagged_count >= 1],
  ['flagged rows match flagged_count', meta.flagged_rows.length === meta.flagged_count],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}

console.log(`\nOutput: ${meta.output_dir}`);
process.exit(failed === 0 ? 0 : 1);
