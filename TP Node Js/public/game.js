/* ================================================
   PokéBattle — Game Logic
   Rules:
   - Player picks a Pokémon + 5 moves (with power)
   - Bot gets a random Pokémon with its own 5 moves
   - Both start at 300 HP
   - Each turn: player picks a move, bot picks randomly
   - Accuracy check: random(1-100) > accuracy → MISS
   - PP rule: if attacker's move PP < defender's move PP → attack FAILS
   - PP depletes by 1 each use
   - First to 0 HP loses
   ================================================ */

'use strict';

// ─── Constants ────────────────────────────────
const MAX_HP = 300;
const BOT_POKEMON_POOL = [
  'dragonite','arcanine','lapras','alakazam','machamp','gengar',
  'gyarados','rhydon','exeggutor','starmie','jolteon','flareon',
  'vaporeon','scyther','electabuzz','magmar','pinsir','tauros',
  'snorlax','articuno','zapdos','moltres','mewtwo','mew',
  'typhlosion','feraligatr','meganium','ampharos','espeon','umbreon',
  'skarmory','heracross','blissey','raikou','entei','suicune',
  'tyranitar','lugia','ho-oh','blaziken','gardevoir','salamence',
  'metagross','rayquaza','infernape','garchomp','lucario','togekiss',
];

const TYPE_COLORS = {
  normal:'#A8A878',fire:'#F08030',water:'#6890F0',electric:'#F8D030',
  grass:'#78C850',ice:'#98D8D8',fighting:'#C03028',poison:'#A040A0',
  ground:'#E0C068',flying:'#A890F0',psychic:'#F85888',bug:'#A8B820',
  rock:'#B8A038',ghost:'#705898',dragon:'#7038F8',dark:'#705848',
  steel:'#B8B8D0',fairy:'#EE99AC',
};

// ─── Game State ───────────────────────────────
let playerData = null;   // { pokemon, moves: [{name,power,accuracy,pp,currentPp}] }
let botData    = null;
let playerHP   = MAX_HP;
let botHP      = MAX_HP;
let turn       = 1;
let gameActive = false;
let battleLog  = [];

// Stats for game-over screen
let stats = { playerHits:0, playerMisses:0, playerFails:0, botHits:0, botMisses:0, botFails:0, totalTurns:0 };

// ─── DOM refs ─────────────────────────────────
const $ = id => document.getElementById(id);
const screens = { select: $('screen-select'), battle: $('screen-battle'), gameover: $('screen-gameover') };

// ─── Helpers ──────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function typeBadge(typeName) {
  const color = TYPE_COLORS[typeName] || '#888';
  return `<span class="type-badge" style="background:${color}">${typeName}</span>`;
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ─── API ──────────────────────────────────────
async function apiFetchPokemon(name) {
  const r = await fetch(`/api/pokemon/${name}`);
  if (!r.ok) throw new Error('Not found');
  return r.json();
}
async function apiFetchSpecies(name) {
  const r = await fetch(`/api/pokemon/species/${name}`);
  return r.ok ? r.json() : null;
}
async function apiFetchMove(name) {
  const r = await fetch(`/api/move/${name}`);
  return r.ok ? r.json() : null;
}

// ══════════════════════════════════════════════
// SELECTION SCREEN
// ══════════════════════════════════════════════
let selectedMoves = [];   // [{name,power,accuracy,pp}] max 5
let availableMoves = [];  // all moves with power fetched
let currentPokemon = null;

