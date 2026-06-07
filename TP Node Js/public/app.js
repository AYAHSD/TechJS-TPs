/* ============================================
   PokéDex 3D — Main Application
   Three.js 3D Background + PokéAPI Integration
   ============================================ */

// ─── State ───────────────────────────────────
const state = {
  currentPokemonId: null,
  pokemonList: [],
  isLoading: false,
};

// ─── DOM Elements ────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  canvas: $('#three-canvas'),
  searchInput: $('#search-input'),
  searchSuggestions: $('#search-suggestions'),
  heroSection: $('#hero-section'),
  loadingSection: $('#loading-section'),
  errorSection: $('#error-section'),
  pokemonSection: $('#pokemon-section'),
  errorMessage: $('#error-message'),
  errorBackBtn: $('#error-back-btn'),
  logo: $('#logo'),
  // Pokemon detail elements
  pokemonSprite: $('#pokemon-sprite'),
  pokemonName: $('#pokemon-name'),
  pokemonIdBadge: $('#pokemon-id-badge'),
  pokemonTypes: $('#pokemon-types'),
  pokemonHeight: $('#pokemon-height'),
  pokemonWeight: $('#pokemon-weight'),
  pokemonExp: $('#pokemon-exp'),
  pokemonDescription: $('#pokemon-description'),
  statsGrid: $('#stats-grid'),
  abilitiesList: $('#abilities-list'),
  movesGrid: $('#moves-grid'),
  movesCount: $('#moves-count'),
  prevBtn: $('#prev-btn'),
  nextBtn: $('#next-btn'),
};

// ─── Type Colors ─────────────────────────────
const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0',
  electric: '#F8D030', grass: '#78C850', ice: '#98D8D8',
  fighting: '#C03028', poison: '#A040A0', ground: '#E0C068',
  flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8',
  dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC',
};

const STAT_COLORS = {
  hp: '#ff5555', attack: '#ff8844', defense: '#ffcc33',
  'special-attack': '#5599ff', 'special-defense': '#55cc77', speed: '#ff55aa',
};

const STAT_SHORT_NAMES = {
  hp: 'HP', attack: 'ATK', defense: 'DEF',
  'special-attack': 'SP.ATK', 'special-defense': 'SP.DEF', speed: 'SPD',
};

// ═══════════════════════════════════════════════
// THREE.JS 3D BACKGROUND
// ═══════════════════════════════════════════════

let scene, camera, renderer, particles, geometryParticles;
let mouseX = 0, mouseY = 0;
let currentTypeColor = new THREE.Color(0x7c5cfc);
let targetTypeColor = new THREE.Color(0x7c5cfc);

function initThreeJS() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Create floating particles
  const particleCount = 800;
  geometryParticles = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

    sizes[i] = Math.random() * 2 + 0.5;

    const color = new THREE.Color(0x7c5cfc);
    color.offsetHSL(Math.random() * 0.15 - 0.075, 0, Math.random() * 0.3 - 0.15);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometryParticles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometryParticles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometryParticles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  particles = new THREE.Points(geometryParticles, particleMaterial);
  scene.add(particles);

  // Add some orbiting ring geometries
  for (let i = 0; i < 3; i++) {
    const ringGeometry = new THREE.RingGeometry(15 + i * 8, 15.3 + i * 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x7c5cfc,
      transparent: true,
      opacity: 0.06 - i * 0.015,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI * 0.3 + i * 0.2;
    ring.rotation.y = i * 0.4;
    ring.userData = { rotationSpeed: 0.001 + i * 0.0005, index: i };
    scene.add(ring);
  }

  // Mouse move listener
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animateThreeJS();
}

function animateThreeJS() {
  requestAnimationFrame(animateThreeJS);

  const time = Date.now() * 0.001;

  // Rotate particles gently
  if (particles) {
    particles.rotation.x += 0.0003;
    particles.rotation.y += 0.0005;

    // Slight camera follow on mouse
    camera.position.x += (mouseX * 5 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 3 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);
  }

  // Animate positions subtly
  if (geometryParticles) {
    const positions = geometryParticles.attributes.position.array;
    const colors = geometryParticles.attributes.color.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time + positions[i] * 0.01) * 0.02;
    }
    geometryParticles.attributes.position.needsUpdate = true;

    // Smoothly transition particle colors toward target type color
    currentTypeColor.lerp(targetTypeColor, 0.005);
    for (let i = 0; i < colors.length; i += 3) {
      const hueOffset = (Math.sin(time * 0.5 + i * 0.1) * 0.1);
      const c = currentTypeColor.clone();
      c.offsetHSL(hueOffset, 0, 0);
      colors[i] += (c.r - colors[i]) * 0.01;
      colors[i + 1] += (c.g - colors[i + 1]) * 0.01;
      colors[i + 2] += (c.b - colors[i + 2]) * 0.01;
    }
    geometryParticles.attributes.color.needsUpdate = true;
  }

  // Animate rings
  scene.children.forEach((child) => {
    if (child.userData && child.userData.rotationSpeed) {
      child.rotation.z += child.userData.rotationSpeed;
      child.rotation.x += child.userData.rotationSpeed * 0.3;
    }
  });

  renderer.render(scene, camera);
}

