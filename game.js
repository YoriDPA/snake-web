// ... (Todo o topo do arquivo continua igual até o final dos outros controles) ...

// --- CÓDIGO ATÉ AQUI É O MESMO DA VERSÃO ANTERIOR ---
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const nameInput = document.getElementById('name-input');
const playButton = document.getElementById('play-button');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const countElement = document.getElementById('count');
const leaderboardElement = document.getElementById('leaderboard');
const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;
let TILE_SIZE;
let ws;
let snakes = {};
let foods = [];
let stars = [];
function getPlayerId() { let playerId = localStorage.getItem('snakePlayerId'); if (!playerId) { playerId = Math.random().toString(36).substr(2, 16); localStorage.setItem('snakePlayerId', playerId); } return playerId; }
const playerId = getPlayerId();
playButton.addEventListener('click', () => { const playerName = nameInput.value.trim(); if (playerName) { playButton.disabled = true; playButton.textContent = 'Conectando...'; connectToServer(playerName); } else { alert('Por favor, digite um nome para jogar!'); } });
function connectToServer(name) { ws = new WebSocket('wss://snake-online-3wex.onrender.com'); ws.onopen = () => { loginScreen.classList.add('hidden'); appContainer.classList.remove('hidden'); ws.send(JSON.stringify({ type: 'join', playerId: playerId, name: name })); }; ws.onclose = () => { console.log('Desconectado do servidor.'); alert('Você foi desconectado do servidor.'); loginScreen.classList.remove('hidden'); appContainer.classList.add('hidden'); playButton.disabled = false; playButton.textContent = 'Jogar'; }; ws.onmessage = (event) => { try { const data = JSON.parse(event.data); if (data.type === 'join_error') { alert(data.message); ws.close(); return; } snakes = data.snakes || {}; foods = data.foods || []; stars = data.stars || []; if (data.playerCount !== undefined) { countElement.textContent = data.playerCount; } if (data.ranking) { updateLeaderboard(data.ranking); } } catch (error) { console.error('Erro ao receber dados do servidor:', error); } }; ws.onerror = (error) => { console.error('Erro no WebSocket:', error); alert('Não foi possível conectar ao servidor do jogo.'); playButton.disabled = false; playButton.textContent = 'Jogar'; }; }
function updateLeaderboard(ranking) { leaderboardElement.innerHTML = ''; const sortedPlayers = Object.values(ranking).sort((a, b) => b.highScore - a.highScore); const top10 = sortedPlayers.slice(0, 10); top10.forEach(player => { const li = document.createElement('li'); li.textContent = `${player.name}: ${player.highScore}`; leaderboardElement.appendChild(li); }); }
function draw() { ctx.clearRect(0, 0, canvas.width, canvas.height); for (let id in snakes) { const snake = snakes[id]; if (!snake || !snake.segments) continue; const score = snake.score || 0; const displayText = `${snake.name}: ${score}`; ctx.fillStyle = 'white'; ctx.font = `${TILE_SIZE * 0.6}px "Helvetica Neue", sans-serif`; ctx.textAlign = 'center'; const textX = snake.segments[0].x * TILE_SIZE + (TILE_SIZE / 2); const textY = snake.segments[0].y * TILE_SIZE - (TILE_SIZE * 0.4); ctx.fillText(displayText, textX, textY); snake.segments.forEach((seg, index) => { const centerX = seg.x * TILE_SIZE + TILE_SIZE / 2; const centerY = seg.y * TILE_SIZE + TILE_SIZE / 2; ctx.fillStyle = snake.color; if (index === 0) { const headRadius = TILE_SIZE / 2; ctx.beginPath(); ctx.arc(centerX, centerY, headRadius, 0, 2 * Math.PI); ctx.fill(); } else { const bodyRadius = TILE_SIZE / 2 - 1; ctx.beginPath(); ctx.arc(centerX, centerY, bodyRadius, 0, 2 * Math.PI); ctx.fill(); } }); } ctx.fillStyle = 'red'; foods.forEach(food => { const centerX = food.x * TILE_SIZE + TILE_SIZE / 2; const centerY = food.y * TILE_SIZE + TILE_SIZE / 2; const radius = TILE_SIZE / 2; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); ctx.fill(); }); stars.forEach(star => { const centerX = star.x * TILE_SIZE + TILE_SIZE / 2; const centerY = star.y * TILE_SIZE + TILE_SIZE / 2; ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(centerX, centerY, TILE_SIZE / 2, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(centerX, centerY, TILE_SIZE / 4, 0, 2 * Math.PI); ctx.fill(); }); }
function resizeCanvas() { const availableWidth = window.innerWidth; const availableHeight = window.innerHeight; const gameAspectRatio = GRID_WIDTH / GRID_HEIGHT; let newCanvasWidth, newCanvasHeight; if ((availableWidth / availableHeight) > gameAspectRatio) { newCanvasHeight = availableHeight * 0.9; newCanvasWidth = newCanvasHeight * gameAspectRatio; } else { newCanvasWidth = availableWidth * 0.9; newCanvasHeight = newCanvasWidth / gameAspectRatio; } canvas.width = newCanvasWidth; canvas.height = newCanvasHeight; TILE_SIZE = canvas.width / GRID_WIDTH; }
window.addEventListener('resize', resizeCanvas); resizeCanvas();
document.addEventListener('keydown', (e) => { if (!playerId || !ws) return; let dx = 0, dy = 0; switch (e.key) { case 'ArrowUp': case 'w': dx = 0; dy = -1; break; case 'ArrowDown': case 's': dx = 0; dy = 1; break; case 'ArrowLeft': case 'a': dx = -1; dy = 0; break; case 'ArrowRight': case 'd': dx = 1; dy = 0; break; default: return; } ws.send(JSON.stringify({ type: 'move', playerId: playerId, dx, dy })); });
let touchStartX = 0, touchStartY = 0; document.addEventListener('touchstart', (e) => { if (e.target === canvas) e.preventDefault(); touchStartX = e.changedTouches[0].clientX; touchStartY = e.changedTouches[0].clientY; }, { passive: false }); document.addEventListener('touchend', (e) => { if (e.target === canvas) e.preventDefault(); if (!playerId || !ws) return; const touchEndX = e.changedTouches[0].clientX; const touchEndY = e.changedTouches[0].clientY; handleSwipe(touchEndX, touchEndY); }, { passive: false });
function handleSwipe(touchEndX, touchEndY) { const deltaX = touchEndX - touchStartX; const deltaY = touchEndY - touchStartY; const swipeThreshold = 30; let dx = 0, dy = 0; if (Math.abs(deltaX) > Math.abs(deltaY)) { if (Math.abs(deltaX) > swipeThreshold) { dx = (deltaX > 0) ? 1 : -1; dy = 0; } } else { if (Math.abs(deltaY) > swipeThreshold) { dx = 0; dy = (deltaY > 0) ? 1 : -1; } } if (dx !== 0 || dy !== 0) { ws.send(JSON.stringify({ type: 'move', playerId: playerId, dx, dy })); } }
setInterval(draw, 60);

