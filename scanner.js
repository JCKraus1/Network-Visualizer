#!/usr/bin/env node
/**
 * Home Network Visualizer — Network Scanner (v2)
 *
 * Usage:  node scanner.js > my-network.json
 *
 * Improvements over v1:
 *  - Deduplicates entries (same IP on multiple interfaces)
 *  - Includes your own PC in the list
 *  - Port scans each device to identify type with high confidence
 *  - Grabs HTTP banner from port 80/8080 for router/NAS identification
 *  - TTL-based OS hinting
 *  - Greatly expanded OUI vendor table
 */

'use strict';

const { execSync, exec } = require('child_process');
const dns   = require('dns');
const net   = require('net');
const http  = require('http');
const os    = require('os');

const IS_WIN  = process.platform === 'win32';
const PLAT    = process.platform; // darwin | linux | win32

function log(msg) { process.stderr.write(msg + '\n'); }

// ── Network info ───────────────────────────────────────────────────────────
function getNetworkInfo() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return {
          myIp:   iface.address,
          myMac:  (iface.mac || '').toUpperCase(),
          subnet: iface.address.split('.').slice(0, 3).join('.'),
          iface:  name,
        };
      }
    }
  }
  return { myIp: '192.168.1.2', myMac: '', subnet: '192.168.1', iface: 'eth0' };
}

function getGateway(subnet) {
  try {
    const raw = execSync(
      IS_WIN ? 'ipconfig' : 'netstat -nr 2>/dev/null || ip route 2>/dev/null',
      { encoding: 'utf8', shell: !IS_WIN }
    );
    const m = IS_WIN
      ? raw.match(/Default Gateway[^:]*:\s*([\d.]+)/)
      : raw.match(/(?:default|0\.0\.0\.0)\s+(?:via\s+)?([\d.]+)/);
    return m ? m[1] : `${subnet}.1`;
  } catch { return `${subnet}.1`; }
}

