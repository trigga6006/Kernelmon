// ═══════════════════════════════════════════════════════════════
// GYM LADDER — 5 Gyms, each with a 5-fighter ladder
// Beat fighters in order to climb each gym. Clear all 5 to
// unlock the next gym. Reclear for scaling difficulty & rewards.
// ═══════════════════════════════════════════════════════════════

const fs = require('node:fs');
const path = require('node:path');
const { getSprite } = require('./sprites');
const { classifyArchetype } = require('./profiler');
const { assignMoveset } = require('./moveset');

const WSO_DIR = path.join(__dirname, '..', '.kernelmon');
const GYM_FILE = path.join(WSO_DIR, 'gym.json');

// ─── Gym & Fighter Definitions ───

// ─── Fighter stat profiles are designed for archetype variety ───
// Each fighter has a pronounced dominant stat to trigger specific archetypes.
// Hardware brands are mixed (AMD/Intel/NVIDIA/Radeon/Arc) for moveset diversity.
// Every fighter has specs.id for unique signature move hashing.

const GYMS = [
  {
    id: 'script_forge',
    name: 'SCRIPT FORGE',
    icon: '⌬',
    iconColor: [100, 230, 150],
    desc: 'Where every hacker starts. Prove you belong.',
    fighters: [
      {
        id: 'sf_script_kiddie',
        name: 'SCRIPT KIDDIE',
        title: 'The Copy-Paste Menace',
        taunt: 'I found this exploit on GitHub...',
        tier: 'low',
        creditBase: 40,
        dropParts: false,
        // SCRAPPER — integrated GPU + low avg → Survival Instinct (comeback mechanic)
        specs: { id: 'gym-sf-01', cpu: { brand: 'Intel Celeron N4020', manufacturer: 'Intel', cores: 2, threads: 2, speed: 1.1, speedMax: 2.8 }, ram: { totalGB: 4 }, gpu: { model: 'Intel UHD Graphics 600', vramMB: 0, vendor: 'Intel' }, storage: { type: 'eMMC' } },
        stats: { str: 22, vit: 24, mag: 15, spd: 20, def: 20, hp: 694, maxHp: 694 },
        displayName: 'Celeron N4020', displayGpu: 'Intel UHD 600',
      },
      {
        id: 'sf_packet_sniffer',
        name: 'PACKET SNIFFER',
        title: 'The Eavesdropper',
        taunt: 'I already know your next move.',
        tier: 'low',
        creditBase: 50,
        dropParts: false,
        // PHANTOM — high spd, low HP → evasion tank
        specs: { id: 'gym-sf-02', cpu: { brand: 'Intel Pentium Gold G7400', manufacturer: 'Intel', cores: 2, threads: 4, speed: 3.7, speedMax: 3.7 }, ram: { totalGB: 8 }, gpu: { model: 'Intel UHD Graphics 710', vramMB: 0, vendor: 'Intel' }, storage: { type: 'SSD' } },
        stats: { str: 20, vit: 18, mag: 18, spd: 55, def: 22, hp: 592, maxHp: 592 },
        displayName: 'Pentium G7400', displayGpu: 'Intel UHD 710',
      },
      {
        id: 'sf_bug_hunter',
        name: 'BUG HUNTER',
        title: 'The Vulnerability Scout',
        taunt: 'Every system has a crack.',
        tier: 'low',
        creditBase: 60,
        dropParts: false,
        // BERSERKER — str dominant, str >= mag+10 → high risk/reward
        specs: { id: 'gym-sf-03', cpu: { brand: 'AMD Ryzen 3 3200G', manufacturer: 'AMD', cores: 4, threads: 4, speed: 3.6, speedMax: 4.0 }, ram: { totalGB: 8 }, gpu: { model: 'AMD Radeon Vega 8', vramMB: 512, vendor: 'AMD' }, storage: { type: 'SSD' } },
        stats: { str: 56, vit: 30, mag: 28, spd: 32, def: 30, hp: 814, maxHp: 814 },
        displayName: 'Ryzen 3 3200G', displayGpu: 'Radeon Vega 8',
      },
      {
        id: 'sf_code_monkey',
        name: 'CODE MONKEY',
        title: 'The Brute-Force Coder',
        taunt: 'I don\'t optimize. I overwhelm.',
        tier: 'mid',
        creditBase: 75,
        dropParts: false,
        // ARCMAGE — mag dominant → Shader Burnout (high ceiling/low floor)
        specs: { id: 'gym-sf-04', cpu: { brand: 'Intel Core i5-12400', manufacturer: 'Intel', cores: 6, threads: 12, speed: 2.5, speedMax: 4.4 }, ram: { totalGB: 16 }, gpu: { model: 'NVIDIA GeForce GTX 1660 Super', vramMB: 6144, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 500 } },
        stats: { str: 35, vit: 36, mag: 62, spd: 38, def: 34, hp: 953, maxHp: 953 },
        displayName: 'i5-12400', displayGpu: 'GTX 1660 Super',
      },
      {
        id: 'sf_root_access',
        name: 'ROOT ACCESS',
        title: 'Gym Boss — The Privilege Escalator',
        taunt: 'sudo rm -rf your_hopes',
        tier: 'mid',
        creditBase: 120,
        dropParts: false,
        isLeader: true,
        // BLITZ — spd dominant, spd >= str+10 → Zero-Day Exploit (devastating first strike)
        specs: { id: 'gym-sf-05', cpu: { brand: 'AMD Ryzen 5 5600X', manufacturer: 'AMD', cores: 6, threads: 12, speed: 3.7, speedMax: 4.6 }, ram: { totalGB: 16 }, gpu: { model: 'AMD Radeon RX 6600', vramMB: 8192, vendor: 'AMD' }, storage: { type: 'NVMe', sizeGB: 1000 } },
        stats: { str: 42, vit: 40, mag: 48, spd: 66, def: 40, hp: 1056, maxHp: 1056 },
        displayName: 'Ryzen 5 5600X', displayGpu: 'RX 6600',
      },
    ],
  },
  {
    id: 'neon_circuit',
    name: 'NEON CIRCUIT',
    icon: '◈',
    iconColor: [200, 130, 255],
    desc: 'The underground ring. Fast rigs, faster reflexes.',
    fighters: [
      {
        id: 'nc_data_miner',
        name: 'DATA MINER',
        title: 'The Hash Grinder',
        taunt: 'My rig runs hot 24/7.',
        tier: 'mid',
        creditBase: 80,
        dropParts: false,
        // BERSERKER — str dominant, offense-heavy → Overclock Instability
        specs: { id: 'gym-nc-01', cpu: { brand: 'Intel Core i5-13600K', manufacturer: 'Intel', cores: 14, threads: 20, speed: 3.5, speedMax: 5.1 }, ram: { totalGB: 16 }, gpu: { model: 'NVIDIA GeForce RTX 3060', vramMB: 12288, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 1000 } },
        stats: { str: 66, vit: 42, mag: 50, spd: 48, def: 44, hp: 1111, maxHp: 1111 },
        displayName: 'i5-13600K', displayGpu: 'RTX 3060',
      },
      {
        id: 'nc_proxy_ghost',
        name: 'PROXY GHOST',
        title: 'The Untraceable',
        taunt: 'You can\'t hit what you can\'t find.',
        tier: 'mid',
        creditBase: 95,
        dropParts: false,
        // BLITZ — spd dominant → Zero-Day Exploit (fading advantage)
        specs: { id: 'gym-nc-02', cpu: { brand: 'AMD Ryzen 5 7600X', manufacturer: 'AMD', cores: 6, threads: 12, speed: 4.7, speedMax: 5.3 }, ram: { totalGB: 32 }, gpu: { model: 'AMD Radeon RX 6700 XT', vramMB: 12288, vendor: 'AMD' }, storage: { type: 'NVMe', sizeGB: 1000 } },
        stats: { str: 44, vit: 48, mag: 52, spd: 68, def: 48, hp: 1287, maxHp: 1287 },
        displayName: 'Ryzen 5 7600X', displayGpu: 'RX 6700 XT',
      },
      {
        id: 'nc_firewall_breaker',
        name: 'FIREWALL BREAKER',
        title: 'The Perimeter Smasher',
        taunt: 'Your defenses are decoration.',
        tier: 'high',
        creditBase: 110,
        dropParts: false,
        // ARCMAGE — mag dominant → Shader Burnout (big crits or fizzle)
        specs: { id: 'gym-nc-03', cpu: { brand: 'Intel Core i7-13700K', manufacturer: 'Intel', cores: 16, threads: 24, speed: 3.4, speedMax: 5.4 }, ram: { totalGB: 32 }, gpu: { model: 'NVIDIA GeForce RTX 3070 Ti', vramMB: 8192, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 2000 } },
        stats: { str: 52, vit: 50, mag: 68, spd: 55, def: 52, hp: 1350, maxHp: 1350 },
        displayName: 'i7-13700K', displayGpu: 'RTX 3070 Ti',
      },
      {
        id: 'nc_wire_jockey',
        name: 'WIRE JOCKEY',
        title: 'The Signal Rider',
        taunt: 'I surf the bus at clock speed.',
        tier: 'high',
        creditBase: 130,
        dropParts: true,
        // FORTRESS — def >= 55, RAM >= 32GB → Memory Wall (tank)
        specs: { id: 'gym-nc-04', cpu: { brand: 'AMD Ryzen 7 7700X', manufacturer: 'AMD', cores: 8, threads: 16, speed: 4.5, speedMax: 5.4 }, ram: { totalGB: 64 }, gpu: { model: 'AMD Radeon RX 7800 XT', vramMB: 16384, vendor: 'AMD' }, storage: { type: 'NVMe', sizeGB: 2000 } },
        stats: { str: 50, vit: 62, mag: 58, spd: 48, def: 60, hp: 1771, maxHp: 1771 },
        displayName: 'Ryzen 7 7700X', displayGpu: 'RX 7800 XT',
      },
      {
        id: 'nc_netrunner',
        name: 'NETRUNNER',
        title: 'Gym Boss — The Wire Phantom',
        taunt: 'Your firewall is a suggestion.',
        tier: 'high',
        creditBase: 200,
        dropParts: true,
        isLeader: true,
        // HIVEMIND — 20 cores, str >= 65 → Thread Saturation (power but slow)
        specs: { id: 'gym-nc-05', cpu: { brand: 'Intel Core i7-14700K', manufacturer: 'Intel', cores: 20, threads: 28, speed: 3.4, speedMax: 5.6 }, ram: { totalGB: 64 }, gpu: { model: 'NVIDIA GeForce RTX 4070 Ti', vramMB: 12288, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 2000 } },
        stats: { str: 70, vit: 58, mag: 62, spd: 55, def: 56, hp: 1623, maxHp: 1623 },
        displayName: 'i7-14700K', displayGpu: 'RTX 4070 Ti',
      },
    ],
  },
  {
    id: 'black_ice',
    name: 'BLACK ICE',
    icon: '✹',
    iconColor: [255, 80, 80],
    desc: 'The final gauntlet. No patches. No mercy.',
    fighters: [
      {
        id: 'bi_cipher_agent',
        name: 'CIPHER AGENT',
        title: 'The Encryption Wall',
        taunt: 'Brute force won\'t save you.',
        tier: 'high',
        creditBase: 150,
        dropParts: true,
        // FORTRESS — def >= 55, RAM >= 32GB → Memory Wall (pure tank)
        specs: { id: 'gym-bi-01', cpu: { brand: 'AMD Ryzen 7 7800X3D', manufacturer: 'AMD', cores: 8, threads: 16, speed: 4.2, speedMax: 5.0 }, ram: { totalGB: 64 }, gpu: { model: 'Intel Arc A770', vramMB: 16384, vendor: 'Intel' }, storage: { type: 'NVMe', sizeGB: 2000 } },
        stats: { str: 52, vit: 70, mag: 58, spd: 50, def: 65, hp: 2094, maxHp: 2094 },
        displayName: 'Ryzen 7 7800X3D', displayGpu: 'Arc A770',
      },
      {
        id: 'bi_exploit_dev',
        name: 'EXPLOIT DEV',
        title: 'The Weaponsmith',
        taunt: 'I write the tools others use.',
        tier: 'high',
        creditBase: 180,
        dropParts: true,
        // ARCMAGE — mag dominant → Shader Burnout (devastating but inconsistent)
        specs: { id: 'gym-bi-02', cpu: { brand: 'Intel Core i9-13900K', manufacturer: 'Intel', cores: 24, threads: 32, speed: 3.0, speedMax: 5.8 }, ram: { totalGB: 64 }, gpu: { model: 'NVIDIA GeForce RTX 4080', vramMB: 16384, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 4000 } },
        stats: { str: 60, vit: 58, mag: 80, spd: 65, def: 58, hp: 1623, maxHp: 1623 },
        displayName: 'i9-13900K', displayGpu: 'RTX 4080',
      },
      {
        id: 'bi_kernel_hacker',
        name: 'KERNEL HACKER',
        title: 'The Ring Zero Operator',
        taunt: 'I live below your OS.',
        tier: 'flagship',
        creditBase: 220,
        dropParts: true,
        // HIVEMIND — 16+ cores, str >= 65 → Thread Saturation (raw damage, slow)
        specs: { id: 'gym-bi-03', cpu: { brand: 'AMD Ryzen 9 7950X', manufacturer: 'AMD', cores: 16, threads: 32, speed: 4.5, speedMax: 5.7 }, ram: { totalGB: 64 }, gpu: { model: 'AMD Radeon RX 7900 XTX', vramMB: 24576, vendor: 'AMD' }, storage: { type: 'NVMe', sizeGB: 4000 } },
        stats: { str: 78, vit: 60, mag: 72, spd: 62, def: 58, hp: 1696, maxHp: 1696 },
        displayName: 'Ryzen 9 7950X', displayGpu: 'RX 7900 XTX',
      },
      {
        id: 'bi_shadow_admin',
        name: 'SHADOW ADMIN',
        title: 'The Invisible Hand',
        taunt: 'I\'ve had root since before you booted.',
        tier: 'flagship',
        creditBase: 280,
        dropParts: true,
        // TITAN — avg >= 76, minStat >= 68 → Overheat (massive burst, stall risk)
        specs: { id: 'gym-bi-04', cpu: { brand: 'Intel Core i9-14900KS', manufacturer: 'Intel', cores: 24, threads: 32, speed: 3.2, speedMax: 6.2 }, ram: { totalGB: 128 }, gpu: { model: 'NVIDIA GeForce RTX 4090', vramMB: 24576, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 4000 } },
        stats: { str: 80, vit: 72, mag: 82, spd: 75, def: 74, hp: 2180, maxHp: 2180 },
        displayName: 'i9-14900KS', displayGpu: 'RTX 4090',
      },
      {
        id: 'bi_zero_day',
        name: 'ZERO DAY',
        title: 'Gym Boss — The Unpatched',
        taunt: 'No fix exists for what I am.',
        tier: 'flagship',
        creditBase: 400,
        dropParts: true,
        isLeader: true,
        // APEX — avg >= 90, minStat >= 85 → Omniscience (consistent god-tier + regen)
        specs: { id: 'gym-bi-05', cpu: { brand: 'AMD Threadripper PRO 7975WX', manufacturer: 'AMD', cores: 32, threads: 64, speed: 4.0, speedMax: 5.3 }, ram: { totalGB: 256 }, gpu: { model: 'NVIDIA RTX 6000 Ada', vramMB: 49152, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 8000 } },
        stats: { str: 92, vit: 88, mag: 95, spd: 90, def: 86, hp: 2941, maxHp: 2941 },
        displayName: 'TR PRO 7975WX', displayGpu: 'RTX 6000 Ada',
      },
    ],
  },
  {
    id: 'dead_signal',
    name: 'DEAD SIGNAL',
    icon: '◉',
    iconColor: [255, 140, 40],
    desc: 'State-sponsored warfare. No attribution. No mercy.',
    mythicBonus: 0.01,
    fighters: [
      {
        id: 'ds_spear_phisher',
        name: 'SPEAR PHISHER',
        title: 'The Social Engineer',
        taunt: 'I don\'t need exploits when I have psychology.',
        tier: 'flagship',
        creditBase: 200,
        dropParts: true,
        // BLITZ — spd dominant, spd >= str+10 → Zero-Day Exploit (devastating opener)
        specs: { id: 'gym-ds-01', cpu: { brand: 'AMD Ryzen 9 7950X', manufacturer: 'AMD', cores: 16, threads: 32, speed: 4.5, speedMax: 5.7 }, ram: { totalGB: 64 }, gpu: { model: 'NVIDIA GeForce RTX 4070 Ti Super', vramMB: 16384, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 2000 } },
        stats: { str: 62, vit: 58, mag: 65, spd: 84, def: 55, hp: 1623, maxHp: 1623 },
        displayName: 'Ryzen 9 7950X', displayGpu: 'RTX 4070 Ti S',
      },
      {
        id: 'ds_logic_bomb',
        name: 'LOGIC BOMB',
        title: 'The Detonator',
        taunt: 'You won\'t know I\'m here until it\'s too late.',
        tier: 'flagship',
        creditBase: 240,
        dropParts: true,
        // ARCMAGE — mag dominant, mag >= str & mag >= spd → Shader Burnout (high ceiling)
        specs: { id: 'gym-ds-02', cpu: { brand: 'Intel Core i9-13900K', manufacturer: 'Intel', cores: 24, threads: 32, speed: 3.0, speedMax: 5.8 }, ram: { totalGB: 64 }, gpu: { model: 'NVIDIA GeForce RTX 4090', vramMB: 24576, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 4000 } },
        stats: { str: 64, vit: 62, mag: 88, spd: 72, def: 60, hp: 1771, maxHp: 1771 },
        displayName: 'i9-13900K', displayGpu: 'RTX 4090',
      },
      {
        id: 'ds_darknet_crawler',
        name: 'DARKNET CRAWLER',
        title: 'The Deep Web Hunter',
        taunt: 'There is no corner of the net I haven\'t mapped.',
        tier: 'elite',
        creditBase: 280,
        dropParts: true,
        // FORTRESS — def >= 55, RAM >= 32GB → Memory Wall (beefy tank)
        specs: { id: 'gym-ds-03', cpu: { brand: 'AMD Ryzen 9 7900X', manufacturer: 'AMD', cores: 12, threads: 24, speed: 4.7, speedMax: 5.6 }, ram: { totalGB: 128 }, gpu: { model: 'AMD Radeon RX 7900 XTX', vramMB: 24576, vendor: 'AMD' }, storage: { type: 'NVMe', sizeGB: 4000 } },
        stats: { str: 76, vit: 80, mag: 72, spd: 62, def: 78, hp: 2544, maxHp: 2544 },
        displayName: 'Ryzen 9 7900X', displayGpu: 'RX 7900 XTX',
      },
      {
        id: 'ds_rootkit_phantom',
        name: 'ROOTKIT PHANTOM',
        title: 'The Invisible Infection',
        taunt: 'I was already inside before you powered on.',
        tier: 'elite',
        creditBase: 350,
        dropParts: true,
        // HIVEMIND — cores >= 16, str >= 65 → Thread Saturation (raw damage, slow)
        specs: { id: 'gym-ds-04', cpu: { brand: 'AMD Threadripper 7970X', manufacturer: 'AMD', cores: 32, threads: 64, speed: 4.0, speedMax: 5.3 }, ram: { totalGB: 128 }, gpu: { model: 'NVIDIA GeForce RTX 5090', vramMB: 49152, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 8000 } },
        stats: { str: 86, vit: 74, mag: 80, spd: 72, def: 65, hp: 2267, maxHp: 2267 },
        displayName: 'TR 7970X', displayGpu: 'RTX 5090',
      },
      {
        id: 'ds_blackout',
        name: 'BLACKOUT',
        title: 'Gym Boss — The Grid Killer',
        taunt: 'When I\'m done, even the lights go dark.',
        tier: 'elite',
        creditBase: 500,
        dropParts: true,
        isLeader: true,
        // TITAN — avg >= 76, minStat >= 68, but avg < 90 → Overheat (massive burst, stall risk)
        specs: { id: 'gym-ds-05', cpu: { brand: 'AMD Threadripper PRO 7995WX', manufacturer: 'AMD', cores: 96, threads: 192, speed: 2.5, speedMax: 5.1 }, ram: { totalGB: 256 }, gpu: { model: 'NVIDIA H100', vramMB: 81920, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 8000 } },
        stats: { str: 90, vit: 86, mag: 94, spd: 85, def: 82, hp: 2838, maxHp: 2838 },
        displayName: 'TR PRO 7995WX', displayGpu: 'H100 80GB',
      },
    ],
  },
  {
    id: 'silicon_throne',
    name: 'SILICON THRONE',
    icon: '⬡',
    iconColor: [220, 180, 255],
    desc: 'Beyond human. Beyond machine. Beyond hope.',
    mythicBonus: 0.02,
    fighters: [
      {
        id: 'st_neural_overseer',
        name: 'NEURAL OVERSEER',
        title: 'The Machine Learning Tyrant',
        taunt: 'I\'ve trained on every battle you\'ve ever fought.',
        tier: 'elite',
        creditBase: 350,
        dropParts: true,
        // HIVEMIND — cores >= 16, str >= 65 → Thread Saturation (raw power, slow)
        specs: { id: 'gym-st-01', cpu: { brand: 'Intel Xeon w9-3595X', manufacturer: 'Intel', cores: 60, threads: 120, speed: 3.2, speedMax: 4.8 }, ram: { totalGB: 128 }, gpu: { model: 'NVIDIA GeForce RTX 5090', vramMB: 49152, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 8000 } },
        stats: { str: 86, vit: 70, mag: 80, spd: 76, def: 64, hp: 2094, maxHp: 2094 },
        displayName: 'Xeon w9-3595X', displayGpu: 'RTX 5090',
      },
      {
        id: 'st_quantum_ghost',
        name: 'QUANTUM GHOST',
        title: 'The Superposition',
        taunt: 'I exist in every state until you observe me.',
        tier: 'elite',
        creditBase: 400,
        dropParts: true,
        // BLITZ — spd >= 65, spd >= str+10, spd >= mag → Zero-Day Exploit
        specs: { id: 'gym-st-02', cpu: { brand: 'AMD Ryzen 9 7900X', manufacturer: 'AMD', cores: 12, threads: 24, speed: 4.7, speedMax: 5.6 }, ram: { totalGB: 64 }, gpu: { model: 'AMD Radeon RX 9070 XTX', vramMB: 40960, vendor: 'AMD' }, storage: { type: 'NVMe', sizeGB: 4000 } },
        stats: { str: 72, vit: 70, mag: 82, spd: 96, def: 66, hp: 2094, maxHp: 2094 },
        displayName: 'Ryzen 9 7900X', displayGpu: 'RX 9070 XTX',
      },
      {
        id: 'st_tensor_beast',
        name: 'TENSOR BEAST',
        title: 'The Compute Monolith',
        taunt: 'I process more in a cycle than you will in a lifetime.',
        tier: 'elite',
        creditBase: 450,
        dropParts: true,
        // ARCMAGE — mag dominant, mag >= str & mag >= spd → Shader Burnout (devastating)
        specs: { id: 'gym-st-03', cpu: { brand: 'Intel Core i9-14900KS', manufacturer: 'Intel', cores: 24, threads: 32, speed: 3.2, speedMax: 6.2 }, ram: { totalGB: 256 }, gpu: { model: 'NVIDIA H100', vramMB: 81920, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 8000 } },
        stats: { str: 62, vit: 82, mag: 95, spd: 78, def: 66, hp: 2640, maxHp: 2640 },
        displayName: 'i9-14900KS', displayGpu: 'H100 80GB',
      },
      {
        id: 'st_void_architect',
        name: 'VOID ARCHITECT',
        title: 'The Reality Compiler',
        taunt: 'I don\'t break systems. I rewrite them.',
        tier: 'apex',
        creditBase: 550,
        dropParts: true,
        // TITAN — avg >= 76, minStat >= 68, avg < 90 → Overheat (colossal burst, stall risk)
        specs: { id: 'gym-st-04', cpu: { brand: 'Intel Xeon w9-3595X', manufacturer: 'Intel', cores: 60, threads: 120, speed: 3.2, speedMax: 4.8 }, ram: { totalGB: 512 }, gpu: { model: 'AMD Instinct MI300X', vramMB: 131072, vendor: 'AMD' }, storage: { type: 'NVMe', sizeGB: 8000 } },
        stats: { str: 92, vit: 88, mag: 94, spd: 86, def: 84, hp: 2941, maxHp: 2941 },
        displayName: 'Xeon w9-3595X', displayGpu: 'MI300X',
      },
      {
        id: 'st_omega_process',
        name: 'OMEGA PROCESS',
        title: 'Gym Boss — The Final Calculation',
        taunt: 'I am the last thing any system ever computes.',
        tier: 'apex',
        creditBase: 700,
        dropParts: true,
        isLeader: true,
        // APEX — avg >= 90, minStat >= 85 → Omniscience (god-tier consistency + regen)
        specs: { id: 'gym-st-05', cpu: { brand: 'AMD Threadripper PRO 7995WX', manufacturer: 'AMD', cores: 96, threads: 192, speed: 2.5, speedMax: 5.1 }, ram: { totalGB: 1024 }, gpu: { model: 'NVIDIA H100', vramMB: 81920, vendor: 'NVIDIA' }, storage: { type: 'NVMe', sizeGB: 16000 } },
        stats: { str: 98, vit: 95, mag: 100, spd: 96, def: 92, hp: 3317, maxHp: 3317 },
        displayName: 'TR PRO 7995WX', displayGpu: 'H100 80GB',
      },
    ],
  },
];

