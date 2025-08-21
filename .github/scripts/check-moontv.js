// check-moontv.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const inputFile = 'moontv.json';
const outputFile = 'moontv_checked.json';

// 读取原始 JSON
const rawData = fs.readFileSync(inputFile, 'utf-8');
const data = JSON.parse(rawData);

const apiKeys = Object.keys(data.api_site);

// 并行检测
async function checkApi(key) {
  const apiInfo = data.api_site[key];
  const url = apiInfo.api + '/?wd=测试';

  try {
    const res = await axios.get(url, { timeout: 10000 });
    // 尝试解析 JSON
    if (typeof res.data === 'object') {
      // 删除 disabled
      delete data.api_site[key].disabled;
      console.log(`${key} OK`);
    } else {
      // 返回非 JSON
      data.api_site[key].disabled = true;
      console.log(`${key} FAIL (non-JSON response)`);
    }
  } catch (err) {
    // 请求失败
    data.api_site[key].disabled = true;
    console.log(`${key} FAIL (${err.message})`);
  }
}

async function main() {
  await Promise.allSettled(apiKeys.map(checkApi));

  // 写入新文件
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Done! Results saved to ${outputFile}`);
}

main();
