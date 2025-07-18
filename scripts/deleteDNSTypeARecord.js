const axios = require('axios');

// Simple domain validation, can be improved if needed
function isValidDomain(name) {
    // Max length for DNS names is 253 chars, each label ≤63, no underscores, starts/ends with alphanumeric
    if (name.length > 253) return false;
    // Regex covers a-z, 0-9, hyphens, dots, not starting/ending with hyphen or dot
    return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(name);
}

// Parse CLI args
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith('--')) {
            const [k, ...v] = arg.slice(2).split('=');
            args[k] = v.join('='); // Handles '=' in value
        }
    });
    return args;
}

// Fetch all A records from Cloudflare zone
async function getARecords(zoneId, token) {
    let records = [];
    let page = 1;
    while (true) {
        const res = await axios.get(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { type: 'A', per_page: 100, page }
            }
        );
        if (!res.data.success) {
            throw new Error('Failed to fetch DNS records');
        }
        records = records.concat(res.data.result);
        const info = res.data.result_info;
        if (info.page >= info.total_pages) break;
        page++;
    }
    return records; // Array of records (objects)
}

async function deleteDNSRecord(zoneId, recordId, token) {
    try {
        const res = await axios.delete(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data.success;
    } catch (error) {
        return false;
    }
}

async function main() {
    const args = parseArgs();
    // Allow env fallback
    const zoneId = args.zone || process.env.CF_ZONE_ID;
    const token = args.token || process.env.CF_API_TOKEN;
    const names = args.names || process.env.A_RECORD_NAMES;

    if (!zoneId || !token || !names) {
        console.error("Usage: node cloudflare-delete-a.js --zone=<zone_id> --token=<api_token> --names=www.example.com,api.example.com");
        process.exit(1);
    }

    // Parse and validate record names
    const nameList = names.split(',').map(s => s.trim()).filter(Boolean);
    for (const name of nameList) {
        if (!isValidDomain(name)) {
            console.error(`Invalid domain name: ${name}`);
            process.exit(1);
        }
    }

    // Fetch all A records (needed to get record ID)
    let aRecords;
    try {
        aRecords = await getARecords(zoneId, token);
    } catch (err) {
        console.error("Failed to get existing A records:", err.message);
        process.exit(1);
    }

    // Go over each name and delete all matching A records
    for (const name of nameList) {
        const matches = aRecords.filter(r => r.name.toLowerCase() === name.toLowerCase());
        if (matches.length === 0) {
            console.log(`No A record found for name: ${name} (nothing to delete)`);
            continue;
        }
        for (const record of matches) {
            const deleted = await deleteDNSRecord(zoneId, record.id, token);
            if (deleted) {
                console.log(`Deleted A record '${name}' (id: ${record.id})`);
            } else {
                console.error(`Failed to delete A record '${name}' (id: ${record.id})`);
            }
        }
    }
}

main();