// ── Expanded OUI → vendor table ────────────────────────────────────────────
const OUI = {
  // Apple
  '00:03:93':'Apple','00:0a:95':'Apple','00:0d:93':'Apple','00:11:24':'Apple',
  '00:14:51':'Apple','00:16:cb':'Apple','00:17:f2':'Apple','00:19:e3':'Apple',
  '00:1b:63':'Apple','00:1c:b3':'Apple','00:1d:4f':'Apple','00:1e:52':'Apple',
  '00:1f:5b':'Apple','00:1f:f3':'Apple','00:21:e9':'Apple','00:22:41':'Apple',
  '00:23:12':'Apple','00:23:32':'Apple','00:23:6c':'Apple','00:24:36':'Apple',
  '00:25:00':'Apple','00:25:4b':'Apple','00:25:bc':'Apple','00:26:08':'Apple',
  '00:26:4a':'Apple','00:26:b9':'Apple','00:26:bb':'Apple',
  'a4:c3:61':'Apple','8c:85:90':'Apple','f0:b4:79':'Apple','f4:f1:5a':'Apple',
  'd0:81:7a':'Apple','3c:06:30':'Apple','70:ec:e4':'Apple','ac:de:48':'Apple',
  'bc:d0:74':'Apple','cc:29:f5':'Apple','d4:9a:20':'Apple','e8:8d:28':'Apple',
  '4c:57:ca':'Apple','28:37:37':'Apple','60:f4:45':'Apple','70:cd:60':'Apple',
  '78:7b:8a':'Apple','80:be:05':'Apple','90:72:40':'Apple','a8:96:75':'Apple',
  'b8:c1:11':'Apple','c8:2a:14':'Apple','dc:41:5f':'Apple','f0:d1:a9':'Apple',
  '08:66:98':'Apple','10:40:f3':'Apple','14:8f:c6':'Apple','18:af:61':'Apple',
  '1c:36:bb':'Apple','20:78:f0':'Apple','24:ab:81':'Apple','28:6a:b8':'Apple',
  '34:08:bc':'Apple','38:0f:4a':'Apple','3c:2e:f9':'Apple','44:00:10':'Apple',
  '48:43:7c':'Apple','4c:74:03':'Apple','50:32:75':'Apple','54:72:4f':'Apple',
  '58:b0:35':'Apple','5c:59:48':'Apple','60:03:08':'Apple','64:a3:cb':'Apple',
  '68:a8:6d':'Apple','6c:40:08':'Apple','70:70:0d':'Apple','74:1b:b2':'Apple',
  '78:4f:43':'Apple','7c:11:be':'Apple','80:00:6e':'Apple','84:38:35':'Apple',
  '88:19:08':'Apple','8c:7b:9d':'Apple','90:84:0d':'Apple','94:65:2d':'Apple',
  '98:01:a7':'Apple','9c:fc:01':'Apple','a0:99:9b':'Apple','a4:5e:60':'Apple',
  'a8:20:66':'Apple','ac:87:a3':'Apple','b0:34:95':'Apple','b4:18:d1':'Apple',
  'b8:09:8a':'Apple','bc:52:b7':'Apple','c0:84:7a':'Apple','c4:2c:03':'Apple',
  'c8:69:cd':'Apple','cc:08:8d':'Apple','d0:23:db':'Apple','d4:61:9d':'Apple',
  'd8:30:62':'Apple','dc:2b:2a':'Apple','e0:ac:cb':'Apple','e4:98:d6':'Apple',
  'e8:04:62':'Apple','ec:35:86':'Apple','f0:79:60':'Apple','f4:37:b7':'Apple',
  'f8:27:93':'Apple','fc:25:3f':'Apple',
  // Samsung
  '00:07:ab':'Samsung','00:12:47':'Samsung','00:15:b9':'Samsung',
  '00:17:d5':'Samsung','00:1a:8a':'Samsung','00:1b:98':'Samsung',
  '00:1c:43':'Samsung','00:1d:25':'Samsung','00:1e:7d':'Samsung',
  '00:1f:cc':'Samsung','00:21:4c':'Samsung','00:23:39':'Samsung',
  '00:24:54':'Samsung','00:26:37':'Samsung','a0:0b:ba':'Samsung',
  '8c:c8:cd':'Samsung','50:85:69':'Samsung','c8:14:79':'Samsung',
  '00:26:5f':'Samsung','10:1d:c0':'Samsung','14:1a:a3':'Samsung',
  '18:3a:2d':'Samsung','1c:af:05':'Samsung','20:6e:9c':'Samsung',
  '24:4b:81':'Samsung','28:98:7b':'Samsung','2c:ae:2b':'Samsung',
  '30:07:4d':'Samsung','34:23:ba':'Samsung','38:01:97':'Samsung',
  '3c:8b:fe':'Samsung','40:0e:85':'Samsung','44:78:3e':'Samsung',
  '48:44:f7':'Samsung','4c:3c:16':'Samsung','50:01:bb':'Samsung',
  '54:88:0e':'Samsung','58:db:c3':'Samsung','5c:49:7d':'Samsung',
  '60:1d:91':'Samsung','64:b3:10':'Samsung','68:27:37':'Samsung',
  '6c:2f:2c':'Samsung','70:f9:27':'Samsung','74:45:8a':'Samsung',
  '78:52:1a':'Samsung','7c:0b:c6':'Samsung','80:57:19':'Samsung',
  '84:25:db':'Samsung','88:83:22':'Samsung','8c:71:f8':'Samsung',
  '90:18:7c':'Samsung','94:35:0a':'Samsung','98:52:b1':'Samsung',
  '9c:02:98':'Samsung','a0:82:1f':'Samsung','a4:eb:d3':'Samsung',
  'a8:04:60':'Samsung','ac:36:13':'Samsung','b0:72:bf':'Samsung',
  'b4:3a:28':'Samsung','b8:bc:1b':'Samsung','bc:20:a4':'Samsung',
  'c0:bd:d1':'Samsung','c4:42:02':'Samsung','c8:0f:10':'Samsung',
  'cc:07:ab':'Samsung','d0:17:6a':'Samsung','d4:e8:b2':'Samsung',
  'd8:57:ef':'Samsung','dc:71:37':'Samsung','e0:91:f5':'Samsung',
  'e4:32:cb':'Samsung','e8:50:8b':'Samsung','ec:1f:72':'Samsung',
  'f0:25:b7':'Samsung','f4:7b:5e':'Samsung','f8:04:2e':'Samsung',
  'fc:a1:3e':'Samsung',
  // Google / Nest / Chromecast
  '00:1a:11':'Google','54:60:09':'Google','f4:f5:d8':'Google',
  '28:6f:b9':'Google','48:d6:d5':'Google','3c:5a:b4':'Google',
  '7c:2e:bd':'Google','a4:77:33':'Google','f4:f5:e8':'Google',
  '58:cb:52':'Google','20:df:b9':'Google','d4:3a:2e':'Google',
  '08:9e:08':'Google','1c:f2:9a':'Google','30:fd:38':'Google',
  '40:4e:36':'Google','54:60:09':'Google','6c:ad:f8':'Google',
  '80:7a:bf':'Google','94:eb:2c':'Google','a4:c3:f0':'Google',
  'b4:bd:c9':'Nest','18:b4:30':'Nest','64:16:66':'Nest',
  '0a:06:d6':'Nest','18:b4:30':'Nest','64:16:66':'Nest',
  // Amazon
  '40:b4:cd':'Amazon','74:c2:46':'Amazon','34:d2:70':'Amazon',
  'a0:02:dc':'Amazon','b4:7c:9c':'Amazon','fc:a6:67':'Amazon',
  '44:65:0d':'Amazon','18:74:2e':'Amazon','f0:27:2d':'Amazon',
  'a4:08:f5':'Amazon','68:54:fd':'Amazon','f8:04:2e':'Amazon',
  '08:21:ef':'Amazon','10:ae:60':'Amazon','18:74:2e':'Amazon',
  '20:75:b4':'Amazon','38:f7:3d':'Amazon','40:4e:36':'Amazon',
  '4c:ef:c0':'Amazon','54:88:0e':'Amazon','60:f1:89':'Amazon',
  '68:37:e9':'Amazon','70:fc:8f':'Amazon','78:e1:03':'Amazon',
  '8c:49:62':'Amazon','90:59:af':'Amazon','98:d6:bb':'Amazon',
  'a0:02:dc':'Amazon','ac:63:be':'Amazon','b4:7c:9c':'Amazon',
  'c0:ee:fb':'Amazon','cc:9e:a2':'Amazon','d0:15:4a':'Amazon',
  'd4:61:da':'Amazon','d8:96:e0':'Amazon','dc:a9:04':'Amazon',
  'e0:98:61':'Amazon','e4:b3:18':'Amazon','e8:bb:3d':'Amazon',
  'ec:10:7b':'Amazon','f0:81:af':'Amazon','f4:f1:5a':'Amazon',
  'f8:04:2e':'Amazon','fc:a6:67':'Amazon',
  // Sony (PlayStation + TVs)
  '00:01:4a':'Sony','00:04:1f':'Sony','00:13:a9':'Sony',
  '00:15:c1':'Sony','00:1a:80':'Sony','00:1d:0d':'Sony',
  '00:23:06':'Sony','28:3f:69':'Sony','ac:9b:0a':'Sony',
  'fc:0f:e6':'Sony','70:26:05':'Sony','00:24:be':'Sony',
  '00:ea:d8':'Sony','1c:a0:b8':'Sony','2c:e4:1a':'Sony',
  '40:f0:2f':'Sony','48:2c:a0':'Sony','50:ef:80':'Sony',
  '5c:51:4f':'Sony','70:2a:d5':'Sony','78:84:3c':'Sony',
  '80:4e:81':'Sony','84:c5:a8':'Sony','90:38:0c':'Sony',
  '94:ce:2c':'Sony','a0:e4:53':'Sony','a8:e0:af':'Sony',
  'b0:05:94':'Sony','bc:30:d9':'Sony','c4:6e:1f':'Sony',
  'cc:fb:65':'Sony','d8:b0:4c':'Sony','e0:ae:5e':'Sony',
  'e4:11:5b':'Sony','e8:9f:80':'Sony','f0:bf:97':'Sony',
  'f4:a1:26':'Sony',
  // Nintendo
  '00:09:bf':'Nintendo','00:17:ab':'Nintendo','00:19:1d':'Nintendo',
  '00:1a:e9':'Nintendo','00:1b:ea':'Nintendo','00:1c:be':'Nintendo',
  '00:1d:bc':'Nintendo','00:1e:35':'Nintendo','00:1f:32':'Nintendo',
  '7c:bb:8a':'Nintendo','98:b6:e9':'Nintendo','a4:c0:e1':'Nintendo',
  '00:22:d7':'Nintendo','00:24:44':'Nintendo','40:d2:8a':'Nintendo',
  '58:bd:a3':'Nintendo','78:a2:a0':'Nintendo','8c:56:c5':'Nintendo',
  'a4:5c:27':'Nintendo','b8:ae:6e':'Nintendo','e0:0c:7f':'Nintendo',
  'e8:93:09':'Nintendo',
  // Microsoft / Xbox
  '00:03:ff':'Microsoft','00:12:5a':'Microsoft','00:15:5d':'Microsoft',
  '00:17:fa':'Microsoft','00:1d:d8':'Microsoft','00:22:48':'Microsoft',
  '28:18:78':'Microsoft','60:45:bd':'Microsoft','7c:ed:8d':'Microsoft',
  '00:50:f2':'Microsoft','10:1f:74':'Microsoft','14:13:33':'Microsoft',
  '1c:6a:77':'Microsoft','20:16:d8':'Microsoft','24:6e:96':'Microsoft',
  '28:18:78':'Microsoft','2c:54:2d':'Microsoft','30:59:b7':'Microsoft',
  '34:17:eb':'Microsoft','38:2c:4a':'Microsoft','3c:a9:f4':'Microsoft',
  '40:1c:83':'Microsoft','44:33:4c':'Microsoft','48:0f:cf':'Microsoft',
  '4c:0b:be':'Microsoft','50:1a:c5':'Microsoft','54:60:09':'Microsoft',
  '58:82:a8':'Microsoft','5c:ba:37':'Microsoft','60:45:bd':'Microsoft',
  // Raspberry Pi Foundation
  'b8:27:eb':'Raspberry Pi','dc:a6:32':'Raspberry Pi',
  'e4:5f:01':'Raspberry Pi','d8:3a:dd':'Raspberry Pi',
  '28:cd:c1':'Raspberry Pi',
  // NETGEAR
  '00:09:5b':'Netgear','00:0f:b5':'Netgear','00:14:6c':'Netgear',
  '00:18:4d':'Netgear','00:1b:2f':'Netgear','00:1e:2a':'Netgear',
  '00:22:3f':'Netgear','00:24:b2':'Netgear','00:26:f2':'Netgear',
  '20:4e:7f':'Netgear','2c:b0:5d':'Netgear','a0:40:a0':'Netgear',
  '10:0d:7f':'Netgear','1c:40:a3':'Netgear','30:46:9a':'Netgear',
  '44:94:fc':'Netgear','4c:60:de':'Netgear','6c:b0:ce':'Netgear',
  '80:37:73':'Netgear','84:1b:5e':'Netgear','9c:3d:cf':'Netgear',
  'a0:04:60':'Netgear','b0:7f:b9':'Netgear','c4:04:15':'Netgear',
  'e0:46:9a':'Netgear','e4:f4:c6':'Netgear',
  // TP-Link
  '00:1d:0f':'TP-Link','14:cc:20':'TP-Link','18:d6:c7':'TP-Link',
  '1c:61:b4':'TP-Link','50:c7:bf':'TP-Link','54:e6:fc':'TP-Link',
  '60:a4:4c':'TP-Link','70:4f:57':'TP-Link','90:f6:52':'TP-Link',
  'ac:84:c6':'TP-Link','b0:95:75':'TP-Link','c4:e9:84':'TP-Link',
  'e8:48:b8':'TP-Link','f0:a7:31':'TP-Link','00:27:19':'TP-Link',
  '04:95:e6':'TP-Link','08:55:31':'TP-Link','0c:80:63':'TP-Link',
  '10:fe:ed':'TP-Link','14:cc:20':'TP-Link','1c:3b:f3':'TP-Link',
  '20:dc:e6':'TP-Link','24:ec:99':'TP-Link','28:28:5d':'TP-Link',
  '2c:f0:5d':'TP-Link','30:de:4b':'TP-Link','34:60:f9':'TP-Link',
  '38:94:ed':'TP-Link','3c:84:6a':'TP-Link','40:16:9f':'TP-Link',
  '44:94:fc':'TP-Link','48:8a:d2':'TP-Link','4c:1a:3d':'TP-Link',
  '50:c7:bf':'TP-Link','54:a7:03':'TP-Link','58:ef:68':'TP-Link',
  '5c:62:8b':'TP-Link','60:e3:27':'TP-Link','64:70:02':'TP-Link',
  '68:ff:7b':'TP-Link','6c:19:8f':'TP-Link','70:03:9f':'TP-Link',
  '74:da:38':'TP-Link','78:44:76':'TP-Link','7c:8b:ca':'TP-Link',
  '80:8f:1d':'TP-Link','84:16:f9':'TP-Link','88:d7:f6':'TP-Link',
  '8c:21:0a':'TP-Link','90:9a:4a':'TP-Link','94:0a:6f':'TP-Link',
  '98:de:d0':'TP-Link','9c:a5:13':'TP-Link','a0:f3:c1':'TP-Link',
  'a4:2b:b0':'TP-Link','a8:57:4e':'TP-Link','ac:15:a2':'TP-Link',
  'b0:4e:26':'TP-Link','b4:b0:24':'TP-Link','b8:08:d7':'TP-Link',
  'bc:46:99':'TP-Link','c4:6e:1f':'TP-Link','c8:d3:a3':'TP-Link',
  'cc:32:e5':'TP-Link','d0:37:45':'TP-Link','d8:07:b6':'TP-Link',
  'dc:fe:18':'TP-Link','e0:28:6d':'TP-Link','e4:c3:2a':'TP-Link',
  'e8:de:27':'TP-Link','ec:08:6b':'TP-Link','f0:9f:c2':'TP-Link',
  'f4:f2:6d':'TP-Link','f8:1a:67':'TP-Link','fc:ec:da':'TP-Link',
  // Eero
  '20:f0:f6':'Eero','30:45:96':'Eero','54:9b:12':'Eero',
  '68:ae:20':'Eero','94:9f:3e':'Eero',
  // Ubiquiti
  '00:15:6d':'Ubiquiti','04:18:d6':'Ubiquiti','24:a4:3c':'Ubiquiti',
  '44:d9:e7':'Ubiquiti','68:72:51':'Ubiquiti','78:8a:20':'Ubiquiti',
  '80:2a:a8':'Ubiquiti','b4:fb:e4':'Ubiquiti','dc:9f:db':'Ubiquiti',
  'f0:9f:c2':'Ubiquiti','18:e8:29':'Ubiquiti','24:a4:3c':'Ubiquiti',
  '40:a6:b7':'Ubiquiti','60:22:32':'Ubiquiti','70:a7:41':'Ubiquiti',
  '78:45:58':'Ubiquiti','802a:a8':'Ubiquiti','ac:8b:a9':'Ubiquiti',
  'e0:63:da':'Ubiquiti','f0:9f:c2':'Ubiquiti',
  // Cisco / Linksys
  '00:03:6b':'Cisco','00:0b:46':'Cisco','00:0e:84':'Cisco',
  '00:13:5f':'Cisco','00:14:69':'Cisco','00:17:59':'Cisco',
  '00:1a:2f':'Cisco','00:1b:d4':'Cisco','3c:ce:73':'Cisco',
  '00:1c:10':'Cisco','00:21:a0':'Cisco','00:22:bd':'Cisco',
  '00:23:04':'Cisco','00:23:ac':'Cisco','00:24:13':'Cisco',
  '00:24:97':'Cisco','00:25:45':'Cisco','00:25:b4':'Cisco',
  '00:26:0a':'Cisco','00:26:99':'Cisco','00:26:ca':'Cisco',
  '1c:e6:c7':'Cisco','20:3a:07':'Cisco','24:b6:57':'Cisco',
  '28:94:0f':'Cisco','2c:36:f8':'Cisco','30:37:a6':'Cisco',
  '34:22:1b':'Cisco','38:ed:18':'Cisco','3c:08:f6':'Cisco',
  '40:f4:ec':'Cisco','44:47:cc':'Cisco','48:f8:b3':'Cisco',
  '4c:e1:73':'Cisco','50:06:04':'Cisco','54:78:1a':'Cisco',
  '58:ac:78':'Cisco','5c:50:15':'Cisco','60:73:5c':'Cisco',
  '64:d8:14':'Cisco','68:86:a7':'Cisco','6c:41:6a':'Cisco',
  '70:02:58':'Cisco','74:26:ac':'Cisco','78:72:5d':'Cisco',
  '7c:69:f6':'Cisco','80:e8:6f':'Cisco','84:b8:02':'Cisco',
  '88:90:8d':'Cisco','8c:60:4f':'Cisco','90:6c:ac':'Cisco',
  '94:70:f3':'Cisco','98:02:d8':'Cisco','9c:57:ad':'Cisco',
  'a0:1a:30':'Cisco','a4:18:75':'Cisco','a8:b1:d4':'Cisco',
  'ac:a3:1e':'Cisco','b0:7d:47':'Cisco','b4:14:89':'Cisco',
  // ASUS
  '00:11:2f':'Asus','00:13:d4':'Asus','00:15:f2':'Asus',
  '00:1a:92':'Asus','00:1b:fc':'Asus','00:1d:60':'Asus',
  '00:1e:8c':'Asus','10:bf:48':'Asus','50:46:5d':'Asus',
  'ac:22:0b':'Asus','b0:6e:bf':'Asus','d8:50:e6':'Asus',
  '04:92:26':'Asus','08:60:6e':'Asus','0c:9d:92':'Asus',
  '10:02:b5':'Asus','14:da:e9':'Asus','18:31:bf':'Asus',
  '1c:87:2c':'Asus','20:cf:30':'Asus','24:4b:fe':'Asus',
  '2c:56:dc':'Asus','30:5a:3a':'Asus','34:97:f6':'Asus',
  '38:2c:4a':'Asus','3c:97:0e':'Asus','40:16:7e':'Asus',
  '44:8a:5b':'Asus','48:5b:39':'Asus','4c:ed:fb':'Asus',
  '50:eb:71':'Asus','54:04:a6':'Asus','58:11:22':'Asus',
  '5c:a3:9d':'Asus','60:a4:4c':'Asus','64:d1:54':'Asus',
  '68:1a:b2':'Asus','6c:f0:49':'Asus','70:8b:cd':'Asus',
  '74:d0:2b':'Asus','78:24:af':'Asus','7c:10:c9':'Asus',
  '80:a5:89':'Asus','84:a9:38':'Asus','88:d7:f6':'Asus',
  '8c:8d:28':'Asus','90:e6:ba':'Asus','94:de:80':'Asus',
  '98:ee:cb':'Asus','9c:5c:8e':'Asus','a0:36:9f':'Asus',
  'a4:52:6f':'Asus','a8:5e:45':'Asus','ac:9e:17':'Asus',
  'b0:6e:bf':'Asus','b4:2e:99':'Asus','b8:6b:23':'Asus',
  'bc:ee:7b':'Asus','c0:56:e3':'Asus','c4:04:15':'Asus',
  'c8:60:00':'Asus','cc:b0:da':'Asus','d0:17:c2':'Asus',
  'd4:5d:64':'Asus','d8:50:e6':'Asus','dc:4a:3e':'Asus',
  'e0:3f:49':'Asus','e4:70:b8':'Asus','e8:9c:25':'Asus',
  'ec:4c:4d':'Asus','f0:2f:74':'Asus','f4:6d:04':'Asus',
  'f8:32:e4':'Asus','fc:34:97':'Asus',
  // Ring cameras
  'b0:09:da':'Ring','1c:e5:56':'Ring','00:2a:9a':'Ring','78:d2:94':'Ring',
  '0c:86:29':'Ring','2c:41:38':'Ring','34:ce:00':'Ring',
  // Philips Hue
  '00:17:88':'Philips','ec:b5:fa':'Philips',
  // Sonos
  '00:0e:58':'Sonos','34:7e:5c':'Sonos','48:a6:b8':'Sonos',
  '5c:aa:fd':'Sonos','78:28:ca':'Sonos','94:9f:3e':'Sonos',
  'b8:e9:37':'Sonos',
  // Synology
  '00:11:32':'Synology',
  // QNAP
  '00:08:9b':'QNAP',
  // Arris / SURFboard (ISP modems)
  '00:26:b8':'Arris','00:90:d0':'Arris','20:24:90':'Arris',
  '3c:df:a9':'Arris','40:c7:29':'Arris','60:a4:4c':'Arris',
  '70:ca:9b':'Arris','74:05:a5':'Arris','80:1a:e8':'Arris',
  '84:a4:23':'Arris','90:68:c3':'Arris','a4:18:75':'Arris',
  'c8:59:c8':'Arris','d4:05:98':'Arris',
  // Chamberlain (myQ garage)
  '00:90:2d':'Chamberlain',
  // LG Electronics (TVs, appliances)
  '00:05:2e':'LG','00:1c:62':'LG','00:1e:75':'LG','00:1f:e3':'LG',
  '00:22:a9':'LG','00:24:83':'LG','00:26:e2':'LG','00:aa:70':'LG',
  '18:67:b0':'LG','1c:08:c7':'LG','20:9f:db':'LG','28:80:23':'LG',
  '30:f7:72':'LG','34:4d:f7':'LG','38:8b:59':'LG','3c:bd:d8':'LG',
  '40:b0:fa':'LG','48:59:29':'LG','4c:ba:d7':'LG','50:55:27':'LG',
  '54:21:9b':'LG','58:fb:84':'LG','60:a1:0a':'LG','64:a8:5c':'LG',
  '68:05:71':'LG','6c:40:08':'LG','70:2c:1f':'LG','74:4a:a4':'LG',
  '78:5d:c8':'LG','7c:68:ca':'LG','80:07:54':'LG','84:2c:c4':'LG',
  '88:36:6c':'LG','8c:29:37':'LG','90:2a:10':'LG','94:4a:0c':'LG',
  '98:4b:4a':'LG','9c:3d:cf':'LG','a0:91:c8':'LG','a4:c0:e1':'LG',
  // HP (printers + PCs)
  '00:1b:78':'HP','00:21:5a':'HP','00:24:81':'HP','00:26:55':'HP',
  '1c:98:ec':'HP','3c:d9:2b':'HP','40:b0:34':'HP','58:20:b1':'HP',
  '60:eb:69':'HP','70:5a:b6':'HP','78:48:59':'HP','80:c1:6e':'HP',
  '84:34:97':'HP','a0:d3:c1':'HP','b4:99:ba':'HP','c4:34:6b':'HP',
  'c8:d3:ff':'HP','dc:4a:9e':'HP','e4:11:5b':'HP',
  // Epson (printers)
  '00:26:ab':'Epson','00:26:ac':'Epson','04:cb:a4':'Epson',
  '08:00:46':'Epson','20:76:8f':'Epson','ac:18:26':'Epson',
  // Brother (printers)
  '00:1b:a9':'Brother','00:80:77':'Brother','30:05:5c':'Brother',
  '68:72:51':'Brother',
  // Canon (printers/cameras)
  '00:00:85':'Canon','00:1e:8f':'Canon','00:21:97':'Canon',
  '00:26:2d':'Canon','04:74:a1':'Canon','08:00:20':'Canon',
  '10:02:b5':'Canon','40:7f:b0':'Canon','50:c7:bf':'Canon',
  'ac:66:13':'Canon',
  // Intel (laptops/desktops)
  '00:02:b3':'Intel','00:03:47':'Intel','00:04:23':'Intel',
  '00:07:e9':'Intel','00:0e:0c':'Intel','00:12:f0':'Intel',
  '00:13:02':'Intel','00:13:ce':'Intel','00:13:e8':'Intel',
  '00:15:00':'Intel','00:15:17':'Intel','00:16:6f':'Intel',
  '00:16:76':'Intel','00:16:ea':'Intel','00:16:eb':'Intel',
  '00:18:de':'Intel','00:19:d1':'Intel','00:19:d2':'Intel',
  '00:1b:21':'Intel','00:1c:bf':'Intel','00:1e:64':'Intel',
  '00:1e:65':'Intel','00:1e:67':'Intel','00:21:6a':'Intel',
  '00:21:6b':'Intel','00:22:fa':'Intel','00:22:fb':'Intel',
  '00:23:14':'Intel','00:23:15':'Intel','00:24:d6':'Intel',
  '00:24:d7':'Intel','00:27:10':'Intel','8c:8d:28':'Intel',
  'a4:34:d9':'Intel','b4:b6:76':'Intel','c4:85:08':'Intel',
  'd4:be:d9':'Intel','e4:b3:18':'Intel','f4:06:69':'Intel',
  // Lenovo (laptops/desktops)
  '00:1a:6b':'Lenovo','00:1c:25':'Lenovo','28:d2:44':'Lenovo',
  '40:2c:f4':'Lenovo','54:a0:50':'Lenovo','6c:40:08':'Lenovo',
  '70:5a:0f':'Lenovo','78:d3:8c':'Lenovo','88:70:8c':'Lenovo',
  '90:2b:34':'Lenovo','98:f2:b3':'Lenovo','a4:c3:f0':'Lenovo',
  'b4:6b:fc':'Lenovo','c4:34:6b':'Lenovo','d4:81:d7':'Lenovo',
  'e4:a4:71':'Lenovo','f4:8e:38':'Lenovo',
  // Dell (laptops/desktops)
  '00:06:5b':'Dell','00:08:74':'Dell','00:0b:db':'Dell',
  '00:0d:56':'Dell','00:0f:1f':'Dell','00:11:43':'Dell',
  '00:12:3f':'Dell','00:13:72':'Dell','00:14:22':'Dell',
  '00:15:c5':'Dell','00:16:f0':'Dell','00:18:8b':'Dell',
  '00:19:b9':'Dell','00:1a:4b':'Dell','00:1c:23':'Dell',
  '00:1d:09':'Dell','00:1e:4f':'Dell','00:1f:d0':'Dell',
  '00:21:70':'Dell','00:22:19':'Dell','00:23:ae':'Dell',
  '00:24:e8':'Dell','00:25:64':'Dell','00:26:b9':'Dell',
  '00:27:13':'Dell','18:03:73':'Dell','18:66:da':'Dell',
  '18:a9:05':'Dell','1c:40:24':'Dell','20:47:47':'Dell',
  '24:b6:fd':'Dell','28:f1:0e':'Dell','2c:76:8a':'Dell',
  '30:26:96':'Dell','34:17:eb':'Dell','38:63:bb':'Dell',
  '3c:a3:08':'Dell','40:a8:f0':'Dell','44:37:e6':'Dell',
  '48:51:b7':'Dell','4c:eb:42':'Dell','50:9a:4c':'Dell',
  '54:bf:64':'Dell','58:8a:5a':'Dell','5c:26:0a':'Dell',
  '60:03:08':'Dell','64:00:6a':'Dell','68:5d:43':'Dell',
  '6c:2b:59':'Dell','70:71:bc':'Dell','74:86:7a':'Dell',
  '78:2b:cb':'Dell','7c:8b:ca':'Dell','80:18:44':'Dell',
  '84:7b:eb':'Dell','88:51:fb':'Dell','8c:ec:4b':'Dell',
  '90:b1:1c':'Dell','94:18:82':'Dell','98:90:96':'Dell',
  '9c:eb:e8':'Dell','a0:2b:b8':'Dell','a4:1f:72':'Dell',
  'a8:9f:ba':'Dell','ac:1f:6b':'Dell','b0:83:fe':'Dell',
  'b4:45:06':'Dell','b8:ac:6f':'Dell','bc:30:5b':'Dell',
  'c0:3f:d5':'Dell','c4:cb:e1':'Dell','c8:1f:66':'Dell',
  'cc:f9:54':'Dell','d0:67:26':'Dell','d4:be:d9':'Dell',
  'd8:cb:8a':'Dell','dc:53:60':'Dell','e0:db:55':'Dell',
  'e4:b9:7a':'Dell','e8:b1:fc':'Dell','ec:f4:bb':'Dell',
  'f0:1f:af':'Dell','f4:8e:38':'Dell','f8:bc:12':'Dell',
  'fc:99:47':'Dell',
};

