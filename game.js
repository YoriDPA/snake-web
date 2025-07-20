const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// --- ALTERAÇÃO AQUI ---
const countElement = document.getElementById('count'); // Pega o elemento do contador

const ws = new WebSocket('wss://snake-online-3wex.onrender.com');

const TILE_SIZE = 20;

let playerId = null;
let snakes = {};
let foods = [];

function resizeCanvas() {
    canvas.width = Math.floor(window.innerWidth * 0.8 / TILE_SIZE) * TILE_SIZE;
    canvas.height = Math.floor(window.innerHeight * 0.8 / TILE_SIZE) * TILE_SIZE;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

ws.onopen = () => console.log('Conectado ao servidor online com sucesso!');
ws.onclose = () => console.log('Desconectado do servidor.');
ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.playerId) playerId = data.playerId;
        if (data.snakes && data.foods) {
            snakes = data.snakes;
            foods = data.foods;
        }
        // --- ALTERAÇÃO AQUI ---
        // Atualiza o contador de jogadores na tela
        if (data.playerCount !== undefined) {
            countElement.textContent = data.playerCount;
        }

    } catch (error) {
        console.error('Erro ao receber dados do servidor:', error);
    }
};
ws.onerror = (error) => {
    console.error('Erro no WebSocket:', error);
    alert('Não foi possível conectar ao servidor do jogo. O servidor pode estar offline ou reiniciando.');
};

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let id in snakes) {
        const snake = snakes[id];
        ctx.fillStyle = snake.color;
        snake.segments.forEach(seg => {
            ctx.fillRect(seg.x * TILE_SIZE, seg.y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
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

// Controles... (o resto do arquivo continua igual)
document.addEventListener('keydown', (e) => {
    if (!playerId) return;
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
    if (!playerId) return;
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
        if (Math.abs(deltaX) > swipeThreshold) {
            dx = (deltaX > 0) ? 1 : -1;
            dy = 0;
        }
    } else {
        if (Math.abs(deltaY) > swipeThreshold) {
            dx = 0;
            dy = (deltaY > 0) ? 1 : -1;
        }
    }
    if (dx !== 0 || dy !== 0) {
        ws.send(JSON.stringify({ type: 'move', playerId, dx, dy }));
    }
}
setInterval(draw, 60);