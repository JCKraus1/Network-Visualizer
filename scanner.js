#!/usr/bin/env node
/**
 * Home Network Visualizer — Local Scanner
 *
 * Run this script on a computer that is connected to your home network:
 *   node scanner.js
 *
 * It will ping-sweep your subnet, read the ARP table, look up device
 * vendors from MAC addresses, and print a JSON array to stdout.
 *
 * Redirect to a file and then import into the app:
 *   node scanner.js > my-network.json
 */

'use strict';

const { execSync, exec } = require('child_process');
const dns = require('dns');
const os = require('os');

const IS_WIN = process.platform === 'win32';

// ── Local network info ─────────────────────────────────────────────────────
function getNetworkInfo() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        const subnet = parts.slice(0, 3).join('.');
        return { myIp: iface.address, subnet };
      }
    }
  }
  return { myIp: '192.168.1.2', subnet: '192.168.1' };
}

// ── Get default gateway IP ─────────────────────────────────────────────────
function getGateway(subnet) {
  try {
    if (IS_WIN) {
      const out = execSync('ipconfig', { encoding: 'utf8' });
      const m = out.match(/Default Gateway[^:]*:\s*([\d.]+)/);
      return m ? m[1] : `${subnet}.1`;
    } else {
      const out = execSync('netstat -nr 2>/dev/null || ip route 2>/dev/null', {
        encoding: 'utf8',
        shell: true,
      });
      const m = out.match(/(?:default|0\.0\.0\.0)[^\n]*?([\d.]+)/);
      return m ? m[1] : `${subnet}.1`;
    }
  } catch {
    return `${subnet}.1`;
  }
}