async function loadPokemonForSelect(nameOrId) {
  $('select-preview').classList.add('hidden');
  $('select-error').classList.add('hidden');
  $('select-loading').classList.remove('hidden');
  selectedMoves = [];
  availableMoves = [];

  try {
    const poke = await apiFetchPokemon(String(nameOrId).toLowerCase());
    currentPokemon = poke;

    // Fill card
    const sprite = poke.sprites.other?.['official-artwork']?.front_default || poke.sprites.front_default;
    $('sel-sprite').src = sprite;
    $('sel-id').textContent = `#${String(poke.id).padStart(3,'0')}`;
    $('sel-name').textContent = poke.name;
    $('sel-types').innerHTML = poke.types.map(t => typeBadge(t.type.name)).join('');

    const hpStat   = poke.stats.find(s => s.stat.name === 'hp')?.base_stat || '?';
    const atkStat  = poke.stats.find(s => s.stat.name === 'attack')?.base_stat || '?';
    const spdStat  = poke.stats.find(s => s.stat.name === 'speed')?.base_stat || '?';
    $('sel-hp-stat').textContent  = `HP: ${hpStat}`;
    $('sel-atk-stat').textContent = `ATK: ${atkStat}`;
    $('sel-spd-stat').textContent = `SPD: ${spdStat}`;

    // Fetch moves with power (sample up to 25 for speed)
    $('select-loading').classList.remove('hidden');
    const movesToCheck = poke.moves.slice(0, 40);
    const moveResults = [];

    await Promise.all(movesToCheck.map(async m => {
      const data = await apiFetchMove(m.move.name);
      if (data && data.power && data.power > 0 && data.pp > 0) {
        moveResults.push({ name: data.name, power: data.power, accuracy: data.accuracy || 100, pp: data.pp });
      }
    }));

    // Sort by power desc, take max 15
    availableMoves = moveResults.sort((a,b) => b.power - a.power).slice(0, 15);
    renderAvailableMoves();

    $('select-loading').classList.add('hidden');
    $('select-preview').classList.remove('hidden');
    updateStartBtn();

  } catch (err) {
    $('select-loading').classList.add('hidden');
    $('select-error').classList.remove('hidden');
    $('select-error-msg').textContent = `Could not find that Pokémon. Try another name!`;
  }
}

function renderAvailableMoves() {
  const container = $('moves-available');
  container.innerHTML = '';
  availableMoves.forEach(move => {
    const isSelected = selectedMoves.some(m => m.name === move.name);
    const isDisabled = !isSelected && selectedMoves.length >= 5;
    const div = document.createElement('div');
    div.className = `move-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`;
    div.innerHTML = `
      <div class="move-check">✓</div>
      <div class="move-option-name">${move.name.replace(/-/g,' ')}</div>
      <div class="move-option-stats">
        <span class="pwr">PWR ${move.power}</span>
        <span class="acc">ACC ${move.accuracy}%</span>
        <span class="pp">PP ${move.pp}</span>
      </div>
    `;
    div.addEventListener('click', () => toggleMove(move));
    container.appendChild(div);
  });
}

function toggleMove(move) {
  const idx = selectedMoves.findIndex(m => m.name === move.name);
  if (idx >= 0) {
    selectedMoves.splice(idx, 1);
  } else {
    if (selectedMoves.length >= 5) return;
    selectedMoves.push({ ...move });
  }
  $('moves-selected-count').textContent = selectedMoves.length;
  renderAvailableMoves();
  updateStartBtn();
}

function updateStartBtn() {
  $('start-battle-btn').disabled = selectedMoves.length < 5;
}