function setBackgroundColor(typeName) {
  const color = TYPE_COLORS[typeName] || '#7c5cfc';
  targetTypeColor = new THREE.Color(color);

  // Also update ring opacities for a subtle glow
  scene.children.forEach((child) => {
    if (child.material && child.userData && child.userData.index !== undefined) {
      child.material.color = new THREE.Color(color);
    }
  });
}

// ═══════════════════════════════════════════════
// NAVIGATION & SECTION MANAGEMENT
// ═══════════════════════════════════════════════

function showSection(sectionId) {
  ['hero-section', 'loading-section', 'error-section', 'pokemon-section'].forEach((id) => {
    const el = document.getElementById(id);
    el.classList.remove('active');
  });
  const target = document.getElementById(sectionId);
  target.classList.add('active');
}

// ═══════════════════════════════════════════════
// POKÉAPI DATA FETCHING
// ═══════════════════════════════════════════════

async function fetchPokemon(nameOrId) {
  const response = await fetch(`/api/pokemon/${nameOrId}`);
  if (!response.ok) throw new Error('Pokémon not found');
  return response.json();
}

async function fetchSpecies(nameOrId) {
  const response = await fetch(`/api/pokemon/species/${nameOrId}`);
  if (!response.ok) return null;
  return response.json();
}

async function fetchPokemonList() {
  if (state.pokemonList.length > 0) return;
  try {
    const response = await fetch('/api/pokemon-list?limit=1025&offset=0');
    const data = await response.json();
    state.pokemonList = data.results.map((p, i) => ({
      name: p.name,
      id: i + 1,
      url: p.url,
    }));
  } catch (err) {
    console.error('Failed to load Pokémon list:', err);
  }
}

// ═══════════════════════════════════════════════
// RENDER POKEMON DATA
// ═══════════════════════════════════════════════

async function loadPokemon(nameOrId) {
  if (state.isLoading) return;
  state.isLoading = true;

  showSection('loading-section');

  try {
    const pokemon = await fetchPokemon(nameOrId);
    const species = await fetchSpecies(pokemon.name);

    state.currentPokemonId = pokemon.id;
    renderPokemon(pokemon, species);
    showSection('pokemon-section');

    // Change 3D background to match type
    if (pokemon.types.length > 0) {
      setBackgroundColor(pokemon.types[0].type.name);
    }
  } catch (err) {
    dom.errorMessage.textContent = `Could not find "${nameOrId}". Check the name or try a Pokémon ID!`;
    showSection('error-section');
  } finally {
    state.isLoading = false;
  }
}

function renderPokemon(pokemon, species) {
  // Sprite
  const spriteUrl =
    pokemon.sprites.other?.['official-artwork']?.front_default ||
    pokemon.sprites.front_default;
  dom.pokemonSprite.src = spriteUrl;
  dom.pokemonSprite.alt = pokemon.name;

  // Name & ID
  dom.pokemonName.textContent = pokemon.name;
  dom.pokemonIdBadge.textContent = `#${String(pokemon.id).padStart(3, '0')}`;

  // Types
  dom.pokemonTypes.innerHTML = pokemon.types
    .map((t) => {
      const color = TYPE_COLORS[t.type.name] || '#888';
      return `<span class="type-badge" style="background:${color}">${t.type.name}</span>`;
    })
    .join('');

  // Physical
  dom.pokemonHeight.textContent = `${(pokemon.height / 10).toFixed(1)}m`;
  dom.pokemonWeight.textContent = `${(pokemon.weight / 10).toFixed(1)}kg`;
  dom.pokemonExp.textContent = pokemon.base_experience || '—';

  // Description
  if (species) {
    const entry = species.flavor_text_entries.find((e) => e.language.name === 'en');
    dom.pokemonDescription.textContent = entry
      ? entry.flavor_text.replace(/[\n\f\r]/g, ' ')
      : 'No description available.';
  } else {
    dom.pokemonDescription.textContent = 'No description available.';
  }

  // Stats
  renderStats(pokemon.stats);

  // Abilities
  renderAbilities(pokemon.abilities);

  // Moves
  renderMoves(pokemon.moves);

  // Animate visual panel with the type's theme color
  const primaryType = pokemon.types[0].type.name;
  const color = TYPE_COLORS[primaryType] || '#7c5cfc';
  const visual = $('#pokemon-visual');
  visual.style.borderColor = `${color}33`;
  visual.style.boxShadow = `0 0 60px ${color}15, inset 0 0 40px ${color}08`;
}