// ── MAC → vendor OUI table ─────────────────────────────────────────────────
const OUI = {
  // Apple
  '00:03:93':'Apple','00:0a:95':'Apple','00:0d:93':'Apple','00:11:24':'Apple',
  '00:14:51':'Apple','00:16:cb':'Apple','00:17:f2':'Apple','00:19:e3':'Apple',
  '00:1b:63':'Apple','00:1c:b3':'Apple','00:1d:4f':'Apple','00:1e:52':'Apple',
  '00:1f:5b':'Apple','00:1f:f3':'Apple','00:21:e9':'Apple','00:22:41':'Apple',
  '00:23:12':'Apple','00:23:32':'Apple','00:23:6c':'Apple','00:24:36':'Apple',
  '00:25:00':'Apple','00:25:4b':'Apple','00:25:bc':'Apple','00:26:08':'Apple',
  '00:26:4a':'Apple','00:26:b9':'Apple','00:26:bb':'Apple','a4:c3:61':'Apple',
  '8c:85:90':'Apple','f0:b4:79':'Apple','f4:f1:5a':'Apple','d0:81:7a':'Apple',
  '3c:06:30':'Apple','70:ec:e4':'Apple','ac:de:48':'Apple','bc:d0:74':'Apple',
  // Samsung
  '00:07:ab':'Samsung','00:12:47':'Samsung','00:15:b9':'Samsung',
  '00:17:d5':'Samsung','00:1a:8a':'Samsung','00:1b:98':'Samsung',
  '00:1c:43':'Samsung','00:1d:25':'Samsung','00:1e:7d':'Samsung',
  '00:1f:cc':'Samsung','00:21:4c':'Samsung','00:23:39':'Samsung',
  '00:24:54':'Samsung','00:26:37':'Samsung','a0:0b:ba':'Samsung',
  '8c:c8:cd':'Samsung','50:85:69':'Samsung','c8:14:79':'Samsung',
  // Google / Nest / Chromecast
  '00:1a:11':'Google','54:60:09':'Google','f4:f5:d8':'Google',
  '28:6f:b9':'Google','48:d6:d5':'Google','3c:5a:b4':'Google',
  '7c:2e:bd':'Google','a4:77:33':'Google','f4:f5:e8':'Google',
  '58:cb:52':'Google','20:df:b9':'Google','d4:3a:2e':'Google',
  'b4:bd:c9':'Nest','18:b4:30':'Nest','64:16:66':'Nest',
  // Amazon
  '40:b4:cd':'Amazon','74:c2:46':'Amazon','34:d2:70':'Amazon',
  'a0:02:dc':'Amazon','b4:7c:9c':'Amazon','fc:a6:67':'Amazon',
  '44:65:0d':'Amazon','18:74:2e':'Amazon','f0:27:2d':'Amazon',
  'a4:08:f5':'Amazon','68:54:fd':'Amazon','f8:04:2e':'Amazon',
  // Sony
  '00:01:4a':'Sony','00:04:1f':'Sony','00:13:a9':'Sony',
  '00:15:c1':'Sony','00:1a:80':'Sony','00:1d:0d':'Sony',
  '00:23:06':'Sony','28:3f:69':'Sony','ac:9b:0a':'Sony',
  'fc:0f:e6':'Sony','70:26:05':'Sony',
  // Nintendo
  '00:09:bf':'Nintendo','00:17:ab':'Nintendo','00:19:1d':'Nintendo',
  '00:1a:e9':'Nintendo','00:1b:ea':'Nintendo','00:1c:be':'Nintendo',
  '00:1d:bc':'Nintendo','00:1e:35':'Nintendo','00:1f:32':'Nintendo',
  '7c:bb:8a':'Nintendo','98:b6:e9':'Nintendo','a4:c0:e1':'Nintendo',
  // Microsoft / Xbox
  '00:03:ff':'Microsoft','00:12:5a':'Microsoft','00:15:5d':'Microsoft',
  '00:17:fa':'Microsoft','00:1d:d8':'Microsoft','00:22:48':'Microsoft',
  '28:18:78':'Microsoft','60:45:bd':'Microsoft','7c:ed:8d':'Microsoft',
  // Raspberry Pi
  'b8:27:eb':'Raspberry Pi','dc:a6:32':'Raspberry Pi','e4:5f:01':'Raspberry Pi',
  'd8:3a:dd':'Raspberry Pi',
  // Netgear
  '00:09:5b':'Netgear','00:0f:b5':'Netgear','00:14:6c':'Netgear',
  '00:18:4d':'Netgear','00:1b:2f':'Netgear','00:1e:2a':'Netgear',
  '00:22:3f':'Netgear','00:24:b2':'Netgear','00:26:f2':'Netgear',
  '20:4e:7f':'Netgear','2c:b0:5d':'Netgear','a0:40:a0':'Netgear',
  // TP-Link
  '00:1d:0f':'TP-Link','14:cc:20':'TP-Link','18:d6:c7':'TP-Link',
  '1c:61:b4':'TP-Link','50:c7:bf':'TP-Link','54:e6:fc':'TP-Link',
  '60:a4:4c':'TP-Link','70:4f:57':'TP-Link','90:f6:52':'TP-Link',
  'ac:84:c6':'TP-Link','b0:95:75':'TP-Link','c4:e9:84':'TP-Link',
  'e8:48:b8':'TP-Link','f0:a7:31':'TP-Link',
  // Eero
  'f8:1a:67':'Eero','20:f0:f6':'Eero','30:45:96':'Eero',
  // Ubiquiti
  '00:15:6d':'Ubiquiti','04:18:d6':'Ubiquiti','24:a4:3c':'Ubiquiti',
  '44:d9:e7':'Ubiquiti','68:72:51':'Ubiquiti','78:8a:20':'Ubiquiti',
  '80:2a:a8':'Ubiquiti','b4:fb:e4':'Ubiquiti','dc:9f:db':'Ubiquiti',
  'f0:9f:c2':'Ubiquiti',
  // Cisco / Linksys
  '00:03:6b':'Cisco','00:0b:46':'Cisco','00:0e:84':'Cisco',
  '00:13:5f':'Cisco','00:14:69':'Cisco','00:17:59':'Cisco',
  '00:1a:2f':'Cisco','00:1b:d4':'Cisco','3c:ce:73':'Cisco',
  // ASUS
  '00:11:2f':'Asus','00:13:d4':'Asus','00:15:f2':'Asus',
  '00:1a:92':'Asus','00:1b:fc':'Asus','00:1d:60':'Asus',
  '00:1e:8c':'Asus','10:bf:48':'Asus','50:46:5d':'Asus',
  'ac:22:0b':'Asus','b0:6e:bf':'Asus','d8:50:e6':'Asus',
  // Ring
  'b0:09:da':'Ring','1c:e5:56':'Ring','00:2a:9a':'Ring','78:d2:94':'Ring',
  // Philips Hue
  '00:17:88':'Philips','ec:b5:fa':'Philips',
  // Sonos
  '00:0e:58':'Sonos','34:7e:5c':'Sonos','48:a6:b8':'Sonos',
  '5c:aa:fd':'Sonos','78:28:ca':'Sonos','94:9f:3e':'Sonos',
  'b8:e9:37':'Sonos',
  // Synology
  '00:11:32':'Synology',
  // Arris (ISP modems)
  '00:26:b8':'Arris','00:90:d0':'Arris','20:24:90':'Arris',
  // Chamberlain (garage)
  '00:90:2d':'Chamberlain',
};