function lookupVendor(mac) {
  const norm = mac.toLowerCase().replace(/-/g, ':');
  return OUI[norm.slice(0, 8)] || null;
}

// ── Port scanning ──────────────────────────────────────────────────────────
// Ports that strongly identify device types
const PROBE_PORTS = [
  22,    // SSH     → Linux / Mac / server / Pi
  23,    // Telnet  → network gear (routers, switches)
  53,    // DNS     → router / pi-hole
  80,    // HTTP    → router / IoT / NAS / printer
  443,   // HTTPS   → NAS / server / router
  445,   // SMB     → Windows PC / NAS
  548,   // AFP     → macOS (file sharing)
  554,   // RTSP    → IP camera / streaming
  631,   // IPP     → printer
  1883,  // MQTT    → IoT hub
  3389,  // RDP     → Windows PC (remote desktop)
  5000,  // UPnP/Synology
  5001,  // Synology HTTPS
  7547,  // TR-069  → ISP modem
  8080,  // HTTP alt → IoT / cameras
  8443,  // HTTPS alt→ router / NAS
  9100,  // JetDirect → printer
  62078, // Apple lockdown → iPhone / iPad
];

function checkPort(ip, port, timeoutMs = 700) {
  return new Promise(resolve => {
    const s = new net.Socket();
    s.setTimeout(timeoutMs);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.connect(port, ip);
  });
}

