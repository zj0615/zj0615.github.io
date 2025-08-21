import fs from 'fs';
import axios from 'axios';

const inputFile = 'moontv.json';
const outputFile = 'moontv_checked.json';
const MAX_CONCURRENT = 10;  // 并行数量限制
const TIMEOUT = 20000;      // 超时时间 20 秒
const RETRIES = 2;          // 失败重试次数

const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
const apiKeys = Object.keys(data.api_site);

console.log(`Checking ${apiKeys.length} APIs with max ${MAX_CONCURRENT} concurrent requests...`);

async function checkApi(key) {
  const apiEntry = data.api_site[key];
  const url = apiEntry.api + '/?wd=测试';

  // const referer = apiEntry.detail && apiEntry.detail.startsWith('http') 
  //   ? apiEntry.detail 
  //   : 'https://zj0615.github.io'; // 默认一个合法的 Referer

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await axios.get(url, { timeout: TIMEOUT,
      // headers: {
      //   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
      //   'Accept': 'application/json, text/javascript, */*; q=0.01',
      //   'Accept-Language': 'zh-CN,zh;q=0.9',
      //   // 'Referer': referer, // 一些站点需要 referer
      //   }
      });
      if (typeof res.data === 'object') {
        delete apiEntry.disabled;
        return { key, status: 'OK' };
      } else {
        throw new Error('Response is not JSON');
      }
    } catch (e) {
      if (attempt === RETRIES) {
        // apiEntry.disabled = true;
        // return { key, status: 'FAIL' };
        // 最终失败，标记为删除
        delete data.api_site[key];
        return { key, status: 'DELETED' };
      }
      // 等待 1 秒后重试
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// 控制并行数量
async function parallelCheck(keys, maxConcurrent) {
  const results = [];
  const queue = [...keys];

  async function worker() {
    while (queue.length > 0) {
      const key = queue.shift();
      const result = await checkApi(key);
      console.log(`${result.key}: ${result.status}`);
      results.push(result);
    }
  }

  const workers = Array.from({ length: maxConcurrent }, worker);
  await Promise.all(workers);
  return results;
}

(async () => {
  await parallelCheck(apiKeys, MAX_CONCURRENT);
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
  console.log(`Done. Saved to ${outputFile}`);
})();