// ══════════════════════════════════════════════
// BATTLE SETUP
// ══════════════════════════════════════════════
async function startBattle() {
  // Player data
  playerData = {
    pokemon: currentPokemon,
    moves: selectedMoves.map(m => ({ ...m, currentPp: m.pp })),
  };

  // Pick random bot Pokémon
  const botName = BOT_POKEMON_POOL[randInt(0, BOT_POKEMON_POOL.length - 1)];
  showScreen('battle');
  $('battle-moves-grid').innerHTML = '<div style="color:var(--muted);font-size:.85rem;grid-column:span 5">Loading bot...</div>';

  try {
    const botPoke = await apiFetchPokemon(botName);
    const botMovesRaw = botPoke.moves.slice(0, 30);
    const botMoveResults = [];

    await Promise.all(botMovesRaw.map(async m => {
      const data = await apiFetchMove(m.move.name);
      if (data && data.power && data.power > 0 && data.pp > 0) {
        botMoveResults.push({ name: data.name, power: data.power, accuracy: data.accuracy || 100, pp: data.pp });
      }
    }));

    const botMoves5 = botMoveResults.sort((a,b) => b.power - a.power).slice(0, 5);
    if (botMoves5.length < 5) {
      // pad with tackle if not enough
      while (botMoves5.length < 5) {
        botMoves5.push({ name:'tackle', power:40, accuracy:100, pp:35, currentPp:35 });
      }
    }

    botData = {
      pokemon: botPoke,
      moves: botMoves5.map(m => ({ ...m, currentPp: m.pp })),
    };
  } catch {
    // Fallback bot
    botData = {
      pokemon: { id: 0, name: 'missingno', types: [{ type: { name: 'normal' } }], sprites: { front_default: '' } },
      moves: [
        { name:'tackle', power:40, accuracy:100, pp:35, currentPp:35 },
        { name:'body slam', power:85, accuracy:100, pp:15, currentPp:15 },
        { name:'hyper beam', power:150, accuracy:90, pp:5, currentPp:5 },
        { name:'swift', power:60, accuracy:100, pp:20, currentPp:20 },
        { name:'submission', power:80, accuracy:80, pp:20, currentPp:20 },
      ],
    };
  }

  // Init game state
  playerHP = MAX_HP;
  botHP    = MAX_HP;
  turn     = 1;
  gameActive = true;
  battleLog  = [];
  stats = { playerHits:0, playerMisses:0, playerFails:0, botHits:0, botMisses:0, botFails:0, totalTurns:0 };

  renderBattleUI();
  addLog(`⚔️ ${currentPokemon.name} VS ${botData.pokemon.name}! Battle start!`, 'system');
}

function renderBattleUI() {
  // Player sprite & info
  const playerSprite = playerData.pokemon.sprites.other?.['official-artwork']?.front_default || playerData.pokemon.sprites.front_default;
  $('player-sprite').src = playerSprite;
  $('player-name').textContent = playerData.pokemon.name;
  $('player-types').innerHTML = playerData.pokemon.types.map(t => typeBadge(t.type.name)).join('');

  // Bot sprite & info
  const botSprite = botData.pokemon.sprites.other?.['official-artwork']?.front_default || botData.pokemon.sprites.front_default;
  $('bot-sprite').src = botSprite;
  $('bot-name').textContent = botData.pokemon.name;
  $('bot-types').innerHTML = botData.pokemon.types.map(t => typeBadge(t.type.name)).join('');

  // Background tinted to player's primary type
  const primaryType = playerData.pokemon.types[0].type.name;
  const color = TYPE_COLORS[primaryType] || '#7c5cfc';
  $('battle-bg').style.background = `
    radial-gradient(ellipse at 30% 40%, ${color}18 0%, transparent 60%),
    radial-gradient(ellipse at 70% 60%, rgba(124,92,252,.08) 0%, transparent 50%),
    linear-gradient(180deg, #0a0a20 0%, #080818 100%)
  `;

  updateHPBars();
  renderBattleMoves();
}

function renderBattleMoves() {
  const grid = $('battle-moves-grid');
  grid.innerHTML = '';
  playerData.moves.forEach((move, i) => {
    const btn = document.createElement('button');
    btn.className = 'battle-move-btn';
    btn.disabled = !gameActive || move.currentPp <= 0;
    const ppLow = move.currentPp <= 3;
    btn.innerHTML = `
      <div class="bm-name">${move.name.replace(/-/g,' ')}</div>
      <div class="bm-power">PWR ${move.power}</div>
      <div class="bm-acc">ACC ${move.accuracy}%</div>
      <div class="bm-pp ${ppLow ? 'low' : ''}">PP ${move.currentPp}/${move.pp}</div>
    `;
    btn.addEventListener('click', () => playerTurn(i));
    grid.appendChild(btn);
  });
  $('turn-indicator').textContent = `Turn ${turn}`;
}