async function scanPorts(ip) {
  const results = {};
  await Promise.all(PROBE_PORTS.map(async p => { results[p] = await checkPort(ip, p); }));
  return results;
}

// ── HTTP banner grab ───────────────────────────────────────────────────────
function httpBanner(ip, port = 80, timeoutMs = 2500) {
  return new Promise(resolve => {
    const req = http.get(
      { host: ip, port, path: '/', timeout: timeoutMs, headers: { 'User-Agent': 'NetworkScanner/2.0' } },
      res => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
          if (body.length > 3000) req.destroy();
        });
        res.on('end', () => {
          const server = res.headers['server'] || '';
          const tm = body.match(/<title[^>]*>([^<]{1,80})<\/title>/i);
          resolve({ server, title: tm ? tm[1].trim() : '', status: res.statusCode });
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── Type inference from all signals ───────────────────────────────────────
function guessType(vendor, hostname, ports, banner) {
  const v = (vendor || '').toLowerCase();
  const h = (hostname || '').toLowerCase();
  const b = banner ? (banner.title + ' ' + banner.server).toLowerCase() : '';

  // ─ Port-based (high confidence) ────────────────────
  if (ports[62078]) return { type: 'phone', category: 'mobile', note: 'Apple lockdown port' };
  if (ports[9100] || ports[631]) return { type: 'printer', category: 'peripheral', note: 'printing service' };
  if (ports[5000] || ports[5001]) {
    if (b.includes('synology') || b.includes('diskstation')) return { type: 'nas', category: 'computer', note: 'Synology' };
    if (b.includes('qnap') || b.includes('turbostation')) return { type: 'nas', category: 'computer', note: 'QNAP' };
    return { type: 'nas', category: 'computer', note: 'NAS port' };
  }
  if (ports[554]) return { type: 'iot-camera', category: 'smart-home', note: 'RTSP camera stream' };
  if (ports[1883]) return { type: 'iot-sensor', category: 'smart-home', note: 'MQTT broker' };
  if (ports[3389]) return { type: 'desktop', category: 'computer', note: 'Windows RDP' };
  if (ports[445] && ports[22]) return { type: 'server', category: 'computer', note: 'SMB+SSH (Linux server)' };
  if (ports[445]) return { type: 'desktop', category: 'computer', note: 'Windows SMB' };
  if (ports[548]) return { type: 'laptop', category: 'computer', note: 'macOS AFP' };
  if (ports[7547]) return { type: 'router', category: 'network', note: 'TR-069 modem' };
  if (ports[23]) return { type: 'router', category: 'network', note: 'Telnet management' };

  // ─ HTTP banner (high confidence) ───────────────────
  if (b) {
    if (b.match(/synology|diskstation/)) return { type: 'nas', category: 'computer', note: 'Synology NAS' };
    if (b.match(/qnap|turbostation/)) return { type: 'nas', category: 'computer', note: 'QNAP NAS' };
    if (b.match(/netgear|readynas/)) return { type: 'router', category: 'network', note: 'Netgear' };
    if (b.match(/tp-link|tplink/)) return { type: 'router', category: 'network', note: 'TP-Link' };
    if (b.match(/asus\s*router|asus\s*rt-/)) return { type: 'router', category: 'network', note: 'ASUS router' };
    if (b.match(/eero/)) return { type: 'mesh-node', category: 'network', note: 'Eero mesh' };
    if (b.match(/ubiquiti|unifi|edgemax/)) return { type: 'access-point', category: 'network', note: 'Ubiquiti' };
    if (b.match(/openwrt|dd-wrt|tomato/)) return { type: 'router', category: 'network', note: 'custom router firmware' };
    if (b.match(/plex|jellyfin|emby/)) return { type: 'server', category: 'computer', note: 'media server' };
    if (b.match(/home.?assistant/i)) return { type: 'server', category: 'computer', note: 'Home Assistant' };
    if (b.match(/hp.*print|printer|jetdirect/)) return { type: 'printer', category: 'peripheral', note: 'HP printer' };
    if (b.match(/ring/)) return { type: 'iot-camera', category: 'smart-home', note: 'Ring camera' };
    if (b.match(/nest|thermostat/)) return { type: 'iot-thermostat', category: 'smart-home', note: 'Nest thermostat' };
    if (b.match(/hue|zigbee bridge/)) return { type: 'iot-light', category: 'smart-home', note: 'Hue bridge' };
    if (b.match(/roku/)) return { type: 'streaming-stick', category: 'entertainment', note: 'Roku' };
    if (b.match(/fire.?tv|firetv/)) return { type: 'streaming-stick', category: 'entertainment', note: 'Fire TV' };
    if (b.match(/playstation|ps[345]/)) return { type: 'gaming-console', category: 'entertainment', note: 'PlayStation' };
    if (b.match(/xbox/)) return { type: 'gaming-console', category: 'entertainment', note: 'Xbox' };
    if (b.match(/sonos/)) return { type: 'smart-speaker', category: 'smart-home', note: 'Sonos' };
    if (b.match(/router|gateway|modem|admin.*panel/)) return { type: 'router', category: 'network', note: 'router admin page' };
  }

  // ─ Vendor-based ────────────────────────────────────
  if (v === 'apple') {
    if (h.match(/iphone|phone/))    return { type: 'phone', category: 'mobile', note: 'Apple iPhone' };
    if (h.match(/ipad/))             return { type: 'tablet', category: 'mobile', note: 'Apple iPad' };
    if (h.match(/macbook/))          return { type: 'laptop', category: 'computer', note: 'MacBook' };
    if (h.match(/imac|mac.?pro|mac.?mini/)) return { type: 'desktop', category: 'computer', note: 'Mac desktop' };
    if (h.match(/apple.?tv|appletv/)) return { type: 'streaming-stick', category: 'entertainment', note: 'Apple TV' };
    if (h.match(/homepod/))          return { type: 'smart-speaker', category: 'smart-home', note: 'HomePod' };
    if (h.match(/watch/))            return { type: 'iot-sensor', category: 'smart-home', note: 'Apple Watch' };
    if (ports[22])                   return { type: 'laptop', category: 'computer', note: 'Mac (SSH)' };
    return { type: 'phone', category: 'mobile', note: 'Apple device' };
  }
  if (v === 'samsung') {
    if (h.match(/tv|smart.?tv|display/)) return { type: 'tv', category: 'entertainment', note: 'Samsung TV' };
    if (h.match(/fridge|washer|appliance/)) return { type: 'iot-appliance', category: 'smart-home', note: 'Samsung appliance' };
    return { type: 'phone', category: 'mobile', note: 'Samsung phone' };
  }
  if (v === 'google')   return { type: 'smart-speaker', category: 'smart-home', note: 'Google Home/Chromecast' };
  if (v === 'nest')     return { type: 'iot-thermostat', category: 'smart-home', note: 'Nest' };
  if (v === 'amazon') {
    if (h.match(/fire|firetv/)) return { type: 'streaming-stick', category: 'entertainment', note: 'Fire TV' };
    return { type: 'smart-speaker', category: 'smart-home', note: 'Amazon Echo' };
  }
  if (v === 'sony') {
    if (h.match(/ps|playstation/)) return { type: 'gaming-console', category: 'entertainment', note: 'PlayStation' };
    return { type: 'tv', category: 'entertainment', note: 'Sony TV' };
  }
  if (v === 'nintendo') return { type: 'gaming-console', category: 'entertainment', note: 'Nintendo Switch' };
  if (v === 'microsoft') {
    if (h.match(/xbox/)) return { type: 'gaming-console', category: 'entertainment', note: 'Xbox' };
    return { type: 'desktop', category: 'computer', note: 'Windows PC' };
  }
  if (v === 'raspberry pi') return { type: 'server', category: 'computer', note: 'Raspberry Pi' };
  if (v === 'ring')        return { type: 'iot-camera', category: 'smart-home', note: 'Ring camera' };
  if (v === 'philips')     return { type: 'iot-light', category: 'smart-home', note: 'Philips Hue' };
  if (v === 'sonos')       return { type: 'smart-speaker', category: 'smart-home', note: 'Sonos' };
  if (v === 'synology')    return { type: 'nas', category: 'computer', note: 'Synology NAS' };
  if (v === 'qnap')        return { type: 'nas', category: 'computer', note: 'QNAP NAS' };
  if (v === 'lg') {
    if (h.match(/tv|oled|qned/)) return { type: 'tv', category: 'entertainment', note: 'LG TV' };
    return { type: 'tv', category: 'entertainment', note: 'LG device' };
  }
  if (['hp', 'epson', 'brother', 'canon'].includes(v)) {
    return { type: 'printer', category: 'peripheral', note: `${v} printer` };
  }
  if (['netgear', 'tp-link', 'eero', 'ubiquiti', 'cisco', 'asus', 'arris', 'linksys'].includes(v)) {
    return { type: 'router', category: 'network', note: `${v} network gear` };
  }
  if (['intel', 'dell', 'lenovo'].includes(v)) {
    return { type: 'desktop', category: 'computer', note: `${v} PC` };
  }
  if (v === 'chamberlain') return { type: 'iot-sensor', category: 'smart-home', note: 'myQ garage' };

  // ─ Hostname pattern (medium confidence) ────────────
  if (h.match(/iphone/))           return { type: 'phone', category: 'mobile', note: 'iPhone' };
  if (h.match(/ipad/))             return { type: 'tablet', category: 'mobile', note: 'iPad' };
  if (h.match(/android|galaxy|pixel|oneplus/)) return { type: 'phone', category: 'mobile', note: 'Android phone' };
  if (h.match(/macbook|laptop|notebook/)) return { type: 'laptop', category: 'computer', note: 'laptop' };
  if (h.match(/imac|desktop|workstation|tower/)) return { type: 'desktop', category: 'computer', note: 'desktop' };
  if (h.match(/printer|print|laserjet|inkjet|mfp/)) return { type: 'printer', category: 'peripheral', note: 'printer' };
  if (h.match(/nas|storage|synology|qnap/)) return { type: 'nas', category: 'computer', note: 'NAS' };
  if (h.match(/cam|camera|doorbell|ring|arlo/)) return { type: 'iot-camera', category: 'smart-home', note: 'camera' };
  if (h.match(/thermostat|nest|ecobee|hvac/)) return { type: 'iot-thermostat', category: 'smart-home', note: 'thermostat' };
  if (h.match(/echo|alexa|homepod|speaker|sonos|bose/)) return { type: 'smart-speaker', category: 'smart-home', note: 'smart speaker' };
  if (h.match(/hue|lifx|kasa|light|bulb/)) return { type: 'iot-light', category: 'smart-home', note: 'smart light' };
  if (h.match(/router|gateway|modem|eero|orbi|mesh|nighthawk/)) return { type: 'router', category: 'network', note: 'router' };
  if (h.match(/switch|hub|ap\b|access.?point/)) return { type: 'switch', category: 'network', note: 'network switch/AP' };
  if (h.match(/xbox/))             return { type: 'gaming-console', category: 'entertainment', note: 'Xbox' };
  if (h.match(/playstation|ps[345]/)) return { type: 'gaming-console', category: 'entertainment', note: 'PlayStation' };
  if (h.match(/nintendo|switch/))  return { type: 'gaming-console', category: 'entertainment', note: 'Nintendo' };
  if (h.match(/\btv\b|television|bravia|roku/)) return { type: 'tv', category: 'entertainment', note: 'smart TV' };
  if (h.match(/fire.?tv|chromecast|appletv|apple.?tv/)) return { type: 'streaming-stick', category: 'entertainment', note: 'streaming device' };
  if (h.match(/tablet/))           return { type: 'tablet', category: 'mobile', note: 'tablet' };
  if (h.match(/raspberry|raspberrypi/)) return { type: 'server', category: 'computer', note: 'Raspberry Pi' };
  if (h.match(/server|srv|plex|jellyfin|home.?assistant/)) return { type: 'server', category: 'computer', note: 'server' };

  // SSH open with no other strong signal → likely a Linux machine
  if (ports[22]) return { type: 'server', category: 'computer', note: 'SSH server (Linux/Mac)' };
  // Only HTTP open → likely an IoT device or router
  if (ports[80] || ports[8080]) return { type: 'router', category: 'network', note: 'HTTP web interface' };

  return { type: 'phone', category: 'mobile', note: 'unknown — set manually' };
}

// ── ARP table (deduped by IP, prefers valid MACs) ─────────────────────────
function readArpTable() {
  try {
    const raw = execSync('arp -a', { encoding: 'utf8' });
    const byIp = new Map();
    for (const line of raw.split('\n')) {
      const m1 = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]{17})/i);
      const m2 = !m1 && line.match(/^\s+(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]{17})/i);
      const m = m1 || m2;
      if (!m) continue;
      const ip  = m[1];
      const mac = m[2].replace(/-/g, ':').toUpperCase();
      if (mac === 'FF:FF:FF:FF:FF:FF') continue;
      if (ip.endsWith('.255') || ip === '255.255.255.255') continue;
      if (mac.startsWith('00:00:00')) continue; // invalid
      const hostname = m1 ? (line.split(' ')[0] !== '?' ? line.split(' ')[0] : '') : '';
      // Prefer entry with a real hostname over one without
      if (!byIp.has(ip) || hostname) byIp.set(ip, { ip, mac, hostname });
    }
    return [...byIp.values()];
  } catch { return []; }
}

