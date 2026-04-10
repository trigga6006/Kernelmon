// ═══════════════════════════════════════════════════════════════
// PACK IT PANIC — Circuit Board Maze Arena
// Two players, a maze of traces, a central core to breach.
// Send attacks along paths, block routes, corrupt traces,
// race to break the core then crash your opponent.
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { ESC, colors, rgb, bgRgb, RESET, BOLD } = require('./palette');
const { createRNG } = require('./rng');

const FPS = 20;
const FRAME_MS = 1000 / FPS;
const MATCH_DURATION = 3 * 60 * FPS;

// ─── Visual Constants ───

const TRACE_COLOR     = rgb(40, 60, 80);
const TRACE_ACTIVE    = rgb(130, 220, 235);
const TRACE_BLOCKED   = rgb(240, 150, 170);
const TRACE_CORRUPT   = rgb(200, 170, 240);
const TRACE_CLOSED    = rgb(25, 30, 40);
const JUNCTION_COLOR  = rgb(80, 90, 110);
const JUNCTION_ACTIVE = rgb(130, 220, 235);
const PLAYER_COLOR    = rgb(130, 220, 235);
const OPP_COLOR       = rgb(180, 160, 240);
const CORE_COLOR      = rgb(240, 220, 140);
const CORE_DAMAGED    = rgb(240, 150, 170);
const CORE_CRACKED    = rgb(200, 60, 80);
const HUD_DIM         = rgb(60, 60, 85);
const INPUT_COLOR     = rgb(230, 230, 245);
const FEEDBACK_OK     = rgb(140, 230, 180);
const FEEDBACK_ERR    = rgb(240, 150, 170);
const CHARGE_COLOR    = rgb(240, 220, 140);
const TITLE_COLOR     = rgb(255, 100, 180);
const TIMER_COLOR     = rgb(130, 220, 235);
const BG_DECOR        = rgb(25, 30, 40);
const GLITCH_CHARS    = '0123456789ABCDEFabcdef{}[]<>|/\\~!@#$%^&*:;'.split('');

const MAX_CHARGE = 10;
const PASSIVE_CHARGE_INTERVAL = 5 * FPS;
const CMD_COOLDOWN_BASE = 5;
const CORE_MAX_HP = 200;

// ─── Packet Visuals ───

const PACKET_DEFS = {
  bolt:    { symbol: '•', color: rgb(130, 220, 235), damage: 8, speed: 0.6, trail: rgb(60, 120, 140), power: 1, pierce: false },
  surge:   { symbol: '◆', color: rgb(240, 220, 140), damage: 16, speed: 0.35, trail: rgb(140, 130, 70), power: 3, pierce: true },
  malware: { symbol: '☠', color: rgb(240, 150, 170), damage: 10, speed: 0.5, trail: rgb(140, 70, 90), power: 2, pierce: false },
};

const HAZARD_DEFS = {
  glitch:  { symbol: '~', color: rgb(200, 170, 240), speed: 0.3, effect: 'scramble' },
  surge_h: { symbol: '⚡', color: rgb(240, 150, 170), speed: 0.4, effect: 'damage', damage: 5 },
  static:  { symbol: '▒', color: rgb(100, 100, 130), speed: 0.25, effect: 'block_edge' },
  worm:    { symbol: '§', color: rgb(240, 220, 140), speed: 0.2, effect: 'spawn_more' },
};

// ─── Maze Graph ───

class MazeGraph {
  constructor(w, h) {
    this.nodes = {};
    this.edges = [];
    this.screenW = w;
    this.screenH = h;
    this.mazeTop = 2;
    this.mazeBot = h - 6;
    this.mazeH = this.mazeBot - this.mazeTop;
  }

  addNode(id, x, y, type) {
    this.nodes[id] = { id, x, y, type, edges: [] };
  }

  addEdge(fromId, toId, waypoints, state, label) {
    const edge = {
      id: this.edges.length,
      from: fromId,
      to: toId,
      waypoints,
      length: waypoints.length,
      state: state || 'OPEN',
      stateTimer: 0,
      label: label || null,
    };
    this.edges.push(edge);
    this.nodes[fromId].edges.push(edge.id);
    this.nodes[toId].edges.push(edge.id);
    return edge;
  }

  getEdge(id) { return this.edges[id]; }
  getNode(id) { return this.nodes[id]; }

  getEdgeByLabel(label) {
    return this.edges.find(e => e.label === label) || null;
  }

  neighborsOf(nodeId) {
    const node = this.nodes[nodeId];
    const result = [];
    for (const eid of node.edges) {
      const e = this.edges[eid];
      if (e.state === 'BLOCKED' || e.state === 'CLOSED') continue;
      const other = e.from === nodeId ? e.to : e.from;
      result.push({ nodeId: other, edgeId: eid });
    }
    return result;
  }

  // BFS shortest path, with optional set of nodes to avoid passing through
  bfs(sourceId, targetId, blockedNodes) {
    const blocked = blockedNodes || new Set();
    const visited = new Set();
    const queue = [{ nodeId: sourceId, path: [] }];
    visited.add(sourceId);
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift();
      if (nodeId === targetId) return path;
      for (const { nodeId: next, edgeId } of this.neighborsOf(nodeId)) {
        if (!visited.has(next) && (next === targetId || !blocked.has(next))) {
          visited.add(next);
          queue.push({ nodeId: next, path: [...path, edgeId] });
        }
      }
    }
    return null;
  }

  // BFS to any node in a set, with optional blocked nodes
  bfsToAny(sourceId, targetIds, blockedNodes) {
    const blocked = blockedNodes || new Set();
    const targetSet = new Set(targetIds);
    const visited = new Set();
    const queue = [{ nodeId: sourceId, path: [] }];
    visited.add(sourceId);
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift();
      if (targetSet.has(nodeId)) return { target: nodeId, path };
      for (const { nodeId: next, edgeId } of this.neighborsOf(nodeId)) {
        if (!visited.has(next) && (targetSet.has(next) || !blocked.has(next))) {
          visited.add(next);
          queue.push({ nodeId: next, path: [...path, edgeId] });
        }
      }
    }
    return null;
  }

  tickEdgeStates() {
    for (const e of this.edges) {
      if (e.stateTimer > 0) {
        e.stateTimer--;
        if (e.stateTimer <= 0) {
          e.state = e._restoreState || 'OPEN';
          delete e._restoreState;
        }
      }
    }
  }

  setEdgeState(edgeId, state, duration, restoreState) {
    const e = this.edges[edgeId];
    if (!e) return;
    e._restoreState = restoreState || (e.state === 'CLOSED' ? 'CLOSED' : 'OPEN');
    e.state = state;
    e.stateTimer = duration;
  }
}

// ─── Build the fixed maze layout ───

