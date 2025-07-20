const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajustar tamanho para dispositivos
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const ws = new WebSocket('ws://seu-projeto.up.railway.app'); // Substitua pelo URL do Railway
let playerId = null;
let snakes = {};
let foods = [];

ws.onopen = () => console.log('Conectado ao servidor');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.playerId) playerId = data.playerId;
    snakes = data.snakes;
    foods = data.foods;
};

let dx = 0, dy = 0;

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let id in snakes) {
        ctx.fillStyle = snakes[id].color;
        snakes[id].segments.forEach((seg, i) => {
            ctx.fillRect(seg.x * 20, seg.y * 20, 18, 18);
        });
    }
    ctx.fillStyle = 'red';
    foods.forEach(food => ctx.fillRect(food.x * 20, food.y * 20, 18, 18));
}

// Controles para teclado (computador)
document.addEventListener('keydown', (e) => {
    if (!playerId) return;
    switch (e.key) {
        case 'ArrowUp': if (dy === 0) { dx = 0; dy = -1; ws.send(JSON.stringify({ type: 'move', playerId, dx, dy })); } break;
        case 'ArrowDown': if (dy === 0) { dx = 0; dy = 1; ws.send(JSON.stringify({ type: 'move', playerId, dx, dy })); } break;
        case 'ArrowLeft': if (dx === 0) { dx = -1; dy = 0; ws.send(JSON.stringify({ type: 'move', playerId, dx, dy })); } break;
        case 'ArrowRight': if (dx === 0) { dx = 1; dy = 0; ws.send(JSON.stringify({ type: 'move', playerId, dx, dy })); } break;
    }
});

// Controles para toque (celular)
canvas.addEventListener('touchstart', (e) => {
    if (!playerId) return;
    const touch = e.touches[0];
    const centerX = canvas.width / 40;
    const centerY = canvas.height / 40;
    dx = (touch.clientX / 20 - centerX) > 0 ? 1 : -1;
    dy = (touch.clientY / 20 - centerY) > 0 ? 1 : -1;
    ws.send(JSON.stringify({ type: 'move', playerId, dx, dy }));
    e.preventDefault();
});

setInterval(draw, 100);