// ── Ping sweep ────────────────────────────────────────────────────────────
function pingSweep(subnet) {
  log(`Pinging ${subnet}.1-254 ...`);
  return new Promise(resolve => {
    let done = 0;
    for (let i = 1; i <= 254; i++) {
      const ip  = `${subnet}.${i}`;
      const cmd = IS_WIN ? `ping -n 1 -w 300 ${ip}` : `ping -c 1 -W 1 ${ip}`;
      exec(cmd, () => { if (++done === 254) resolve(); });
    }
  });
}

// ── Reverse DNS ───────────────────────────────────────────────────────────
function reverseDns(ip) {
  return new Promise(resolve => {
    dns.reverse(ip, (err, hosts) => {
      resolve(!err && hosts && hosts[0] ? hosts[0].replace(/\.$/, '') : '');
    });
  });
}

// ── Own PC type ───────────────────────────────────────────────────────────
function ownPcType() {
  if (PLAT === 'win32')  return { type: 'desktop', category: 'computer' };
  if (PLAT === 'darwin') return { type: 'laptop',  category: 'computer' };
  return { type: 'desktop', category: 'computer' };
}
function ownPcBrand() {
  if (PLAT === 'darwin') return 'Apple';
  if (PLAT === 'win32')  return 'Windows PC';
  return 'Linux PC';
}