function buildMaze(w, h) {
  const graph = new MazeGraph(w, h);
  const cx = Math.floor(w / 2);
  const top = graph.mazeTop;
  const bot = graph.mazeBot;
  const mid = Math.floor((top + bot) / 2);

  // Vertical spacing
  const pRow = bot - 1;      // player row
  const oRow = top + 1;      // opponent row
  const ljRow = pRow - 3;    // lower junctions
  const mlRow = mid + 2;     // mid-lower
  const cRow = mid;           // core
  const muRow = mid - 2;     // mid-upper
  const ujRow = oRow + 3;    // upper junctions

  // Horizontal positions
  const leftX = Math.max(6, Math.floor(cx * 0.2));
  const mleftX = Math.max(12, Math.floor(cx * 0.5));
  const mrightX = Math.min(w - 13, Math.floor(cx * 1.5));
  const rightX = Math.min(w - 7, Math.floor(cx * 1.8));

  // Player access nodes
  graph.addNode('P1', leftX + 3, pRow, 'PLAYER');
  graph.addNode('P2', cx, pRow, 'PLAYER');
  graph.addNode('P3', rightX - 3, pRow, 'PLAYER');

  // Opponent access nodes
  graph.addNode('O1', leftX + 3, oRow, 'OPPONENT');
  graph.addNode('O2', cx, oRow, 'OPPONENT');
  graph.addNode('O3', rightX - 3, oRow, 'OPPONENT');

  // Lower junctions
  graph.addNode('J11', leftX, ljRow, 'JUNCTION');
  graph.addNode('J12', mleftX, ljRow, 'JUNCTION');
  graph.addNode('J13', mrightX, ljRow, 'JUNCTION');
  graph.addNode('J14', rightX, ljRow, 'JUNCTION');

  // Mid-lower
  graph.addNode('J8', mleftX - 2, mlRow, 'JUNCTION');
  graph.addNode('J9', cx, mlRow, 'JUNCTION');
  graph.addNode('J10', mrightX + 2, mlRow, 'JUNCTION');

  // Core
  graph.addNode('CORE', cx, cRow, 'CORE');

  // Mid-upper
  graph.addNode('J5', mleftX - 2, muRow, 'JUNCTION');
  graph.addNode('J6', cx, muRow, 'JUNCTION');
  graph.addNode('J7', mrightX + 2, muRow, 'JUNCTION');

  // Upper junctions
  graph.addNode('J1', leftX, ujRow, 'JUNCTION');
  graph.addNode('J2', mleftX, ujRow, 'JUNCTION');
  graph.addNode('J3', mrightX, ujRow, 'JUNCTION');
  graph.addNode('J4', rightX, ujRow, 'JUNCTION');

  // Helper: generate waypoints between two nodes with a clean path
  function trace(fromId, toId) {
    const a = graph.getNode(fromId);
    const b = graph.getNode(toId);
    const pts = [];
    // L-shaped path: go horizontal first, then vertical
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let cx1 = a.x, cy1 = a.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal first, then vertical
      const stepX = dx > 0 ? 1 : -1;
      for (let i = 0; i !== dx; i += stepX) {
        pts.push({ x: a.x + i, y: a.y });
      }
      const stepY = dy > 0 ? 1 : -1;
      for (let i = 0; i !== dy + stepY; i += stepY) {
        pts.push({ x: b.x, y: a.y + i });
      }
    } else {
      // Vertical first, then horizontal
      const stepY = dy > 0 ? 1 : -1;
      for (let i = 0; i !== dy; i += stepY) {
        pts.push({ x: a.x, y: a.y + i });
      }
      const stepX = dx > 0 ? 1 : -1;
      for (let i = 0; i !== dx + stepX; i += stepX) {
        pts.push({ x: a.x + i, y: b.y });
      }
    }
    if (pts.length === 0 || pts[pts.length - 1].x !== b.x || pts[pts.length - 1].y !== b.y) {
      pts.push({ x: b.x, y: b.y });
    }
    return pts;
  }

  // ── Player side edges (labeled 1-6 for commands) ──
  graph.addEdge('P1', 'J11', trace('P1', 'J11'), 'OPEN', 1);
  graph.addEdge('P2', 'J12', trace('P2', 'J12'), 'OPEN', 2);
  graph.addEdge('P2', 'J13', trace('P2', 'J13'), 'OPEN', 3);
  graph.addEdge('P3', 'J14', trace('P3', 'J14'), 'OPEN', 4);

  // Lower → mid
  graph.addEdge('J11', 'J8', trace('J11', 'J8'), 'OPEN');
  graph.addEdge('J12', 'J9', trace('J12', 'J9'), 'OPEN');
  graph.addEdge('J13', 'J9', trace('J13', 'J9'), 'OPEN');
  graph.addEdge('J14', 'J10', trace('J14', 'J10'), 'OPEN');

  // Horizontal shortcuts (CLOSED by default)
  graph.addEdge('J11', 'J12', trace('J11', 'J12'), 'CLOSED', 5);
  graph.addEdge('J13', 'J14', trace('J13', 'J14'), 'CLOSED', 6);

  // Mid → core
  graph.addEdge('J8', 'CORE', trace('J8', 'CORE'), 'OPEN');
  graph.addEdge('J9', 'CORE', trace('J9', 'CORE'), 'OPEN');
  graph.addEdge('J10', 'CORE', trace('J10', 'CORE'), 'OPEN');

  // ── Opponent side edges (mirror, no labels) ──
  graph.addEdge('O1', 'J1', trace('O1', 'J1'), 'OPEN');
  graph.addEdge('O2', 'J2', trace('O2', 'J2'), 'OPEN');
  graph.addEdge('O2', 'J3', trace('O2', 'J3'), 'OPEN');
  graph.addEdge('O3', 'J4', trace('O3', 'J4'), 'OPEN');

  graph.addEdge('J1', 'J5', trace('J1', 'J5'), 'OPEN');
  graph.addEdge('J2', 'J6', trace('J2', 'J6'), 'OPEN');
  graph.addEdge('J3', 'J6', trace('J3', 'J6'), 'OPEN');
  graph.addEdge('J4', 'J7', trace('J4', 'J7'), 'OPEN');

  graph.addEdge('J1', 'J2', trace('J1', 'J2'), 'CLOSED');
  graph.addEdge('J3', 'J4', trace('J3', 'J4'), 'CLOSED');

  graph.addEdge('J5', 'CORE', trace('J5', 'CORE'), 'OPEN');
  graph.addEdge('J6', 'CORE', trace('J6', 'CORE'), 'OPEN');
  graph.addEdge('J7', 'CORE', trace('J7', 'CORE'), 'OPEN');

  // Cross links near core
  graph.addEdge('J8', 'J10', trace('J8', 'J10'), 'CLOSED');
  graph.addEdge('J5', 'J7', trace('J5', 'J7'), 'CLOSED');

  return graph;
}

// ─── Pre-render maze background ───