// --- ALTERAÇÃO AQUI: Lógica do Joystick Virtual ---

const joystickContainer = document.getElementById('joystick-container');
const joystickStick = document.getElementById('joystick-stick');
let joystickActive = false;
let joystickStartX = 0;
let joystickStartY = 0;
let lastJoystickDirection = { dx: 0, dy: 0 };

joystickContainer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
    const rect = joystickContainer.getBoundingClientRect();
    joystickStartX = rect.left + rect.width / 2;
    joystickStartY = rect.top + rect.height / 2;
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    e.preventDefault();

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - joystickStartX;
    const deltaY = touch.clientY - joystickStartY;
    const angle = Math.atan2(deltaY, deltaX);
    const maxDistance = joystickContainer.offsetWidth / 4;

    // Limita o movimento do "stick" visual
    const distance = Math.min(Math.sqrt(deltaX*deltaX + deltaY*deltaY), maxDistance);
    const stickX = distance * Math.cos(angle);
    const stickY = distance * Math.sin(angle);
    joystickStick.style.transform = `translate(-50%, -50%) translate(${stickX}px, ${stickY}px)`;

    // Calcula a direção
    let dx = 0, dy = 0;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        dx = deltaX > 0 ? 1 : -1;
    } else {
        dy = deltaY > 0 ? 1 : -1;
    }

    // Envia o comando apenas se a direção mudar
    if (dx !== lastJoystickDirection.dx || dy !== lastJoystickDirection.dy) {
        if (!playerId || !ws) return;
        ws.send(JSON.stringify({ type: 'move', playerId: playerId, dx, dy }));
        lastJoystickDirection = { dx, dy };
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!joystickActive) return;
    joystickActive = false;
    // Reseta a posição do "stick" visual
    joystickStick.style.transform = 'translate(-50%, -50%)';
    lastJoystickDirection = { dx: 0, dy: 0 };
});