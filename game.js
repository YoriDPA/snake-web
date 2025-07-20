const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- A LINHA ABAIXO FOI ATUALIZADA COM SEU ENDEREÇO ONLINE ---
const ws = new WebSocket('wss://snake-online-3wex.onrender.com');

const TILE_SIZE = 20; // Tamanho de cada "quadrado" do jogo

let playerId = null;
let snakes = {};
let foods = [];

// Função para ajustar o tamanho do canvas
function resizeCanvas() {
    canvas.width = Math.floor(window.innerWidth * 0.8 / TILE_SIZE) * TILE_SIZE;
    canvas.height = Math.floor(window.innerHeight * 0.8 / TILE_SIZE) * TILE_SIZE;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();


// --- Conexão com o Servidor ---
ws.onopen = () => {
    console.log('Conectado ao servidor online com sucesso!');
};

ws.onclose = () => {
    console.log('Desconectado do servidor.');
};

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.playerId) {
            playerId = data.playerId;
        }
        if (data.snakes && data.foods) {
            snakes = data.snakes;
            foods = data.foods;
        }
    } catch (error) {
        console.error('Erro ao receber dados do servidor:', error);
    }
};

ws.onerror = (error) => {
    console.error('Erro no WebSocket:', error);
    alert('Não foi possível conectar ao servidor do jogo. O servidor pode estar offline ou reiniciando.');
};


// --- Desenho do Jogo ---
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
        ctx.fillRect(food.x * TILE_SIZE, food.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
}


// --- Controles do Jogador ---
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

// Loop principal do jogo no cliente (apenas para desenhar)
setInterval(draw, 60);