function prerenderMaze(graph) {
  const bg = [];
  for (let y = 0; y < graph.screenH; y++) {
    const row = [];
    for (let x = 0; x < graph.screenW; x++) {
      row.push({ char: ' ', fg: null });
    }
    bg.push(row);
  }

  // Draw edges
  for (const edge of graph.edges) {
    const col = edge.state === 'CLOSED' ? TRACE_CLOSED : TRACE_COLOR;
    for (let i = 0; i < edge.waypoints.length; i++) {
      const wp = edge.waypoints[i];
      if (wp.x < 0 || wp.x >= graph.screenW || wp.y < 0 || wp.y >= graph.screenH) continue;

      let prev = i > 0 ? edge.waypoints[i - 1] : null;
      let next = i < edge.waypoints.length - 1 ? edge.waypoints[i + 1] : null;

      let ch = '·';
      if (prev && next) {
        const fromH = prev.y === wp.y;
        const toH = next.y === wp.y;
        if (fromH && toH) ch = '─';
        else if (!fromH && !toH) ch = '│';
        else if (fromH && !toH) {
          if (prev.x < wp.x && next.y > wp.y) ch = '┐';
          else if (prev.x < wp.x && next.y < wp.y) ch = '┘';
          else if (prev.x > wp.x && next.y > wp.y) ch = '┌';
          else ch = '└';
        } else {
          if (next.x > wp.x && prev.y < wp.y) ch = '└';
          else if (next.x > wp.x && prev.y > wp.y) ch = '┌';
          else if (next.x < wp.x && prev.y < wp.y) ch = '┘';
          else ch = '┐';
        }
      } else if (prev || next) {
        const other = prev || next;
        if (other.y === wp.y) ch = '─';
        else ch = '│';
      }

      bg[wp.y][wp.x] = { char: ch, fg: col };
    }
  }

  // Draw junction nodes
  for (const [id, node] of Object.entries(graph.nodes)) {
    if (node.x < 0 || node.x >= graph.screenW || node.y < 0 || node.y >= graph.screenH) continue;
    if (node.type === 'JUNCTION') {
      bg[node.y][node.x] = { char: '◈', fg: JUNCTION_COLOR };
    }
  }

  // Sparse decorative circuit elements
  const rng = createRNG(42);
  for (let y = graph.mazeTop; y <= graph.mazeBot; y++) {
    for (let x = 0; x < graph.screenW; x++) {
      if (bg[y][x].char === ' ' && rng.chance(0.03)) {
        bg[y][x] = { char: rng.pick(['·', '∙', ':', '.']), fg: BG_DECOR };
      }
    }
  }

  return bg;
}

// ─── Packet Manager ───

class PacketManager {
  constructor(graph) {
    this.graph = graph;
    this.packets = [];
    this.nextId = 0;
  }

  send(fromNode, edgePath, type, owner, direction) {
    const def = PACKET_DEFS[type] || PACKET_DEFS.bolt;
    this.packets.push({
      id: this.nextId++,
      type,
      owner,
      direction, // 1 = toward opponent, -1 = toward player
      edgePath,
      pathIndex: 0,
      edgeProgress: 0,
      speed: def.speed,
      symbol: def.symbol,
      color: def.color,
      trail: def.trail,
      damage: def.damage,
      power: def.power || 1,
      pierce: def.pierce || false,
      alive: true,
    });
  }

  sendHazard(fromNode, edgePath, type, direction) {
    const def = HAZARD_DEFS[type];
    if (!def) return;
    this.packets.push({
      id: this.nextId++,
      type,
      owner: 'hazard',
      direction,
      edgePath,
      pathIndex: 0,
      edgeProgress: 0,
      speed: def.speed,
      symbol: def.symbol,
      color: def.color,
      trail: null,
      damage: def.damage || 0,
      effect: def.effect,
      alive: true,
    });
  }

  tick() {
    const arrivals = [];

    // ── Move packets ──
    for (const p of this.packets) {
      if (!p.alive) continue;
      if (p.pathIndex >= p.edgePath.length) {
        p.alive = false;
        continue;
      }

      const edge = this.graph.getEdge(p.edgePath[p.pathIndex]);
      if (!edge) { p.alive = false; continue; }

      // Check edge state
      if (edge.state === 'BLOCKED') {
        if (p.pierce) {
          // Pierce packets smash through blocks and destroy them
          edge.state = 'OPEN';
          edge.stateTimer = 0;
        } else {
          p.alive = false;
          continue;
        }
      }
      if (edge.state === 'CORRUPTED') {
        if (p.pierce) {
          // Pierce packets ignore corruption
        } else {
          p.direction *= -1;
          p.owner = p.owner === 'player' ? 'opponent' : (p.owner === 'opponent' ? 'player' : p.owner);
          p.edgePath = p.edgePath.slice(0, p.pathIndex + 1).reverse();
          p.pathIndex = 0;
          p.edgeProgress = 1 - p.edgeProgress;
          continue;
        }
      }

      p.edgeProgress += p.speed / Math.max(1, edge.length);
      if (p.edgeProgress >= 1) {
        p.edgeProgress = 0;
        p.pathIndex++;
        if (p.pathIndex >= p.edgePath.length) {
          const lastEdge = this.graph.getEdge(p.edgePath[p.edgePath.length - 1]);
          let destNode;
          const prevEdgeIdx = p.edgePath.length >= 2 ? p.edgePath[p.edgePath.length - 2] : null;
          if (prevEdgeIdx != null) {
            const prevEdge = this.graph.getEdge(prevEdgeIdx);
            const sharedNode = (lastEdge.from === prevEdge.from || lastEdge.from === prevEdge.to) ? lastEdge.from : lastEdge.to;
            destNode = lastEdge.from === sharedNode ? lastEdge.to : lastEdge.from;
          } else {
            destNode = p.direction > 0 ? lastEdge.to : lastEdge.from;
          }
          arrivals.push({ packet: p, destNode });
          p.alive = false;
        }
      }
    }

    // ── Collision detection: opposing packets on the same edge ──
    for (let i = 0; i < this.packets.length; i++) {
      const a = this.packets[i];
      if (!a.alive || a.owner === 'hazard') continue;
      for (let j = i + 1; j < this.packets.length; j++) {
        const b = this.packets[j];
        if (!b.alive || b.owner === 'hazard') continue;
        // Must be opposing owners
        if (a.owner === b.owner) continue;
        // Must be on the same edge
        if (a.pathIndex >= a.edgePath.length || b.pathIndex >= b.edgePath.length) continue;
        const aEdge = a.edgePath[a.pathIndex];
        const bEdge = b.edgePath[b.pathIndex];
        if (aEdge !== bEdge) continue;
        // Must be close to each other on the edge (within 30% progress)
        if (Math.abs(a.edgeProgress - (1 - b.edgeProgress)) > 0.3) continue;

        // Collision! Higher power wins
        if (a.power > b.power) {
          b.alive = false;
          a.damage = Math.max(1, a.damage - (b.damage || 0)); // reduced but survives
        } else if (b.power > a.power) {
          a.alive = false;
          b.damage = Math.max(1, b.damage - (a.damage || 0));
        } else {
          // Equal power: both destroyed
          a.alive = false;
          b.alive = false;
        }
      }
    }

    // ── Attack packets destroy hazards on contact ──
    for (const atk of this.packets) {
      if (!atk.alive || atk.owner === 'hazard') continue;
      for (const hz of this.packets) {
        if (!hz.alive || hz.owner !== 'hazard') continue;
        if (atk.pathIndex >= atk.edgePath.length || hz.pathIndex >= hz.edgePath.length) continue;
        if (atk.edgePath[atk.pathIndex] !== hz.edgePath[hz.pathIndex]) continue;
        if (Math.abs(atk.edgeProgress - hz.edgeProgress) < 0.3) {
          hz.alive = false; // attack eats the hazard
        }
      }
    }

    this.packets = this.packets.filter(p => p.alive);
    return arrivals;
  }

