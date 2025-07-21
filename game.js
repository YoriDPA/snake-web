const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const nameInput = document.getElementById('name-input');
const playButton = document.getElementById('play-button');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const countElement = document.getElementById('count');

const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;
let TILE_SIZE;

let ws;
let playerId = null;
let snakes = {};
let foods = [];

playButton.addEventListener('click', () => {
    const playerName = nameInput.value.trim();
    if (playerName) {
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        connectToServer(playerName);
    } else {
        alert('Por favor, digite um nome para jogar!');
    }
});

function connectToServer(name) {
    // --- ALTERAÇÃO AQUI: Apontando para o servidor online no Render ---
    ws = new WebSocket('wss://snake-online-3wex.onrender.com');

    ws.onopen = () => {
        console.log('Conectado ao servidor! Enviando nome...');
        ws.send(JSON.stringify({ type: 'join', name: name }));
    };

    ws.onclose = () => console.log('Desconectado do servidor.');

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'joined' && data.playerId) {
                playerId = data.playerId;
            }
            if (data.snakes) snakes = data.snakes;
            if (data.foods) foods = data.foods;
            if (data.playerCount !== undefined) {
                countElement.textContent = data.playerCount;
            }
        } catch (error) {
            console.error('Erro ao receber dados do servidor:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        // Este é o alerta que você está vendo na imagem
        alert('Não foi possível conectar ao servidor do jogo.');
    };
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let id in snakes) {
        const snake = snakes[id];
        if (!snake || !snake.segments) continue;
        const score = snake.score || 0;
        const displayText = `${snake.name}: ${score}`;
        ctx.fillStyle = 'white';
        ctx.font = `${TILE_SIZE * 0.6}px "Helvetica Neue", sans-serif`;
        ctx.textAlign = 'center';
        const textX = snake.segments[0].x * TILE_SIZE + (TILE_SIZE / 2);
        const textY = snake.segments[0].y * TILE_SIZE - (TILE_SIZE * 0.4);
        ctx.fillText(displayText, textX, textY);
        
        snake.segments.forEach((seg, index) => {
            const centerX = seg.x * TILE_SIZE + TILE_SIZE / 2;
            const centerY = seg.y * TILE_SIZE + TILE_SIZE / 2;
            ctx.fillStyle = snake.color;
            if (index === 0) {
                const headRadius = TILE_SIZE / 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, headRadius, 0, 2 * Math.PI);
                ctx.fill();
            } else {
                const bodyRadius = TILE_SIZE / 2 - 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, bodyRadius, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }
    ctx.fillStyle = 'red';
    foods.forEach(food => {
        const centerX = food.x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = food.y * TILE_SIZE + TILE_SIZE / 2;
        const radius = TILE_SIZE / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function resizeCanvas() {
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    const gameAspectRatio = GRID_WIDTH / GRID_HEIGHT;
    let newCanvasWidth, newCanvasHeight;
    if ((availableWidth / availableHeight) > gameAspectRatio) {
        newCanvasHeight = availableHeight * 0.9;
        newCanvasWidth = newCanvasHeight * gameAspectRatio;
    } else {
        newCanvasWidth = availableWidth * 0.9;
        newCanvasHeight = newCanvasWidth / gameAspectRatio;
    }
    canvas.width = newCanvasWidth;
    canvas.height = newCanvasHeight;
    TILE_SIZE = canvas.width / GRID_WIDTH;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

document.addEventListener('keydown', (e) => {
    if (!playerId || !ws) return;
    let dx = 0, dy = 0;
    switch (e.key) {
        case 'ArrowUp': case 'w': dx = 0; dy = -1; break;
        case 'ArrowDown': case 's': dx = 0; dy = 1; break;
        case 'ArrowLeft': case 'a': dx = -1; dy = 0; break;
        case 'ArrowRight': case 'd': dx = 1; dy = 0; break;
        default: return;
    }
    ws.send(JSON.stringify({ type: 'move', playerId, dx, dy }));
});

let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
    if (e.target === canvas) e.preventDefault();
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}, { passive: false });
document.addEventListener('touchend', (e) => {
    if (e.target === canvas) e.preventDefault();
    if (!playerId || !ws) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    handleSwipe(touchEndX, touchEndY);
}, { passive: false });
function handleSwipe(touchEndX, touchEndY) {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const swipeThreshold = 30;
    let dx = 0, dy = 0;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > swipeThreshold) { dx = (deltaX > 0) ? 1 : -1; dy = 0; }
    } else {
        if (Math.abs(deltaY) > swipeThreshold) { dx = 0; dy = (deltaY > 0) ? 1 : -1; }
    }
    if (dx !== 0 || dy !== 0) {
        ws.send(JSON.stringify({ type: 'move', playerId, dx, dy }));
    }
}

setInterval(draw, 60);
