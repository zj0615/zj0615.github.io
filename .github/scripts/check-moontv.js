import fs from 'fs';
import fetch from 'node-fetch';

const inputFile = 'moontv.json';
const outputFile = 'moontv_checked.json';

const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const apiKeys = Object.keys(data.api_site);

console.log(`Checking ${apiKeys.length} APIs...`);

async function checkApi(key) {
  const apiEntry = data.api_site[key];
  try {
    const res = await fetch(apiEntry.api, { timeout: 10000 });
    const text = await res.text();

    try {
      JSON.parse(text);
      delete apiEntry.disabled; // 成功返回 JSON，删除 disabled
      return { key, status: 'OK' };
    } catch {
      apiEntry.disabled = true; // 返回非 JSON
      return { key, status: 'FAIL' };
    }
  } catch (e) {
    apiEntry.disabled = true; // 请求失败
    return { key, status: 'FAIL' };
  }
}

(async () => {
  // 并行检查
  const results = await Promise.allSettled(apiKeys.map(checkApi));
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      console.log(`${r.value.key}: ${r.value.status}`);
    }
  });

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`Done. Saved to ${outputFile}`);
})();