  getScreenPos(packet) {
    if (packet.pathIndex >= packet.edgePath.length) return null;
    const edge = this.graph.getEdge(packet.edgePath[packet.pathIndex]);
    if (!edge) return null;
    const wpIndex = Math.min(
      Math.floor(packet.edgeProgress * edge.waypoints.length),
      edge.waypoints.length - 1
    );
    return edge.waypoints[wpIndex];
  }

  destroyAll() {
    this.packets = [];
  }
}

// ─── Core Node ───

class CoreNode {
  constructor(maxHp) {
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.breached = false;
    this.damageFlash = 0;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.damageFlash = 6;
    if (this.hp <= 0 && !this.breached) {
      this.breached = true;
    }
  }

  tick() {
    if (this.damageFlash > 0) this.damageFlash--;
  }

  render(screen, x, y, frame) {
    const ratio = this.hp / this.maxHp;
    let boxColor, textColor;
    if (this.breached) {
      boxColor = frame % 8 < 4 ? CORE_CRACKED : rgb(120, 30, 40);
      textColor = CORE_CRACKED;
    } else if (this.damageFlash > 0) {
      boxColor = rgb(255, 255, 255);
      textColor = rgb(255, 255, 255);
    } else {
      boxColor = ratio > 0.5 ? CORE_COLOR : CORE_DAMAGED;
      textColor = boxColor;
    }

    // 7x3 core box
    const bx = x - 3;
    const by = y - 1;
    screen.set(bx, by, '╔', boxColor);
    for (let i = 1; i <= 5; i++) screen.set(bx + i, by, '═', boxColor);
    screen.set(bx + 6, by, '╗', boxColor);

    screen.set(bx, by + 1, '║', boxColor);
    if (this.breached) {
      const glitch = GLITCH_CHARS[frame % GLITCH_CHARS.length];
      screen.text(bx + 1, by + 1, `X${glitch}${glitch}${glitch}${glitch}X`, CORE_CRACKED);
    } else {
      screen.text(bx + 1, by + 1, ' CORE ', textColor, null, true);
    }
    screen.set(bx + 6, by + 1, '║', boxColor);

    screen.set(bx, by + 2, '╚', boxColor);
    for (let i = 1; i <= 5; i++) screen.set(bx + i, by + 2, '═', boxColor);
    screen.set(bx + 6, by + 2, '╝', boxColor);

    // HP bar below core
    if (!this.breached) {
      const barW = 7;
      screen.bar(bx, by + 3, barW, ratio, ratio > 0.5 ? CORE_COLOR : CORE_DAMAGED, HUD_DIM);
    } else {
      screen.centerText(by + 3, 'BREACH', CORE_CRACKED, null, true);
    }
  }
}

// ─── AI Opponent ───

class MazeAI {
  constructor(rng, graph) {
    this.rng = rng;
    this.graph = graph;
    this.currentNode = 'O2'; // start center
    this.nextAction = 0;
    this.accessNodes = ['O1', 'O2', 'O3'];
  }

  tick(frame, charge, coreBreached, playerNodes, oppNodes) {
    if (frame < this.nextAction) return null;

    // AI starts slow, ramps up — faster once core is breached
    const baseDelay = coreBreached
      ? Math.max(10, 25 - Math.floor(frame / MATCH_DURATION * 15))
      : Math.max(20, 45 - Math.floor(frame / MATCH_DURATION * 20));
    this.nextAction = frame + this.rng.int(baseDelay, baseDelay + 15);

    // Occasionally reposition
    if (this.rng.chance(0.2)) {
      this.currentNode = this.rng.pick(this.accessNodes);
    }

    // Attack if possible
    if (this.rng.chance(0.6)) {
      const target = coreBreached ? 'player' : 'core';
      return { type: 'attack', from: this.currentNode, target, pktType: 'bolt' };
    }

    // Use charge for abilities
    if (charge >= 4 && this.rng.chance(0.25)) {
      return { type: 'surge', from: this.currentNode };
    }

    if (charge >= 2 && this.rng.chance(0.15)) {
      // Block a random player-side edge
      const playerEdges = this.graph.edges.filter(e =>
        e.label && e.state === 'OPEN'
      );
      if (playerEdges.length > 0) {
        const e = this.rng.pick(playerEdges);
        return { type: 'block', edgeId: e.id };
      }
    }

    return { type: 'attack', from: this.currentNode, target: coreBreached ? 'player' : 'core', pktType: 'bolt' };
  }
}

// ─── Hazard Spawner ───

class HazardSpawner {
  constructor(graph, rng) {
    this.graph = graph;
    this.rng = rng;
    this.nextSpawn = 10 * FPS; // start after 10 seconds - give player time to orient
  }

  tick(frame, packetManager, coreBreached) {
    if (frame < this.nextSpawn) return;

    // Spawn rate increases over time, but starts very slow
    const elapsed = frame / MATCH_DURATION;
    const interval = coreBreached
      ? Math.max(30, 80 - Math.floor(elapsed * 50))
      : Math.max(60, 140 - Math.floor(elapsed * 80));
    this.nextSpawn = frame + this.rng.int(interval, interval + 40);

    // Pick hazard type
    const types = Object.keys(HAZARD_DEFS);
    const type = this.rng.pick(types);

    // Send toward player (down) and opponent (up)
    const playerTargets = ['P1', 'P2', 'P3'];
    const oppTargets = ['O1', 'O2', 'O3'];

    const pTarget = this.rng.pick(playerTargets);
    const pathDown = this.graph.bfs('CORE', pTarget);
    if (pathDown) {
      packetManager.sendHazard('CORE', pathDown, type, -1);
    }

    // Also send toward opponent sometimes
    if (this.rng.chance(0.5)) {
      const oTarget = this.rng.pick(oppTargets);
      const pathUp = this.graph.bfs('CORE', oTarget);
      if (pathUp) {
        packetManager.sendHazard('CORE', pathUp, type, 1);
      }
    }
  }
}

// ─── Command Parser ───