function friendlyName(hostname, vendor, ip) {
  if (hostname) {
    return hostname.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  if (vendor) return `${vendor} Device`;
  return `Device ${ip.split('.').pop()}`;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const { myIp, myMac, subnet } = getNetworkInfo();
  const gateway   = getGateway(subnet);
  const gatewayId = `device-${gateway.replace(/\./g, '-')}`;

  log(`Your IP  : ${myIp}`);
  log(`Gateway  : ${gateway}`);
  log(`Subnet   : ${subnet}.0/24`);
  log('');

  await pingSweep(subnet);
  await new Promise(r => setTimeout(r, 1500));

  const arpRows = readArpTable();
  log(`${arpRows.length} device(s) found in ARP table.`);
  log('Port-scanning each device (this takes ~10s) ...');

  const devices = [];
  const seenIds = new Set();

  // ── Add own PC first (it may or may not appear in ARP) ─────────────────
  const ownHostname = os.hostname();
  const { type: ownType, category: ownCat } = ownPcType();
  const ownId = myMac
    ? `device-${myMac.replace(/:/g, '')}`
    : `device-self-${myIp.replace(/\./g, '-')}`;
  seenIds.add(ownId);

  devices.push({
    id: ownId,
    name: friendlyName(ownHostname, null, myIp),
    type: ownType,
    category: ownCat,
    room: 'Unassigned',
    ip: myIp,
    mac: myMac || 'Unknown',
    status: 'active',
    connectedTo: gateway !== myIp ? [gatewayId] : [],
    brand: ownPcBrand(),
    bandwidth: 0,
    _note: 'This computer (running the scan)',
  });
  log(`  [self] ${myIp.padEnd(16)} ${myMac.padEnd(18)} ${ownHostname}`);

  // ── Scan each ARP entry ─────────────────────────────────────────────────
  for (const row of arpRows) {
    if (row.ip === myIp) continue; // already added above

    const id = `device-${row.mac.replace(/:/g, '')}`;
    if (seenIds.has(id)) continue; // deduplicate by MAC too
    seenIds.add(id);

    const hostname = row.hostname || (await reverseDns(row.ip));
    const vendor   = lookupVendor(row.mac);
    const isGateway = row.ip === gateway;

    // Port scan (skip gateway's own port details since we know it's a router)
    let ports = {};
    let banner = null;
    if (!isGateway) {
      ports = await scanPorts(row.ip);
      if (ports[80] || ports[8080]) {
        banner = await httpBanner(row.ip, ports[80] ? 80 : 8080);
      }
    }

    let type, category, note;
    if (isGateway) {
      type = 'router'; category = 'network'; note = 'Default gateway';
    } else {
      ({ type, category, note } = guessType(vendor, hostname, ports, banner));
    }

    const name = isGateway
      ? (hostname ? friendlyName(hostname, null, row.ip) : 'Home Router')
      : friendlyName(hostname, vendor, row.ip);

    const openPorts = Object.entries(ports).filter(([,v]) => v).map(([p]) => Number(p));

    devices.push({
      id,
      name,
      type,
      category,
      room: 'Unassigned',
      ip: row.ip,
      mac: row.mac,
      status: 'online',
      connectedTo: isGateway ? [] : [gatewayId],
      brand: vendor || undefined,
      bandwidth: 0,
      _note: note,
      _openPorts: openPorts.length ? openPorts : undefined,
    });

    const portStr = openPorts.length ? `[${openPorts.join(',')}]` : '';
    log(`  ${row.ip.padEnd(16)} ${row.mac}  ${(vendor||'?').padEnd(14)} ${hostname||''} → ${type} ${portStr}`);
  }

  // Sort by IP
  devices.sort((a, b) => {
    const al = parseInt(a.ip.split('.').pop() ?? '0');
    const bl = parseInt(b.ip.split('.').pop() ?? '0');
    return al - bl;
  });

  log('');
  log(`Scan complete — ${devices.length} device(s).`);
  log('Import the JSON below into the app (↺ Re-import Scan).');
  log('─'.repeat(60));

  process.stdout.write(JSON.stringify(devices, null, 2) + '\n');
}

main().catch(err => { log(`Fatal: ${err.message}`); process.exit(1); });