// ─── Persistence ───

function ensureDir() {
  if (!fs.existsSync(WSO_DIR)) fs.mkdirSync(WSO_DIR, { recursive: true });
}

function loadProgress() {
  try {
    if (!fs.existsSync(GYM_FILE)) return {};
    return JSON.parse(fs.readFileSync(GYM_FILE, 'utf8'));
  } catch { return {}; }
}

function saveProgress(data) {
  ensureDir();
  fs.writeFileSync(GYM_FILE, JSON.stringify(data, null, 2));
}

// ─── Progress API ───

function getGymOverview() {
  const data = loadProgress();
  return GYMS.map((gym, gIdx) => {
    const fighters = gym.fighters.map((f, fIdx) => {
      const record = data[f.id] || { clears: 0 };
      // First fighter in first gym is always unlocked
      // Otherwise: previous fighter in this gym must be cleared
      let unlocked = false;
      if (gIdx === 0 && fIdx === 0) {
        unlocked = true;
      } else if (fIdx > 0) {
        const prevId = gym.fighters[fIdx - 1].id;
        unlocked = (data[prevId]?.clears || 0) > 0;
      } else {
        // First fighter in gym 2+: previous gym's leader must be cleared
        const prevGym = GYMS[gIdx - 1];
        const prevLeaderId = prevGym.fighters[prevGym.fighters.length - 1].id;
        unlocked = (data[prevLeaderId]?.clears || 0) > 0;
      }
      return { ...f, clears: record.clears, unlocked };
    });

    const cleared = fighters.every(f => f.clears > 0);
    const gymUnlocked = fighters[0].unlocked;

    return { ...gym, fighters, cleared, unlocked: gymUnlocked };
  });
}