function parseCommand(input) {
  const cmd = input.trim().toLowerCase();
  if (!cmd) return null;

  // Basic commands
  if (cmd === 'atk' || cmd === 'attack') return { type: 'atk' };
  if (/^blk\s?[1-6]$/.test(cmd)) return { type: 'blk', edge: parseInt(cmd.replace(/\D/g, '')) };
  if (/^clr\s?[1-6]$/.test(cmd)) return { type: 'clr', edge: parseInt(cmd.replace(/\D/g, '')) };
  if (cmd === 'clr' || cmd === 'clear') return { type: 'clr_node' };
  if (cmd === 'def' || cmd === 'defend') return { type: 'def' };

  // Hidden commands
  if (cmd === 'surge') return { type: 'surge' };
  if (/^corrupt\s?[1-6]$/.test(cmd)) return { type: 'corrupt', edge: parseInt(cmd.replace(/\D/g, '')) };
  if (cmd === 'shortcut') return { type: 'shortcut' };
  if (cmd === 'overload') return { type: 'overload' };
  if (cmd === 'siphon') return { type: 'siphon' };
  if (cmd === 'emp') return { type: 'emp' };
  if (cmd === 'backdoor') return { type: 'backdoor' };
  if (cmd === 'firewall') return { type: 'firewall' };

  return null;
}

function commandCost(type) {
  const costs = {
    atk: 0, blk: 2, clr: 1, clr_node: 0, def: 3,
    surge: 4, corrupt: 4, shortcut: 5, overload: 6,
    siphon: 3, emp: 8, backdoor: 7, firewall: 5,
  };
  return costs[type] || 0;
}

// ─── Integrity Color ───

function integrityColor(ratio) {
  if (ratio > 0.6) return rgb(140, 230, 180);
  if (ratio > 0.3) return rgb(240, 220, 140);
  return rgb(240, 150, 170);
}

// ─── Main Game ───