function updateHPBars() {
  const playerPct = clamp((playerHP / MAX_HP) * 100, 0, 100);
  const botPct    = clamp((botHP / MAX_HP) * 100, 0, 100);

  $('player-hp-val').textContent = Math.max(0, playerHP);
  $('bot-hp-val').textContent    = Math.max(0, botHP);

  const playerBar = $('player-hp-bar');
  const botBar    = $('bot-hp-bar');
  playerBar.style.width = playerPct + '%';
  botBar.style.width    = botPct + '%';

  // Color shift: green → yellow → red
  const hpColor = (pct) => pct > 50 ? '#4cef8a' : pct > 25 ? '#fcdc4c' : '#fc4c4c';
  playerBar.style.background = hpColor(playerPct);
  botBar.style.background    = hpColor(botPct);
}

// ══════════════════════════════════════════════
// BATTLE LOGIC
// ══════════════════════════════════════════════
function playerTurn(moveIdx) {
  if (!gameActive) return;
  disableMoves(true);

  const playerMove = playerData.moves[moveIdx];
  const botMoveIdx = randInt(0, botData.moves.length - 1);
  const botMove    = botData.moves[botMoveIdx];

  // PP deduction
  playerMove.currentPp = Math.max(0, playerMove.currentPp - 1);
  botMove.currentPp    = Math.max(0, botMove.currentPp - 1);

  stats.totalTurns++;

  // Show bot "thinking" briefly
  $('thinking-overlay').classList.remove('hidden');
  setTimeout(() => {
    $('thinking-overlay').classList.add('hidden');

    // ── Resolve player attack ──
    const playerCanAttack = resolveAttack('player', playerMove, botMove);

    // ── Resolve bot attack ──
    const botCanAttack = resolveAttack('bot', botMove, playerMove);

    renderBattleMoves();
    updateHPBars();
    turn++;

    if (playerHP <= 0 || botHP <= 0) {
      endGame();
    } else {
      disableMoves(false);
    }
  }, 700);
}

/**
 * Resolve one attack.
 * Returns true if attack landed, false otherwise.
 */
function resolveAttack(attacker, atkMove, defMove) {
  const isPlayer = attacker === 'player';
  const atkName  = isPlayer ? playerData.pokemon.name : botData.pokemon.name;

  // ── Rule: PP check ──
  // If attacker's current PP < defender's current PP → attack FAILS
  if (atkMove.currentPp < defMove.currentPp) {
    const msg = `${atkName} tried ${atkMove.name.replace(/-/g,' ')} but their PP (${atkMove.currentPp}) < opponent's PP (${defMove.currentPp}) — attack failed!`;
    addLog(msg, 'fail');
    if (isPlayer) stats.playerFails++; else stats.botFails++;
    flashSprite(isPlayer ? 'player-sprite' : 'bot-sprite', 'miss');
    return false;
  }

  // ── Accuracy check ──
  const roll = randInt(1, 100);
  if (roll > atkMove.accuracy) {
    addLog(`${atkName}'s ${atkMove.name.replace(/-/g,' ')} missed! (rolled ${roll}, needed ≤${atkMove.accuracy})`, 'miss');
    if (isPlayer) stats.playerMisses++; else stats.botMisses++;
    flashSprite(isPlayer ? 'player-sprite' : 'bot-sprite', 'miss');
    return false;
  }

  // ── Damage calculation ──
  // Scale power to reasonable damage: divide by ~4 with slight random variance
  const variance = 0.85 + Math.random() * 0.3; // 0.85–1.15 variance
  const damage = Math.max(5, Math.round((atkMove.power / 4) * variance));

  if (isPlayer) {
    botHP -= damage;
    stats.playerHits++;
    addLog(`${atkName} used ${atkMove.name.replace(/-/g,' ')}! Hit for ${damage} damage!`, 'player');
    flashSprite('bot-sprite', 'damage');
  } else {
    playerHP -= damage;
    stats.botHits++;
    addLog(`Bot's ${atkName} used ${atkMove.name.replace(/-/g,' ')}! Hit for ${damage} damage!`, 'bot');
    flashSprite('player-sprite', 'damage');
  }

  return true;
}

function disableMoves(disabled) {
  document.querySelectorAll('.battle-move-btn').forEach(btn => {
    if (!disabled) {
      // Re-enable only if move has PP
      const moveIdx = Array.from(btn.parentNode.children).indexOf(btn);
      btn.disabled = playerData.moves[moveIdx]?.currentPp <= 0;
    } else {
      btn.disabled = true;
    }
  });
}

