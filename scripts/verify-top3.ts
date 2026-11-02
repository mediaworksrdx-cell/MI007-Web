import fs from 'fs';

const res = JSON.parse(fs.readFileSync('scripts/top3-metrics-result.json', 'utf8'));

const testKeys = [4, 11, 15, 16, 17, 19, 20, 21, 24, 32, 34, 35, 36, 49];
for (const num of testKeys) {
  const m = res.find((x: any) => x.num === num);
  if (!m) continue;
  console.log(`=== Metric ${m.num}: ${m.label} (${m.key}) ===`);
  console.log(`  Liquid:   ${m.liquidTop3.map((x: any) => `${x.symbol} (${x.formatted})`).join(', ')}`);
  console.log(`  Universe: ${m.universeTop3.map((x: any) => `${x.symbol} (${x.formatted})`).join(', ')}`);
}