function lookupVendor(mac) {
  const norm = mac.toLowerCase().replace(/-/g, ':');
  return OUI[norm.slice(0, 8)] || null;
}

// ── Guess type and category ────────────────────────────────────────────────
function guessDevice(vendor, hostname) {
  const v = (vendor || '').toLowerCase();
  const h = (hostname || '').toLowerCase();

  const is = (...words) => words.some(w => h.includes(w));

  if (v === 'apple') {
    if (is('iphone')) return { type: 'phone', category: 'mobile' };
    if (is('ipad')) return { type: 'tablet', category: 'mobile' };
    if (is('macbook')) return { type: 'laptop', category: 'computer' };
    if (is('imac', 'mac-pro', 'mac-mini', 'macpro', 'macmini')) return { type: 'desktop', category: 'computer' };
    if (is('apple-tv', 'appletv')) return { type: 'streaming-stick', category: 'entertainment' };
    if (is('homepod')) return { type: 'smart-speaker', category: 'smart-home' };
    return { type: 'phone', category: 'mobile' }; // most common Apple device
  }
  if (v === 'samsung') {
    if (is('tv', 'smart-tv', 'display')) return { type: 'tv', category: 'entertainment' };
    if (is('fridge', 'washer', 'appliance')) return { type: 'iot-appliance', category: 'smart-home' };
    return { type: 'phone', category: 'mobile' };
  }
  if (v === 'google') {
    if (is('chromecast', 'cast')) return { type: 'streaming-stick', category: 'entertainment' };
    return { type: 'smart-speaker', category: 'smart-home' };
  }
  if (v === 'nest') return { type: 'iot-thermostat', category: 'smart-home' };
  if (v === 'amazon') {
    if (is('fire', 'firetv')) return { type: 'streaming-stick', category: 'entertainment' };
    return { type: 'smart-speaker', category: 'smart-home' };
  }
  if (v === 'sony') {
    if (is('ps', 'playstation')) return { type: 'gaming-console', category: 'entertainment' };
    return { type: 'tv', category: 'entertainment' };
  }
  if (v === 'nintendo') return { type: 'gaming-console', category: 'entertainment' };
  if (v === 'microsoft') {
    if (is('xbox')) return { type: 'gaming-console', category: 'entertainment' };
    return { type: 'desktop', category: 'computer' };
  }
  if (v === 'raspberry pi') return { type: 'server', category: 'computer' };
  if (v === 'ring') return { type: 'iot-camera', category: 'smart-home' };
  if (v === 'philips') return { type: 'iot-light', category: 'smart-home' };
  if (v === 'sonos') return { type: 'smart-speaker', category: 'smart-home' };
  if (v === 'synology') return { type: 'nas', category: 'computer' };
  if (['netgear','tp-link','eero','ubiquiti','cisco','asus','arris'].includes(v)) {
    return { type: 'router', category: 'network' };
  }
  if (v === 'chamberlain') return { type: 'iot-sensor', category: 'smart-home' };

  // Hostname clues
  if (is('tv', 'television')) return { type: 'tv', category: 'entertainment' };
  if (is('iphone', 'android', 'pixel')) return { type: 'phone', category: 'mobile' };
  if (is('ipad', 'tablet')) return { type: 'tablet', category: 'mobile' };
  if (is('laptop', 'macbook', 'book', 'thinkpad', 'xps')) return { type: 'laptop', category: 'computer' };
  if (is('desktop', 'workstation', 'imac', 'tower')) return { type: 'desktop', category: 'computer' };
  if (is('printer', 'print', 'laserjet', 'inkjet')) return { type: 'printer', category: 'peripheral' };
  if (is('nas', 'synology', 'qnap', 'storage')) return { type: 'nas', category: 'computer' };
  if (is('cam', 'camera', 'doorbell', 'ring')) return { type: 'iot-camera', category: 'smart-home' };
  if (is('thermostat', 'nest', 'ecobee')) return { type: 'iot-thermostat', category: 'smart-home' };
  if (is('echo', 'alexa', 'homepod', 'speaker', 'sonos')) return { type: 'smart-speaker', category: 'smart-home' };
  if (is('hue', 'light', 'bulb', 'lifx')) return { type: 'iot-light', category: 'smart-home' };
  if (is('router', 'gateway', 'modem', 'eero', 'orbi', 'mesh')) return { type: 'router', category: 'network' };
  if (is('switch', 'hub')) return { type: 'switch', category: 'network' };
  if (is('xbox', 'ps4', 'ps5', 'playstation', 'nintendo', 'switch')) return { type: 'gaming-console', category: 'entertainment' };
  if (is('raspberry', 'pi')) return { type: 'server', category: 'computer' };

  return { type: 'phone', category: 'mobile' }; // unknown — user can fix it
}