function flashSprite(spriteId, type) {
  const el = $(spriteId);
  el.classList.remove('animate-damage', 'animate-miss', 'animate-faint');
  void el.offsetWidth; // reflow
  el.classList.add(type === 'damage' ? 'animate-damage' : 'animate-miss');
  setTimeout(() => el.classList.remove('animate-damage', 'animate-miss'), 600);
}

function addLog(msg, type = 'system') {
  const log = $('battle-log');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.textContent = msg;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  battleLog.push({ msg, type });
}

// ══════════════════════════════════════════════
// GAME OVER
// ══════════════════════════════════════════════
function endGame() {
  gameActive = false;
  disableMoves(true);

  const playerWon = playerHP > 0 && botHP <= 0;
  const draw      = playerHP <= 0 && botHP <= 0;

  // Faint animation
  if (botHP <= 0)    { const s = $('bot-sprite');    s.classList.add('animate-faint'); }
  if (playerHP <= 0) { const s = $('player-sprite'); s.classList.add('animate-faint'); }

  setTimeout(() => showGameOver(playerWon, draw), 1200);
}

function showGameOver(playerWon, draw) {
  showScreen('gameover');

  const icon     = draw ? '🤝' : playerWon ? '🏆' : '💀';
  const title    = draw ? "It's a Draw!" : playerWon ? "You Win!" : "You Lose!";
  const subtitle = draw
    ? "Both Pokémon fainted at the same time!"
    : playerWon
      ? `You defeated the bot's ${botData.pokemon.name}!`
      : `${botData.pokemon.name} defeated your ${currentPokemon.name}!`;

  $('gameover-icon').textContent = icon;
  $('gameover-title').textContent = title;
  $('gameover-subtitle').textContent = subtitle;

  const bgColor = playerWon ? 'rgba(76,239,138,0.12)' : draw ? 'rgba(252,220,76,0.1)' : 'rgba(252,76,76,0.12)';
  $('gameover-bg').style.background = `radial-gradient(ellipse at 50% 40%, ${bgColor} 0%, transparent 70%), #080818`;

  $('gameover-stats').innerHTML = `
    <div class="gos"><span class="gos-val">${stats.totalTurns}</span><span class="gos-lbl">Turns</span></div>
    <div class="gos"><span class="gos-val" style="color:#4cef8a">${stats.playerHits}</span><span class="gos-lbl">Your Hits</span></div>
    <div class="gos"><span class="gos-val" style="color:#fcdc4c">${stats.playerMisses}</span><span class="gos-lbl">Misses</span></div>
    <div class="gos"><span class="gos-val" style="color:#fc4c4c">${stats.playerFails}</span><span class="gos-lbl">PP Fails</span></div>
    <div class="gos"><span class="gos-val" style="color:#fc8c7c">${stats.botHits}</span><span class="gos-lbl">Bot Hits</span></div>
  `;
}

// ══════════════════════════════════════════════
// EVENT WIRING
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Search
  $('select-search-btn').addEventListener('click', () => {
    const val = $('select-search').value.trim();
    if (val) loadPokemonForSelect(val.toLowerCase());
  });
  $('select-search').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = $('select-search').value.trim();
      if (val) loadPokemonForSelect(val.toLowerCase());
    }
  });

  // Quick picks
  document.querySelectorAll('.qp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('select-search').value = btn.dataset.p;
      loadPokemonForSelect(btn.dataset.p);
    });
  });

  // Start battle
  $('start-battle-btn').addEventListener('click', startBattle);

  // Flee
  $('flee-btn').addEventListener('click', () => {
    if (confirm('Flee from battle?')) {
      gameActive = false;
      showScreen('select');
    }
  });

  // Game over buttons
  $('btn-rematch').addEventListener('click', () => {
    // Same Pokémon + moves, new bot
    startBattle();
  });
  $('btn-new').addEventListener('click', () => {
    selectedMoves = [];
    availableMoves = [];
    currentPokemon = null;
    $('select-preview').classList.add('hidden');
    $('select-search').value = '';
    showScreen('select');
  });
});