function recordClear(fighterId) {
  const data = loadProgress();
  if (!data[fighterId]) data[fighterId] = { clears: 0 };
  data[fighterId].clears++;
  saveProgress(data);
  return data[fighterId].clears;
}

// ─── Build a fighter with reclear scaling ───
// Stat scaling: 1.08^clears, but individual stats soft-cap at 100.
// HP scales more aggressively to keep fights longer on reclears.
// Archetype is classified from BASE stats (clears=0) to preserve identity,
// then applied to the scaled fighter. This prevents scaling drift
// (e.g., a BERSERKER becoming KERNEL_GOD at high clears).

function buildGymFighter(fighterDef, clears = 0) {
  const scale = Math.pow(1.08, Math.min(clears, 20)); // cap scaling at 20 clears

  // Scale combat stats with soft cap at 100
  function scaleStat(base) {
    const raw = base * scale;
    if (raw <= 100) return Math.round(raw);
    // Diminishing returns above 100: excess grows at 30% rate
    return Math.round(100 + (raw - 100) * 0.3);
  }

  const stats = {
    str: scaleStat(fighterDef.stats.str),
    vit: scaleStat(fighterDef.stats.vit),
    mag: scaleStat(fighterDef.stats.mag),
    spd: scaleStat(fighterDef.stats.spd),
    def: scaleStat(fighterDef.stats.def),
    hp:  Math.round(fighterDef.stats.hp * (1 + clears * 0.12)),  // HP: +12% per clear (linear)
    maxHp: Math.round(fighterDef.stats.maxHp * (1 + clears * 0.12)),
  };

  // Classify archetype from BASE stats to preserve intended identity
  const baseArchetype = classifyArchetype(fighterDef.stats, fighterDef.specs);

  return {
    id: fighterDef.id,
    name: fighterDef.displayName,
    gpu: fighterDef.displayGpu,
    stats,
    specs: fighterDef.specs,
    sprite: getSprite(fighterDef.specs),
    archetype: baseArchetype,
  };
}

