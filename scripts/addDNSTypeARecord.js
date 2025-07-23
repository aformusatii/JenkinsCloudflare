const axios = require('axios');
const { argv } = require('process');
require('dotenv').config();

// Helper to parse command line or environment
function parseArgs() {
    const args = {};
    argv.slice(2).forEach(arg => {
        if(arg.startsWith('--')) {
            const [key, val] = arg.slice(2).split('=');
            args[key] = val;
        }
    });
    return args;
}

// DNS name and IPv4 validation
function isValidDomain(name) {
    // Max length 253, labels 63, only a-z0-9- (no _), no trailing dot
    if (name.length > 253) return false;
    if (name.endsWith('.')) return false;
    const labels = name.split('.');
    if (labels.some(l => l.length === 0 || l.length > 63)) return false;
    return /^[a-zA-Z0-9.-]+$/.test(name);
}

function isValidIPv4(ip) {
    return /^(25[0-5]|2[0-4][0-9]|1?\d{1,2})(\.(25[0-5]|2[0-4][0-9]|1?\d{1,2})){3}$/.test(ip);
}

// Cloudflare API features:
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

async function getDNSRecords(zone_id, token, type = 'A') {
    let records = [];
    let page = 1;
    while (true) {
        const resp = await axios.get(
            `${CF_API_BASE}/zones/${zone_id}/dns_records`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: { type, per_page: 100, page }
            }
        );
        if (!resp.data.success) throw new Error("Failed to get records");
        records = records.concat(resp.data.result);
        if (resp.data.result_info.page >= resp.data.result_info.total_pages) break;
        page++;
    }
    return records;
}

async function createARecord(zone_id, token, name, content) {
    const resp = await axios.post(
        `${CF_API_BASE}/zones/${zone_id}/dns_records`,
        { type: 'A', name, content, ttl: 1, proxied: false },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data.success;
}

async function updateARecord(zone_id, token, record_id, name, content) {
    const resp = await axios.put(
        `${CF_API_BASE}/zones/${zone_id}/dns_records/${record_id}`,
        { type: 'A', name, content, ttl: 1, proxied: false },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return resp.data.success;
}

async function main() {
    const args = parseArgs();

    const names = args.names;
    const value = args.value;

    // Allow env fallback
    const zone = args.zone || process.env.CF_ZONE_ID;
    const token = args.token || process.env.CF_API_TOKEN;

    if (!zone || !token || !names || !value) {
        console.error("Usage: --zone=<zone_id> --names=host1,host2 --value=IP");
        process.exit(1);
    }

    const aNames = names.split(',').map(n => n.trim()).filter(Boolean);
    if (aNames.length === 0) {
        console.error("No valid names input");
        process.exit(1);
    }

    // Validate IP
    if (!isValidIPv4(value)) {
        console.error(`Invalid IPv4 address: ${value}`);
        process.exit(1);
    }

    // Validate names
    for (const a of aNames) {
        if (!isValidDomain(a)) {
            console.error(`Invalid record name: ${a}`);
            process.exit(1);
        }
    }

    // Get all A records
    let records;
    try {
        records = await getDNSRecords(zone, token, 'A');
    } catch (e) {
        console.error("Failed to fetch DNS records:", e.message);
        process.exit(1);
    }

    // Logic for upsert
    for (const name of aNames) {
        const existing = records.find(r => {
            return r.name.startsWith(name + '.');
        });

        if (existing) {
            if (existing.content === value) {
                console.log(`Record "${name}" already set to ${value}, no update needed.`);
            } else {
                // Update
                try {
                    const ok = await updateARecord(zone, token, existing.id, name, value);
                    if (ok) console.log(`Updated record "${name}" to value ${value}.`);
                    else throw new Error();
                } catch (e) {
                    console.error(`Failed to update record "${name}":`, e.message);
                }
            }
        } else {
            // Create
            try {
                const ok = await createARecord(zone, token, name, value);
                if (ok) console.log(`Created record "${name}" with value ${value}.`);
                else throw new Error();
            } catch (e) {
                console.error(`Failed to create record "${name}":`, e.message);
            }
        }
    }
}

main();