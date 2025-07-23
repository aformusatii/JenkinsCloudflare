const axios = require('axios');
require('dotenv').config();

// Replace with your actual values
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_ZONE_ID = process.env.CF_ZONE_ID;

async function listARecords() {
  const url = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`;

  let page = 1, hasMore = true;
  const aRecords = [];

  while (hasMore) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        params: {
          page,
          per_page: 100,
          type: 'A'
        }
      });

      if (!response.data.success) {
        console.error("API Error:", response.data.errors);
        break;
      }

      aRecords.push(...response.data.result);
      if (page >= response.data.result_info.total_pages) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (err) {
      console.error("Request failed:", err.message);
      break;
    }
  }

  return aRecords;
}

// Run
listARecords()
  .then(records => {
    if (records.length === 0) {
      console.log("No A records found.");
    } else {
      // Select fields you want to display
      const table = records.map(r => ({
        ID: r.id,
        Name: r.name,
        Content: r.content,
        Proxied: r.proxied,
        TTL: r.ttl
      }));

      console.table(table);
    }
  })
  .catch(err => {
    console.error('Error:', err);
  });