async function renderPackItPanic(fighter) {
  const screen = new Screen();
  screen.padded();
  const w = screen.width;
  const h = screen.height;
  const rng = createRNG(Date.now());

  // Rig stats (light touch)
  const vit = (fighter && fighter.stats && fighter.stats.vit) || 50;
  const spd = (fighter && fighter.stats && fighter.stats.spd) || 50;
  const maxIntegrity = 100 + Math.floor(vit / 10);
  const cmdCooldown = Math.max(2, CMD_COOLDOWN_BASE - Math.floor(spd / 25));

  // Build maze
  const graph = buildMaze(w, h);
  const background = prerenderMaze(graph);
  const coreNode = graph.getNode('CORE');
  const core = new CoreNode(CORE_MAX_HP);
  const packetManager = new PacketManager(graph);
  const hazardSpawner = new HazardSpawner(graph, createRNG(Date.now() + 99));
  const aiRng = createRNG(Date.now() + 42);
  const ai = new MazeAI(aiRng, graph);

  // Player state
  let playerNode = 'P2';
  let playerIntegrity = maxIntegrity;
  let playerCharge = 0;
  let playerShield = false;
  let playerFirewall = 0;
  let playerScramble = 0;

  // Opponent state
  let oppIntegrity = maxIntegrity;
  let oppCharge = 0;

  // Game state
  let gameState = 'boot';
  let frame = 0;
  let bootFrame = 0;
  const BOOT_FRAMES = 60;
  let inputBuffer = '';
  let feedbackText = '';
  let feedbackColor = FEEDBACK_OK;
  let feedbackTimer = 0;
  let cmdCooldownTimer = 0;
  let gameOverFrame = 0;
  let lastDamageFrame = -100;

  // Battle log — shows recent events, scrolls
  const battleLog = [];
  const MAX_LOG = 6;
  function logEvent(text, color) {
    battleLog.push({ text, color: color || rgb(80, 85, 100), frame });
    if (battleLog.length > MAX_LOG) battleLog.shift();
  }

  const playerAccessNodes = ['P1', 'P2', 'P3'];
  const oppAccessNodes = ['O1', 'O2', 'O3'];

  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  screen.enter();

  let resolve;
  const resultPromise = new Promise(r => { resolve = r; });

  function setFeedback(text, ok) {
    feedbackText = text;
    feedbackColor = ok ? FEEDBACK_OK : FEEDBACK_ERR;
    feedbackTimer = 30;
    if (ok) logEvent(`YOU: ${text}`, PLAYER_COLOR);
  }

  function sendAttack(fromNodeId, pktType, owner, targets) {
    let pathResult;
    if (!core.breached) {
      // Route to the core only — core blocks passage to opponent
      pathResult = graph.bfs(fromNodeId, 'CORE');
    } else {
      // Core is down — route through it to reach opponent
      pathResult = graph.bfsToAny(fromNodeId, targets);
      if (pathResult) pathResult = pathResult.path;
    }
    if (!pathResult || pathResult.length === 0) {
      return false;
    }
    const dir = owner === 'player' ? 1 : -1;
    packetManager.send(fromNodeId, pathResult, pktType, owner, dir);
    return true;
  }

  function executeCommand(parsed) {
    const cost = commandCost(parsed.type);
    if (cost > 0 && playerCharge < cost) {
      setFeedback(`Need ${cost} charge (have ${Math.floor(playerCharge)})`, false);
      return;
    }
    if (cost > 0) playerCharge -= cost;

    switch (parsed.type) {
      case 'atk': {
        const ok = sendAttack(playerNode, 'bolt', 'player', oppAccessNodes);
        if (ok) setFeedback('Bolt sent', true);
        else setFeedback('No path available', false);
        break;
      }
      case 'surge': {
        const ok = sendAttack(playerNode, 'surge', 'player', oppAccessNodes);
        if (ok) setFeedback('Surge launched', true);
        else { setFeedback('No path available', false); playerCharge += cost; }
        break;
      }
      case 'blk': {
        const edge = graph.getEdgeByLabel(parsed.edge);
        if (!edge) { setFeedback('Invalid edge', false); playerCharge += cost; break; }
        if (edge.state === 'BLOCKED') { setFeedback('Already blocked', false); playerCharge += cost; break; }
        graph.setEdgeState(edge.id, 'BLOCKED', 5 * FPS);
        setFeedback(`Blocked path ${parsed.edge}`, true);
        break;
      }
      case 'clr': {
        const edge = graph.getEdgeByLabel(parsed.edge);
        if (!edge) { setFeedback('Invalid edge', false); playerCharge += cost; break; }
        if (edge.state === 'OPEN') { setFeedback('Path is clear', false); playerCharge += cost; break; }
        edge.state = 'OPEN';
        edge.stateTimer = 0;
        setFeedback(`Cleared path ${parsed.edge}`, true);
        break;
      }
      case 'clr_node': {
        // Clear incoming hazard at current node
        let cleared = false;
        for (const p of packetManager.packets) {
          if (p.owner === 'hazard' && p.alive) {
            const pos = packetManager.getScreenPos(p);
            const myNode = graph.getNode(playerNode);
            if (pos && Math.abs(pos.x - myNode.x) < 3 && Math.abs(pos.y - myNode.y) < 2) {
              p.alive = false;
              playerCharge = Math.min(MAX_CHARGE, playerCharge + 1);
              setFeedback('Hazard cleared (+1 charge)', true);
              cleared = true;
              break;
            }
          }
        }
        if (!cleared) setFeedback('Nothing to clear', false);
        break;
      }
      case 'def': {
        playerShield = true;
        setFeedback('Shield active (1 hit)', true);
        break;
      }
      case 'corrupt': {
        const edge = graph.getEdgeByLabel(parsed.edge);
        if (!edge) { setFeedback('Invalid edge', false); playerCharge += cost; break; }
        graph.setEdgeState(edge.id, 'CORRUPTED', 8 * FPS);
        setFeedback(`Corrupted path ${parsed.edge}`, true);
        break;
      }
      case 'shortcut': {
        const closedEdges = graph.edges.filter(e => e.state === 'CLOSED');
        if (closedEdges.length === 0) { setFeedback('No shortcuts available', false); playerCharge += cost; break; }
        const nearest = closedEdges[0]; // open first available
        graph.setEdgeState(nearest.id, 'OPEN', 10 * FPS, 'CLOSED');
        setFeedback('Shortcut opened', true);
        break;
      }
      case 'overload': {
        let sent = 0;
        const myNode = graph.getNode(playerNode);
        for (const eid of myNode.edges) {
          const edge = graph.getEdge(eid);
          if (edge.state === 'OPEN') {
            sendAttack(playerNode, 'bolt', 'player', oppAccessNodes);
            sent++;
          }
        }
        setFeedback(`Overload: ${sent} bolts sent`, true);
        break;
      }
      case 'siphon': {
        const stolen = Math.min(2, oppCharge);
        oppCharge -= stolen;
        playerCharge = Math.min(MAX_CHARGE, playerCharge + stolen);
        setFeedback(`Siphoned ${stolen} charge`, true);
        break;
      }
      case 'emp': {
        const count = packetManager.packets.length;
        packetManager.destroyAll();
        setFeedback(`EMP: ${count} packets destroyed`, true);
        break;
      }
      case 'backdoor': {
        if (!core.breached) {
          core.takeDamage(PACKET_DEFS.bolt.damage);
          setFeedback('Backdoor: core hit directly', true);
        } else {
          oppIntegrity = Math.max(0, oppIntegrity - PACKET_DEFS.bolt.damage);
          setFeedback('Backdoor: opponent hit directly', true);
        }
        break;
      }
      case 'firewall': {
        playerFirewall = 3 * FPS;
        setFeedback('Firewall active for 3s', true);
        break;
      }
    }
  }

  // ─── Input Handler ───

  function onKey(key) {
    if (key === '\x03' || key === '\x1b') {
      cleanup();
      screen.exit();
      resolve({ won: false, myIntegrity: playerIntegrity, oppIntegrity, reason: 'quit' });
      return;
    }

    if (gameState === 'gameover') {
      if (gameOverFrame > 40) {
        cleanup();
        screen.exit();
        resolve({
          won: oppIntegrity <= 0 || playerIntegrity > oppIntegrity,
          myIntegrity: playerIntegrity,
          oppIntegrity,
          reason: playerIntegrity <= 0 ? 'crash' : (oppIntegrity <= 0 ? 'opponent_crash' : 'timeout'),
        });
      }
      return;
    }

    if (gameState !== 'play') return;

    // Arrow keys for movement (arrow keys only, no WASD - need those letters for typing)
    if (key === '\x1b[D') {
      const idx = playerAccessNodes.indexOf(playerNode);
      if (idx > 0) playerNode = playerAccessNodes[idx - 1];
      return;
    }
    if (key === '\x1b[C') {
      const idx = playerAccessNodes.indexOf(playerNode);
      if (idx < playerAccessNodes.length - 1) playerNode = playerAccessNodes[idx + 1];
      return;
    }
    // Swallow other escape sequences (up/down arrows, etc.)
    if (key.startsWith('\x1b[')) return;

    // Typing
    if (key === '\r' || key === '\n') {
      if (cmdCooldownTimer > 0) {
        setFeedback('Cooldown...', false);
      } else {
        const parsed = parseCommand(inputBuffer);
        if (parsed) {
          executeCommand(parsed);
          cmdCooldownTimer = cmdCooldown;
        } else if (inputBuffer.trim()) {
          setFeedback(`Unknown command`, false);
        }
      }
      inputBuffer = '';
    } else if (key === '\x7f' || key === '\b') {
      inputBuffer = inputBuffer.slice(0, -1);
    } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
      if (playerScramble > 0) {
        // Scramble effect: random character
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        inputBuffer += chars[Math.floor(Math.random() * chars.length)];
      } else {
        if (inputBuffer.length < 12) inputBuffer += key;
      }
    }
  }

  stdin.on('data', onKey);

  // ─── Game Loop ───

  const gameLoop = setInterval(() => {
    frame++;
    screen.clear();

    // ── Boot ──
    if (gameState === 'boot') {
      bootFrame++;
      const cy = Math.floor(h / 2);

      // Progressive maze reveal
      const revealProgress = bootFrame / BOOT_FRAMES;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cell = background[y] && background[y][x];
          if (cell && cell.char !== ' ') {
            const distFromCenter = Math.abs(y - cy) / (h / 2);
            if (distFromCenter < revealProgress) {
              screen.set(x, y, cell.char, cell.fg);
            } else if (distFromCenter < revealProgress + 0.1) {
              screen.set(x, y, GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)], rgb(rng.int(60, 150), rng.int(40, 100), rng.int(80, 160)));
            }
          }
        }
      }

      const countdown = 3 - Math.floor(bootFrame / FPS);
      if (countdown > 0) {
        screen.centerText(cy, `${countdown}`, rgb(255, 255, 255), null, true);
      } else {
        screen.centerText(cy, 'R O U T E !', FEEDBACK_OK, null, true);
      }

      screen.centerText(0, 'P A C K  I T  P A N I C', TITLE_COLOR, null, true);

      // Show basic commands during boot
      if (bootFrame > 20 && bootFrame < BOOT_FRAMES - 5) {
        screen.centerText(h - 3, 'atk: attack  blk N: block  clr N: clear  def: shield', rgb(80, 80, 110));
        screen.centerText(h - 2, 'Arrow keys: move between nodes', rgb(80, 80, 110));
      }

      screen.render();
      if (bootFrame >= BOOT_FRAMES) {
        gameState = 'play';
        frame = 0;
      }
      return;
    }

    // ── Game Over ──
    if (gameState === 'gameover') {
      gameOverFrame++;
      const cy = Math.floor(h / 2);
      const playerWon = oppIntegrity <= 0 || playerIntegrity > oppIntegrity;

      for (let i = 0; i < Math.min(gameOverFrame * 3, 60); i++) {
        const gx = rng.int(0, w - 1);
        const gy = rng.int(0, h - 1);
        const ch = GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)];
        screen.set(gx, gy, ch, playerWon ? rgb(rng.int(60, 140), rng.int(180, 255), rng.int(100, 180)) : rgb(rng.int(180, 255), rng.int(20, 60), rng.int(40, 80)));
      }

      const text = playerWon ? 'S Y S T E M  S E C U R E' : 'S Y S T E M  C R A S H';
      const textColor = playerWon ? FEEDBACK_OK : FEEDBACK_ERR;
      const revealLen = Math.min(gameOverFrame, text.length);
      screen.centerText(cy - 1, text.slice(0, revealLen), textColor, null, true);

      if (gameOverFrame > 15) {
        screen.centerText(cy + 1, `YOU: ${playerIntegrity}%  |  OPP: ${oppIntegrity}%`, INPUT_COLOR);
      }
      if (gameOverFrame > 40) {
        screen.centerText(cy + 3, 'Press any key', rgb(100, 100, 130));
      }

      screen.render();
      return;
    }

    // ══ Main Gameplay ══

    const remaining = Math.max(0, MATCH_DURATION - frame);
    const seconds = Math.floor(remaining / FPS);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timerStr = `${minutes}:${secs.toString().padStart(2, '0')}`;

    // Tick systems
    graph.tickEdgeStates();
    core.tick();
    hazardSpawner.tick(frame, packetManager, core.breached);

    const coreWasIntact = !core.breached;
    const arrivals = packetManager.tick();

    // Handle arrivals
    for (const { packet, destNode } of arrivals) {
      const node = graph.getNode(destNode);
      if (!node) continue;

      if (destNode === 'CORE' && !core.breached) {
        core.takeDamage(packet.damage);
        const who = packet.owner === 'player' ? 'YOU' : 'OPP';
        logEvent(`${who}: hit core (-${packet.damage} hp)`, packet.owner === 'player' ? PLAYER_COLOR : OPP_COLOR);
      } else if (node.type === 'PLAYER') {
        if (packet.owner === 'hazard') {
          if (packet.effect === 'damage') {
            if (playerFirewall > 0) { logEvent('Firewall blocked hazard', FEEDBACK_OK); continue; }
            if (playerShield) { playerShield = false; logEvent('Shield blocked hazard', FEEDBACK_OK); continue; }
            playerIntegrity = Math.max(0, playerIntegrity - packet.damage);
            lastDamageFrame = frame;
            logEvent(`Hazard hit you (-${packet.damage})`, FEEDBACK_ERR);
          } else if (packet.effect === 'scramble') {
            playerScramble = 2 * FPS;
            logEvent('Glitch! Input scrambled', rgb(200, 170, 240));
          } else if (packet.effect === 'block_edge') {
            const lastEdgeId = packet.edgePath[packet.edgePath.length - 1];
            if (lastEdgeId != null) graph.setEdgeState(lastEdgeId, 'BLOCKED', 3 * FPS);
            logEvent('Static blocked a path', rgb(100, 100, 130));
          } else if (packet.effect === 'spawn_more') {
            for (let i = 0; i < 2; i++) {
              const target = rng.pick(playerAccessNodes);
              const path = graph.bfs('CORE', target);
              if (path) packetManager.sendHazard('CORE', path, 'worm', -1);
            }
            logEvent('Worm spawned more worms!', rgb(240, 220, 140));
          }
        } else if (packet.owner === 'opponent') {
          if (playerFirewall > 0) { logEvent('Firewall blocked attack', FEEDBACK_OK); continue; }
          if (playerShield) { playerShield = false; logEvent('Shield absorbed attack!', FEEDBACK_OK); continue; }
          playerIntegrity = Math.max(0, playerIntegrity - packet.damage);
          lastDamageFrame = frame;
          logEvent(`OPP hit you (-${packet.damage})`, FEEDBACK_ERR);
        }
      } else if (node.type === 'OPPONENT') {
        if (packet.owner === 'player') {
          oppIntegrity = Math.max(0, oppIntegrity - packet.damage);
          logEvent(`YOU hit opponent (-${packet.damage})`, FEEDBACK_OK);
        }
      }
    }

    // Core breach detection
    if (coreWasIntact && core.breached) {
      logEvent('>>> CORE BREACHED <<<', CORE_CRACKED);
    }

    // Passive charge
    if (frame % PASSIVE_CHARGE_INTERVAL === 0) {
      playerCharge = Math.min(MAX_CHARGE, playerCharge + 1);
      oppCharge = Math.min(MAX_CHARGE, oppCharge + 1);
    }

    // Decrement timers
    if (cmdCooldownTimer > 0) cmdCooldownTimer--;
    if (playerFirewall > 0) playerFirewall--;
    if (playerScramble > 0) playerScramble--;
    if (feedbackTimer > 0) feedbackTimer--;

    // AI
    const aiAction = ai.tick(frame, oppCharge, core.breached, playerAccessNodes, oppAccessNodes);
    if (aiAction) {
      if (aiAction.type === 'attack') {
        const sent = sendAttack(aiAction.from, aiAction.pktType || 'bolt', 'opponent', playerAccessNodes);
        if (sent) logEvent('OPP: bolt sent', OPP_COLOR);
      } else if (aiAction.type === 'surge' && oppCharge >= 4) {
        oppCharge -= 4;
        const sent = sendAttack(ai.currentNode, 'surge', 'opponent', playerAccessNodes);
        if (sent) logEvent('OPP: surge launched', rgb(240, 220, 140));
      } else if (aiAction.type === 'block' && oppCharge >= 2) {
        oppCharge -= 2;
        graph.setEdgeState(aiAction.edgeId, 'BLOCKED', 5 * FPS);
        logEvent('OPP: blocked a path', OPP_COLOR);
      }
    }

    // Win/loss check
    if (playerIntegrity <= 0 || oppIntegrity <= 0) {
      gameState = 'gameover';
      gameOverFrame = 0;
      screen.render();
      return;
    }
    if (remaining <= 0) {
      gameState = 'gameover';
      gameOverFrame = 0;
      screen.render();
      return;
    }

    // ── Render ──

    // Background maze
    for (let y = 0; y < h; y++) {
      if (!background[y]) continue;
      for (let x = 0; x < w; x++) {
        const cell = background[y][x];
        if (cell && cell.char !== ' ') {
          screen.set(x, y, cell.char, cell.fg);
        }
      }
    }

    // Dynamic edge state overlays
    for (const edge of graph.edges) {
      if (edge.state === 'BLOCKED') {
        for (const wp of edge.waypoints) {
          screen.set(wp.x, wp.y, '×', TRACE_BLOCKED);
        }
      } else if (edge.state === 'CORRUPTED') {
        for (let i = 0; i < edge.waypoints.length; i++) {
          const wp = edge.waypoints[i];
          const flicker = (frame + i) % 4 < 2;
          screen.set(wp.x, wp.y, flicker ? '~' : '≈', TRACE_CORRUPT);
        }
      } else if (edge.state === 'OPEN') {
        // Redraw open edges in case they were CLOSED before
        for (const wp of edge.waypoints) {
          const cell = background[wp.y] && background[wp.y][wp.x];
          if (cell && cell.fg === TRACE_CLOSED) {
            screen.set(wp.x, wp.y, cell.char, TRACE_COLOR);
          }
        }
      }

      // Edge labels near player
      if (edge.label && edge.state !== 'CLOSED') {
        const midWp = edge.waypoints[Math.floor(edge.waypoints.length / 2)];
        if (midWp) {
          screen.set(midWp.x, midWp.y, `${edge.label}`, rgb(80, 100, 120));
        }
      }
    }

    // Core
    core.render(screen, coreNode.x, coreNode.y, frame);

    // Player position
    const pNode = graph.getNode(playerNode);
    screen.set(pNode.x - 1, pNode.y, '[', PLAYER_COLOR, null, true);
    screen.set(pNode.x, pNode.y, '●', PLAYER_COLOR, null, true);
    screen.set(pNode.x + 1, pNode.y, ']', PLAYER_COLOR, null, true);

    // Opponent position
    const oNode = graph.getNode(ai.currentNode);
    screen.set(oNode.x - 1, oNode.y, '<', OPP_COLOR);
    screen.set(oNode.x, oNode.y, '◆', OPP_COLOR);
    screen.set(oNode.x + 1, oNode.y, '>', OPP_COLOR);

    // Other access nodes (not active) - show as dim markers
    for (const nid of playerAccessNodes) {
      if (nid !== playerNode) {
        const n = graph.getNode(nid);
        screen.set(n.x, n.y, '○', rgb(60, 100, 120));
      }
    }
    for (const nid of oppAccessNodes) {
      if (nid !== ai.currentNode) {
        const n = graph.getNode(nid);
        screen.set(n.x, n.y, '◇', rgb(100, 80, 130));
      }
    }

    // Packets
    for (const p of packetManager.packets) {
      const pos = packetManager.getScreenPos(p);
      if (pos) {
        screen.set(pos.x, pos.y, p.symbol, p.color);
      }
    }

    // Damage flash
    if (frame - lastDamageFrame < 4) {
      screen.set(0, 0, '!', FEEDBACK_ERR);
      screen.set(w - 1, 0, '!', FEEDBACK_ERR);
    }

    // ── HUD ──
    const hudRow = 0;

    // Title
    screen.text(2, hudRow, 'PACK IT PANIC', TITLE_COLOR, null, true);

    // Timer
    screen.text(w - timerStr.length - 4, hudRow, '⏱ ' + timerStr, TIMER_COLOR);

    // Divider
    screen.hline(0, 1, w, '─', HUD_DIM);

    // Integrity bars at bottom divider area
    const botDiv = h - 5;
    screen.hline(0, botDiv, w, '─', HUD_DIM);

    const barW = Math.floor((w - 20) / 2);
    const pRatio = playerIntegrity / maxIntegrity;
    const oRatio = oppIntegrity / maxIntegrity;

    screen.text(2, botDiv, 'YOU', PLAYER_COLOR, null, true);
    screen.bar(6, botDiv, Math.min(barW, 20), pRatio, integrityColor(pRatio), HUD_DIM);
    screen.text(6 + Math.min(barW, 20) + 1, botDiv, `${playerIntegrity}`, integrityColor(pRatio));

    const oppX = w - 6 - Math.min(barW, 20) - 4;
    screen.text(oppX, botDiv, 'OPP', OPP_COLOR, null, true);
    screen.bar(oppX + 4, botDiv, Math.min(barW, 20), oRatio, integrityColor(oRatio), HUD_DIM);
    screen.text(oppX + 4 + Math.min(barW, 20) + 1, botDiv, `${oppIntegrity}`, integrityColor(oRatio));

    // Phase indicator
    if (core.breached) {
      screen.centerText(botDiv, ' CORE BREACHED ', CORE_CRACKED, null, true);
    }

    // Charge meter (above input, clearly visible)
    const chargeRow = h - 4;
    const chargeFilled = Math.floor(playerCharge);
    screen.text(2, chargeRow, 'CHARGE', rgb(180, 170, 130));
    for (let i = 0; i < MAX_CHARGE; i++) {
      const filled = i < chargeFilled;
      const pulse = playerCharge >= MAX_CHARGE && frame % 10 < 5;
      screen.set(9 + i, chargeRow, filled ? '█' : '░', filled ? (pulse ? rgb(255, 240, 100) : CHARGE_COLOR) : HUD_DIM);
    }
    screen.text(9 + MAX_CHARGE + 1, chargeRow, `${chargeFilled}/${MAX_CHARGE}`, CHARGE_COLOR);

    // Input line
    const inputRow = h - 3;
    const cursorChar = frame % 10 < 5 ? '_' : ' ';
    screen.text(2, inputRow, '> ', rgb(100, 100, 130));
    if (playerScramble > 0) {
      // Glitchy input display
      let scrambled = '';
      for (const ch of inputBuffer) {
        scrambled += rng.chance(0.5) ? GLITCH_CHARS[rng.int(0, GLITCH_CHARS.length - 1)] : ch;
      }
      screen.text(4, inputRow, scrambled + cursorChar, rgb(200, 170, 240));
    } else {
      screen.text(4, inputRow, inputBuffer + cursorChar, INPUT_COLOR);
    }

    // Shield indicator
    if (playerShield) {
      screen.text(w - 10, inputRow, '[SHIELD]', FEEDBACK_OK);
    }
    if (playerFirewall > 0) {
      const fwSec = (playerFirewall / FPS).toFixed(1);
      screen.text(w - 14, inputRow, `[FW ${fwSec}s]`, FEEDBACK_OK);
    }

    // Feedback line
    const feedbackRow = h - 2;
    if (feedbackTimer > 0 && feedbackText) {
      screen.text(2, feedbackRow, feedbackText, feedbackColor);
    }

    // Active node indicator
    const nodeLabel = playerNode === 'P1' ? 'LEFT' : playerNode === 'P2' ? 'CENTER' : 'RIGHT';
    screen.text(w - nodeLabel.length - 3, feedbackRow, `[${nodeLabel}]`, PLAYER_COLOR);

    // Battle log (top-right corner, renders downward)
    const logMaxW = 22;
    const logX = w - logMaxW - 1;
    const logTopRow = 2;
    const logTitle = '── LOG ──';
    screen.text(logX, logTopRow, logTitle, rgb(50, 55, 70));
    for (let i = 0; i < battleLog.length; i++) {
      const entry = battleLog[i];
      const age = frame - entry.frame;
      const fade = age > 60 ? 0.4 : age > 30 ? 0.7 : 1.0;
      const row = logTopRow + 1 + i;
      if (row >= 2 && row < graph.mazeBot) {
        const text = entry.text.length > logMaxW ? entry.text.slice(0, logMaxW) : entry.text;
        screen.text(logX, row, text, fade < 0.7 ? rgb(50, 55, 70) : entry.color);
      }
    }

    // Command reference bar (basic commands only)
    const cmdRef = 'atk  blk N  clr N  def  ←→ move';
    screen.text(2, h - 1, cmdRef, rgb(50, 55, 70));

    screen.render();
  }, FRAME_MS);

  function cleanup() {
    clearInterval(gameLoop);
    stdin.removeListener('data', onKey);
    try { stdin.setRawMode(false); } catch {}
    try { stdin.pause(); } catch {}
  }

  return await resultPromise;
}

module.exports = { renderPackItPanic };