// ── Parse ARP table (cross-platform) ──────────────────────────────────────
function readArpTable() {
  try {
    const raw = execSync('arp -a', { encoding: 'utf8' });
    const found = [];
    for (const line of raw.split('\n')) {
      // macOS/Linux: `name (1.2.3.4) at aa:bb:cc:dd:ee:ff ...`
      // Windows:     `  1.2.3.4     aa-bb-cc-dd-ee-ff  dynamic`
      const m1 = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]{17})/i);
      const m2 = !m1 && line.match(/^\s+(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]{17})/i);
      const m = m1 || m2;
      if (!m) continue;
      const ip = m[1];
      const mac = m[2].replace(/-/g, ':').toUpperCase();
      if (mac === 'FF:FF:FF:FF:FF:FF') continue;
      if (ip.endsWith('.255') || ip === '255.255.255.255') continue;
      const hostname = m1 ? (line.split(' ')[0] === '?' ? '' : line.split(' ')[0]) : '';
      found.push({ ip, mac, hostname });
    }
    return found;
  } catch {
    return [];
  }
}

// ── Ping sweep to wake up ARP table ───────────────────────────────────────
function pingSweep(subnet) {
  log(`Pinging ${subnet}.1-254 (this takes ~15s) ...`);
  return new Promise(resolve => {
    let done = 0;
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      const cmd = IS_WIN ? `ping -n 1 -w 300 ${ip}` : `ping -c 1 -W 1 ${ip}`;
      exec(cmd, () => { if (++done === 254) resolve(); });
    }
  });
}

// ── Reverse DNS ────────────────────────────────────────────────────────────
function reverseDns(ip) {
  return new Promise(resolve => {
    dns.reverse(ip, (err, hosts) => {
      resolve(!err && hosts && hosts[0] ? hosts[0].replace(/\.$/, '') : '');
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function log(msg) { process.stderr.write(msg + '\n'); }

function friendlyName(hostname, vendor, ip) {
  if (hostname) {
    const short = hostname.split('.')[0];
    // Replace hyphens/underscores with spaces, title-case words
    return short
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  if (vendor) return `${vendor} Device`;
  return `Device ${ip.split('.')[3]}`;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const { myIp, subnet } = getNetworkInfo();
  const gateway = getGateway(subnet);

  log(`Your IP  : ${myIp}`);
  log(`Subnet   : ${subnet}.0/24`);
  log(`Gateway  : ${gateway}`);
  log('');

  await pingSweep(subnet);
  await new Promise(r => setTimeout(r, 1500)); // let ARP settle

  const arpRows = readArpTable();
  log(`Found ${arpRows.length} device(s) in ARP table.`);
  log('Resolving hostnames ...');

  const gatewayId = `device-${gateway.replace(/\./g, '-')}`;
  const devices = [];

  for (const row of arpRows) {
    const hostname = row.hostname || (await reverseDns(row.ip));
    const vendor = lookupVendor(row.mac);
    const isGateway = row.ip === gateway;

    let type, category;
    if (isGateway) {
      type = 'router';
      category = 'network';
    } else {
      ({ type, category } = guessDevice(vendor, hostname));
    }

    devices.push({
      id: `device-${row.mac.replace(/:/g, '')}`,
      name: isGateway ? 'Home Router' : friendlyName(hostname, vendor, row.ip),
      type,
      category,
      room: 'Unassigned',
      ip: row.ip,
      mac: row.mac,
      status: 'online',
      connectedTo: isGateway ? [] : [gatewayId],
      brand: vendor || undefined,
      bandwidth: 0,
    });
    log(`  ${row.ip.padEnd(16)} ${row.mac}  ${(vendor || 'Unknown').padEnd(14)} ${hostname || ''}`);
  }

  // Sort by last IP octet
  devices.sort((a, b) => {
    const al = parseInt(a.ip.split('.').pop() ?? '0');
    const bl = parseInt(b.ip.split('.').pop() ?? '0');
    return al - bl;
  });

  log('');
  log(`Done — ${devices.length} device(s) found.`);
  log('Import the JSON below into the app (Settings → Import Scan).');
  log('─'.repeat(60));

  process.stdout.write(JSON.stringify(devices, null, 2) + '\n');
}

main().catch(err => { log(`Error: ${err.message}`); process.exit(1); });