function getGymMoves(fighterDef, clears = 0) {
  const fighter = buildGymFighter(fighterDef, clears);
  return assignMoveset(fighter.stats, fighter.specs, fighter.archetype);
}

// ─── Reward calculation ───

function calculateGymRewards(fighterDef, clears, won) {
  if (!won) return { credits: 15, itemTier: null, partEligible: false, partMaxRarity: 'legendary', mythicBonus: 0 };

  const credits = Math.round(fighterDef.creditBase * (1 + 0.15 * clears));

  const tiers = ['low', 'mid', 'high', 'flagship'];
  const itemTierMap = { low: 0, mid: 1, high: 2, flagship: 3, elite: 3, apex: 3 };
  const baseTierIdx = itemTierMap[fighterDef.tier] ?? 3;
  const tierBoost = Math.floor(clears / 3);
  const itemTier = tiers[Math.min(baseTierIdx + tierBoost, tiers.length - 1)];

  const gym = GYMS.find(g => g.fighters.some(f => f.id === fighterDef.id));

  return {
    credits,
    itemTier,
    partEligible: fighterDef.dropParts,
    partMaxRarity: 'legendary',
    mythicBonus: gym?.mythicBonus || 0,
  };
}

// ─── Difficulty label based on base tier + reclear count ───

function getDifficultyLabel(fighterDef, clears) {
  const tierBase = { low: 0, mid: 2, high: 4, flagship: 6, elite: 8, apex: 10 };
  const base = tierBase[fighterDef.tier] || 0;
  const level = base + Math.min(clears, 6); // cap scaling contribution

  if (level <= 0) return { label: 'BEGINNER',     color: [140, 230, 180] };
  if (level <= 1) return { label: 'EASY',         color: [100, 210, 160] };
  if (level <= 2) return { label: 'MODERATE',     color: [220, 220, 120] };
  if (level <= 3) return { label: 'CHALLENGING',  color: [255, 180, 60]  };
  if (level <= 4) return { label: 'HARD',         color: [240, 140, 80]  };
  if (level <= 5) return { label: 'BRUTAL',       color: [240, 100, 100] };
  if (level <= 7) return { label: 'NIGHTMARE',    color: [220, 60, 80]   };
  if (level <= 9) return { label: 'DEMONIC',      color: [200, 50, 200]  };
  return               { label: 'GOD TIER',    color: [255, 215, 0]   };
}

module.exports = {
  GYMS,
  getGymOverview,
  recordClear,
  buildGymFighter,
  getGymMoves,
  calculateGymRewards,
  getDifficultyLabel,
};
