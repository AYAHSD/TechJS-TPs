#!/usr/bin/env node
/* ================================================
   PokéBattle CLI — Terminal Version
   Same rules as the browser game:
   - Player picks a Pokémon + 5 moves (with power)
   - Bot gets a random Pokémon with its own 5 moves
   - Both start at 300 HP
   - Each turn: player picks a move, bot picks randomly
   - Accuracy check: random(1-100) > accuracy → MISS
   - PP rule: if attacker's move PP < defender's move PP → FAIL
   - First to 0 HP loses
   ================================================ */

'use strict';

const { input } = require('@inquirer/prompts');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ─── ANSI Colors ──────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue:  '\x1b[44m',
};

const col  = (color, text) => `${color}${text}${C.reset}`;
const bold = (text) => col(C.bold, text);

// ─── Constants ────────────────────────────────
const MAX_HP = 300;
const API_BASE = 'https://pokeapi.co/api/v2';

const BOT_POOL = [
  'dragonite','arcanine','lapras','alakazam','machamp','gengar',
  'gyarados','rhydon','starmie','jolteon','flareon','vaporeon',
  'scyther','electabuzz','magmar','snorlax','articuno','zapdos',
  'moltres','mewtwo','mew','typhlosion','feraligatr','ampharos',
  'espeon','umbreon','heracross','blissey','raikou','entei',
  'suicune','tyranitar','lugia','ho-oh','blaziken','gardevoir',
  'salamence','metagross','rayquaza','infernape','garchomp','lucario',
];

const TYPE_COLORS = {
  fire: C.red, water: C.blue, electric: C.yellow, grass: C.green,
  psychic: C.magenta, ice: C.cyan, dragon: C.magenta, ghost: C.magenta,
  dark: C.dim, fighting: C.red, poison: C.magenta, ground: C.yellow,
  rock: C.yellow, bug: C.green, normal: C.white, steel: C.cyan,
  fairy: C.magenta, flying: C.cyan,
};

// ─── Helpers ──────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp   = (v, min, max) => Math.max(min, Math.min(max, v));
const sleep   = (ms) => new Promise(r => setTimeout(r, ms));
const clear   = () => process.stdout.write('\x1Bc');

function typeTag(typeName) {
  const color = TYPE_COLORS[typeName] || C.white;
  return col(color, `[${typeName.toUpperCase()}]`);
}

function hpBar(current, max, width = 20) {
  const pct = clamp(current / max, 0, 1);
  const filled = Math.round(pct * width);
  const empty  = width - filled;
  const color  = pct > 0.5 ? C.green : pct > 0.25 ? C.yellow : C.red;
  return col(color, '█'.repeat(filled)) + col(C.dim, '░'.repeat(empty));
}

