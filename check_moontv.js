const fs = require('fs');
const fetch = require('node-fetch'); // Node 18+ 内置 fetch，也可直接使用 global fetch

const inputFile = 'moontv.json';
const outputFile = 'moontv_checked.json';
const maxParallel = 20; // 并行数限制

async function checkApi(key, url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 秒超时

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();

    // 判断是否是 JSON
    try {
      JSON.parse(text);
      return { key, status: 'OK' };
    } catch (e) {
      return { key, status: 'FAIL' };
    }
  } catch (err) {
    return { key, status: 'FAIL' };
  }
}

// 并行控制函数
async function parallelLimit(items, limit, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);

    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  const keys = Object.keys(data.api_site);

  const results = await parallelLimit(
    keys,
    maxParallel,
    async (key) => {
      const url = data.api_site[key].api;
      console.log(`Checking ${key}: ${url}`);
      return checkApi(key, url);
    }
  );

  for (const { key, status } of results) {
    if (status === 'FAIL') {
      data.api_site[key].disabled = true;
    } else {
      delete data.api_site[key].disabled;
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`Finished! Output: ${outputFile}`);
}

main();