function renderStats(stats) {
  dom.statsGrid.innerHTML = stats
    .map((s) => {
      const name = STAT_SHORT_NAMES[s.stat.name] || s.stat.name;
      const value = s.base_stat;
      const percentage = Math.min((value / 255) * 100, 100);
      const color = STAT_COLORS[s.stat.name] || '#7c5cfc';

      return `
        <div class="stat-row">
          <span class="stat-name">${name}</span>
          <span class="stat-value">${value}</span>
          <div class="stat-bar-container">
            <div class="stat-bar" style="width: 0%; background: ${color};" data-width="${percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join('');

  // Animate stat bars in
  requestAnimationFrame(() => {
    setTimeout(() => {
      $$('.stat-bar').forEach((bar) => {
        bar.style.width = bar.dataset.width;
      });
    }, 100);
  });
}

function renderAbilities(abilities) {
  dom.abilitiesList.innerHTML = abilities
    .map((a) => {
      const isHidden = a.is_hidden;
      return `
        <div class="ability-item">
          <div class="ability-dot ${isHidden ? 'hidden-ability' : ''}"></div>
          <span class="ability-name">${a.ability.name.replace('-', ' ')}</span>
          ${isHidden ? '<span class="ability-tag">Hidden</span>' : ''}
        </div>
      `;
    })
    .join('');
}

function renderMoves(moves) {
  const displayMoves = moves.slice(0, 30);
  dom.movesCount.textContent = `(${moves.length})`;
  dom.movesGrid.innerHTML = displayMoves
    .map((m) => `<span class="move-chip">${m.move.name.replace(/-/g, ' ')}</span>`)
    .join('');
}

// ═══════════════════════════════════════════════
// SEARCH FUNCTIONALITY
// ═══════════════════════════════════════════════

let searchDebounce = null;

function initSearch() {
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const query = dom.searchInput.value.trim().toLowerCase();

    if (query.length < 2) {
      dom.searchSuggestions.classList.remove('active');
      return;
    }

    searchDebounce = setTimeout(() => {
      showSuggestions(query);
    }, 200);
  });

  dom.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = dom.searchInput.value.trim();
      if (query) {
        dom.searchSuggestions.classList.remove('active');
        loadPokemon(query.toLowerCase());
        dom.searchInput.blur();
      }
    }
  });

  // Close suggestions on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      dom.searchSuggestions.classList.remove('active');
    }
  });
}

function showSuggestions(query) {
  const matches = state.pokemonList
    .filter((p) => p.name.includes(query) || String(p.id) === query)
    .slice(0, 8);

  if (matches.length === 0) {
    dom.searchSuggestions.classList.remove('active');
    return;
  }

  dom.searchSuggestions.innerHTML = matches
    .map(
      (p) => `
      <div class="suggestion-item" data-name="${p.name}">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.name}" loading="lazy">
        <span>${p.name}</span>
        <span class="suggestion-id">#${String(p.id).padStart(3, '0')}</span>
      </div>
    `
    )
    .join('');

  dom.searchSuggestions.classList.add('active');

  // Click handlers for suggestions
  $$('.suggestion-item').forEach((item) => {
    item.addEventListener('click', () => {
      const name = item.dataset.name;
      dom.searchInput.value = name;
      dom.searchSuggestions.classList.remove('active');
      loadPokemon(name);
    });
  });
}

// ═══════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════

function initEventListeners() {
  // Hero suggestion chips
  $$('.suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.pokemon;
      dom.searchInput.value = name;
      loadPokemon(name);
    });
  });

  // Logo -> go home
  dom.logo.addEventListener('click', () => {
    showSection('hero-section');
    dom.searchInput.value = '';
    state.currentPokemonId = null;
    targetTypeColor = new THREE.Color(0x7c5cfc);
  });

  // Error back button
  dom.errorBackBtn.addEventListener('click', () => {
    showSection('hero-section');
    dom.searchInput.value = '';
  });

  // Previous / Next navigation
  dom.prevBtn.addEventListener('click', () => {
    if (state.currentPokemonId && state.currentPokemonId > 1) {
      loadPokemon(state.currentPokemonId - 1);
    }
  });

  dom.nextBtn.addEventListener('click', () => {
    if (state.currentPokemonId) {
      loadPokemon(state.currentPokemonId + 1);
    }
  });
}

// ═══════════════════════════════════════════════
// FLOATING PARTICLES (CSS-based, overlay)
// ═══════════════════════════════════════════════

function initCSSParticles() {
  const overlay = document.getElementById('particles-overlay');
  const count = 20;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 4 + 1;
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(124, 92, 252, ${Math.random() * 0.3 + 0.1});
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: cssParticleFloat ${Math.random() * 10 + 10}s ease-in-out infinite;
      animation-delay: ${Math.random() * -10}s;
      pointer-events: none;
    `;
    overlay.appendChild(particle);
  }

  // Add keyframes dynamically
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cssParticleFloat {
      0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
      25% { transform: translateY(-30px) translateX(15px); opacity: 0.6; }
      50% { transform: translateY(-15px) translateX(-10px); opacity: 0.4; }
      75% { transform: translateY(-40px) translateX(5px); opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════

async function init() {
  // Start Three.js background
  initThreeJS();

  // CSS overlay particles
  initCSSParticles();

  // Setup search
  initSearch();

  // Setup all event listeners
  initEventListeners();

  // Preload Pokémon list for search
  await fetchPokemonList();

  console.log('🎮 PokéDex 3D initialized!');
}

// Boot
document.addEventListener('DOMContentLoaded', init);