function capitalize(str) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function ask(question) {
  // Strip ANSI codes so inquirer renders the prompt cleanly
  const clean = question.replace(/\x1b\[[0-9;]*m/g, '').trim();
  return input({ message: clean });
}

// ─── API ──────────────────────────────────────
async function fetchPokemon(name) {
  const r = await fetch(`${API_BASE}/pokemon/${name}`);
  if (!r.ok) throw new Error(`Pokémon "${name}" not found`);
  return r.json();
}

async function fetchMove(name) {
  const r = await fetch(`${API_BASE}/move/${name}`);
  return r.ok ? r.json() : null;
}

async function loadMoves(pokemonMoveList, limit = 30) {
  const movesToCheck = pokemonMoveList.slice(0, limit);
  const results = [];
  await Promise.all(movesToCheck.map(async m => {
    const data = await fetchMove(m.move.name);
    if (data && data.power > 0 && data.pp > 0) {
      results.push({
        name:     data.name,
        power:    data.power,
        accuracy: data.accuracy || 100,
        pp:       data.pp,
        currentPp: data.pp,
      });
    }
  }));
  return results.sort((a, b) => b.power - a.power);
}

// ─── Display ──────────────────────────────────
function printHeader() {
  console.log(col(C.yellow, bold(`
╔══════════════════════════════════════╗
║    ⚡  PokéBattle  CLI  ⚡           ║
╚══════════════════════════════════════╝`)));
}

function printPokemonCard(poke, label) {
  const types = poke.types.map(t => typeTag(t.type.name)).join(' ');
  const hp  = poke.stats.find(s => s.stat.name === 'hp')?.base_stat || '?';
  const atk = poke.stats.find(s => s.stat.name === 'attack')?.base_stat || '?';
  const spd = poke.stats.find(s => s.stat.name === 'speed')?.base_stat || '?';
  console.log(`
  ${col(C.cyan, bold(label))}
  ${bold(capitalize(poke.name))}  ${col(C.dim, `#${String(poke.id).padStart(3,'0')}`)}
  ${types}
  HP: ${hp}  ATK: ${atk}  SPD: ${spd}`);
}

function printBattleStatus(playerData, botData, playerHP, botHP, turn) {
  const sep = col(C.dim, '─'.repeat(42));
  console.log(`\n${sep}`);
  console.log(col(C.bold, `  Turn ${turn}`));
  console.log(sep);

  // Bot side
  console.log(`  ${col(C.red, 'BOT')}  ${bold(capitalize(botData.pokemon.name))}`);
  console.log(`  HP ${Math.max(0, botHP)}/${MAX_HP}  ${hpBar(botHP, MAX_HP)}`);

  console.log(col(C.dim, `  ${'─'.repeat(38)}`));

  // Player side
  console.log(`  ${col(C.green, 'YOU')}  ${bold(capitalize(playerData.pokemon.name))}`);
  console.log(`  HP ${Math.max(0, playerHP)}/${MAX_HP}  ${hpBar(playerHP, MAX_HP)}`);
  console.log(sep);
}

function printMoves(moves) {
  console.log(`\n  ${bold('Your moves:')}`);
  moves.forEach((m, i) => {
    const ppColor = m.currentPp <= 3 ? C.red : m.currentPp <= 6 ? C.yellow : C.green;
    const disabled = m.currentPp <= 0;
    const num = col(C.cyan, `[${i + 1}]`);
    const name = col(disabled ? C.dim : C.white, capitalize(m.name));
    const pwr  = col(C.yellow, `PWR ${m.power}`);
    const acc  = col(C.blue,   `ACC ${m.accuracy}%`);
    const pp   = col(ppColor,  `PP ${m.currentPp}/${m.pp}`);
    const tag  = disabled ? col(C.red, ' (no PP)') : '';
    console.log(`  ${num} ${name.padEnd(25)} ${pwr}  ${acc}  ${pp}${tag}`);
  });
}

// ─── Selection Screen ─────────────────────────
async function selectionScreen() {
  clear();
  printHeader();

  let pokemon = null;

  while (!pokemon) {
    const input = await ask(col(C.cyan, '\n  Enter Pokémon name or ID: '));
    if (!input) continue;

    process.stdout.write(col(C.dim, '  Fetching Pokémon data...'));
    try {
      pokemon = await fetchPokemon(input.toLowerCase());
      console.log(col(C.green, ' ✓'));
    } catch {
      console.log(col(C.red, `\n  ✗ "${input}" not found. Try again!`));
      pokemon = null;
    }
  }

  printPokemonCard(pokemon, 'YOUR POKÉMON');

  // Load moves
  console.log(col(C.dim, '\n  Loading moves... (this may take a moment)'));
  const allMoves = await loadMoves(pokemon.moves, 40);
  const available = allMoves.slice(0, 15);

  if (available.length === 0) {
    console.log(col(C.red, '  No valid moves found! Try a different Pokémon.'));
    return selectionScreen();
  }

  // Show available moves
  console.log(`\n  ${bold('Available moves')} ${col(C.dim, '(select 5):')}`);
  available.forEach((m, i) => {
    const num  = col(C.cyan, `[${String(i + 1).padStart(2)}]`);
    const name = capitalize(m.name).padEnd(22);
    const pwr  = col(C.yellow, `PWR ${String(m.power).padStart(3)}`);
    const acc  = col(C.blue,   `ACC ${m.accuracy}%`);
    const pp   = col(C.green,  `PP ${m.pp}`);
    console.log(`  ${num} ${name} ${pwr}  ${acc}  ${pp}`);
  });

  // Pick 5
  const selectedMoves = [];
  while (selectedMoves.length < 5) {
    const remaining = 5 - selectedMoves.length;
    const selected  = selectedMoves.map(m => capitalize(m.name)).join(', ') || 'none';
    console.log(col(C.dim, `\n  Selected (${selectedMoves.length}/5): ${selected}`));

    const input = await ask(col(C.cyan, `  Pick move #${selectedMoves.length + 1} (1-${available.length}): `));
    const idx = parseInt(input) - 1;

    if (isNaN(idx) || idx < 0 || idx >= available.length) {
      console.log(col(C.red, '  ✗ Invalid choice.'));
      continue;
    }
    if (selectedMoves.some(m => m.name === available[idx].name)) {
      console.log(col(C.red, '  ✗ Already selected.'));
      continue;
    }

    selectedMoves.push({ ...available[idx] });
    console.log(col(C.green, `  ✓ Added: ${capitalize(available[idx].name)}`));
  }

  return { pokemon, selectedMoves };
}

// ─── Battle Screen ────────────────────────────
function resolveAttack(attacker, atkMove, defMove, atkPokeName) {
  const isPlayer = attacker === 'player';
  const logs = [];

  // PP check
  if (atkMove.currentPp < defMove.currentPp) {
    logs.push({ text: `  ${capitalize(atkPokeName)} tried ${capitalize(atkMove.name)} but PP too low (${atkMove.currentPp} < ${defMove.currentPp}) — FAILED!`, color: C.red });
    return { damage: 0, result: 'fail', logs };
  }

  // Accuracy check
  const roll = randInt(1, 100);
  if (roll > atkMove.accuracy) {
    logs.push({ text: `  ${capitalize(atkPokeName)}'s ${capitalize(atkMove.name)} missed! (rolled ${roll}, needed ≤${atkMove.accuracy})`, color: C.yellow });
    return { damage: 0, result: 'miss', logs };
  }

  // Damage
  const variance = 0.85 + Math.random() * 0.3;
  const damage = Math.max(5, Math.round((atkMove.power / 4) * variance));
  const color  = isPlayer ? C.green : C.red;
  logs.push({ text: `  ${capitalize(atkPokeName)} used ${capitalize(atkMove.name)}! Hit for ${bold(String(damage))} damage!`, color });
  return { damage, result: 'hit', logs };
}

async function battleScreen(playerData, botData) {
  let playerHP = MAX_HP;
  let botHP    = MAX_HP;
  let turn     = 1;
  const stats  = { playerHits:0, playerMisses:0, playerFails:0, botHits:0, botMisses:0, botFails:0 };

  // Give each move a currentPp
  playerData.moves.forEach(m => m.currentPp = m.pp);
  botData.moves.forEach(m => m.currentPp = m.pp);

  console.log(`\n${col(C.yellow, bold(`  ⚔️  ${capitalize(playerData.pokemon.name)} VS ${capitalize(botData.pokemon.name)}! Battle start!`))}`);
  await sleep(800);

  while (playerHP > 0 && botHP > 0) {
    clear();
    printBattleStatus(playerData, botData, playerHP, botHP, turn);
    printMoves(playerData.moves);

    // Check if any moves left
    const hasPP = playerData.moves.some(m => m.currentPp > 0);
    if (!hasPP) {
      console.log(col(C.red, '\n  ✗ All your moves are out of PP! You lose!'));
      break;
    }

    // Player input
    let moveIdx = -1;
    while (moveIdx < 0) {
      const input = await ask(col(C.cyan, '\n  Choose move (1-5) or [f] to flee: '));

      if (input.toLowerCase() === 'f') {
        console.log(col(C.yellow, '\n  You fled from battle!'));
        return null; // fled
      }

      const n = parseInt(input) - 1;
      if (isNaN(n) || n < 0 || n > 4) {
        console.log(col(C.red, '  ✗ Enter a number between 1 and 5.'));
        continue;
      }
      if (playerData.moves[n].currentPp <= 0) {
        console.log(col(C.red, '  ✗ That move has no PP left!'));
        continue;
      }
      moveIdx = n;
    }

    const playerMove = playerData.moves[moveIdx];
    const botMoveIdx = randInt(0, botData.moves.length - 1);
    const botMove    = botData.moves[botMoveIdx];

    // Deduct PP
    playerMove.currentPp = Math.max(0, playerMove.currentPp - 1);
    botMove.currentPp    = Math.max(0, botMove.currentPp - 1);

    // Resolve attacks
    const playerResult = resolveAttack('player', playerMove, botMove, playerData.pokemon.name);
    const botResult    = resolveAttack('bot', botMove, playerMove, botData.pokemon.name);

    // Apply damage
    botHP    -= playerResult.damage;
    playerHP -= botResult.damage;

    // Update stats
    if (playerResult.result === 'hit')  stats.playerHits++;
    if (playerResult.result === 'miss') stats.playerMisses++;
    if (playerResult.result === 'fail') stats.playerFails++;
    if (botResult.result === 'hit')     stats.botHits++;
    if (botResult.result === 'miss')    stats.botMisses++;
    if (botResult.result === 'fail')    stats.botFails++;

    // Print battle log
    console.log(`\n  ${col(C.dim, '── Turn ' + turn + ' result ─────────────────────')}`);
    [...playerResult.logs, ...botResult.logs].forEach(l => {
      console.log(col(l.color, l.text));
    });

    turn++;
    await sleep(100);
  }

  return { playerHP, botHP, turn: turn - 1, stats };
}

// ─── Game Over Screen ─────────────────────────
async function gameOverScreen(result, playerData, botData) {
  if (!result) return; // fled

  const { playerHP, botHP, turn, stats } = result;
  const playerWon = playerHP > 0 && botHP <= 0;
  const draw      = playerHP <= 0 && botHP <= 0;

  clear();
  console.log('\n');

  if (draw) {
    console.log(col(C.yellow, bold("  🤝  It's a Draw!")));
    console.log(col(C.dim,    "  Both Pokémon fainted at the same time!"));
  } else if (playerWon) {
    console.log(col(C.green, bold("  🏆  You Win!")));
    console.log(col(C.dim,   `  You defeated the bot's ${capitalize(botData.pokemon.name)}!`));
  } else {
    console.log(col(C.red,  bold("  💀  You Lose!")));
    console.log(col(C.dim,  `  ${capitalize(botData.pokemon.name)} defeated your ${capitalize(playerData.pokemon.name)}!`));
  }

  const sep = col(C.dim, '  ' + '─'.repeat(38));
  console.log(`\n${sep}`);
  console.log(`  ${bold('Battle Stats')}`);
  console.log(sep);
  console.log(`  Turns played   : ${bold(String(turn))}`);
  console.log(`  Your hits      : ${col(C.green,  String(stats.playerHits))}`);
  console.log(`  Your misses    : ${col(C.yellow, String(stats.playerMisses))}`);
  console.log(`  Your PP fails  : ${col(C.red,    String(stats.playerFails))}`);
  console.log(`  Bot hits       : ${col(C.red,    String(stats.botHits))}`);
  console.log(`  Bot misses     : ${col(C.yellow, String(stats.botMisses))}`);
  console.log(`  Bot PP fails   : ${col(C.green,  String(stats.botFails))}`);
  console.log(sep);

  const choice = await ask(col(C.cyan, '\n  [r] Rematch  [n] New Pokémon  [q] Quit: '));
  return choice.toLowerCase();
}

// ─── Main Loop ────────────────────────────────
async function main() {
  clear();
  printHeader();

  let playerPokemon = null;
  let playerMoves   = null;

  while (true) {
    // Selection (skip if rematch)
    if (!playerPokemon) {
      const selection = await selectionScreen();
      playerPokemon   = selection.pokemon;
      playerMoves     = selection.selectedMoves;
    }

    // Load bot
    clear();
    console.log(col(C.dim, '\n  Loading bot Pokémon...'));
    const botName = BOT_POOL[randInt(0, BOT_POOL.length - 1)];
    let botPoke, botMoves;

    try {
      botPoke = await fetchPokemon(botName);
      const raw = await loadMoves(botPoke.moves, 30);
      botMoves  = raw.slice(0, 5);
      if (botMoves.length < 5) {
        while (botMoves.length < 5) {
          botMoves.push({ name: 'tackle', power: 40, accuracy: 100, pp: 35, currentPp: 35 });
        }
      }
    } catch {
      botPoke  = { id: 0, name: 'missingno', types: [{ type: { name: 'normal' } }], stats: [] };
      botMoves = [
        { name: 'tackle',     power: 40,  accuracy: 100, pp: 35, currentPp: 35 },
        { name: 'body-slam',  power: 85,  accuracy: 100, pp: 15, currentPp: 15 },
        { name: 'hyper-beam', power: 150, accuracy: 90,  pp: 5,  currentPp: 5  },
        { name: 'swift',      power: 60,  accuracy: 100, pp: 20, currentPp: 20 },
        { name: 'submission', power: 80,  accuracy: 80,  pp: 20, currentPp: 20 },
      ];
    }

    const playerData = { pokemon: playerPokemon, moves: playerMoves.map(m => ({ ...m })) };
    const botData    = { pokemon: botPoke,        moves: botMoves.map(m => ({ ...m })) };

    console.log(col(C.green, `  ✓ Bot: ${capitalize(botName)}`));
    await sleep(500);

    // Battle
    const result = await battleScreen(playerData, botData);

    // Game Over
    const choice = await gameOverScreen(result, playerData, botData);

    if (choice === 'q' || choice === null) {
      console.log(col(C.yellow, '\n  Thanks for playing PokéBattle CLI! 👋\n'));
      process.exit(0);
    } else if (choice === 'r') {
      // Rematch: same Pokémon, new bot
      continue;
    } else {
      // New Pokémon
      playerPokemon = null;
      playerMoves   = null;
    }
  }
}

main().catch(err => {
  console.error(col(C.red, `\n  Fatal error: ${err.message}\n`));
  process.exit(1);
});