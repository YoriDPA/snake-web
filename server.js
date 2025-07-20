const WebSocket = require('ws');

// A porta foi alterada para 8081 para evitar conflitos
const server = new WebSocket.Server({ port: process.env.PORT || 8081 });

const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;

let snakes = {};
let foods = [];

function createNewFood() {
    return { 
        x: Math.floor(Math.random() * GRID_WIDTH), 
        y: Math.floor(Math.random() * GRID_HEIGHT) 
    };
}

foods.push(createNewFood());

server.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    console.log(`Player ${playerId} conectado.`);
    
    ws.send(JSON.stringify({ playerId }));

    snakes[playerId] = { 
        segments: [{ x: 10, y: 10 }], 
        dx: 1, 
        dy: 0, 
        color: `rgb(${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55})` 
    };

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.type === 'move' && snakes[data.playerId]) {
                const snake = snakes[data.playerId];
                if ((data.dx !== 0 && snake.dx !== -data.dx) || (data.dy !== 0 && snake.dy !== -data.dy)) {
                    snake.dx = data.dx;
                    snake.dy = data.dy;
                }
            }
        } catch (e) {
            console.error("Erro ao processar mensagem:", e);
        }
    });

    ws.on('close', () => {
        console.log(`Player ${playerId} desconectado.`);
        delete snakes[playerId];
    });
});

setInterval(() => {
    for (let id in snakes) {
        let snake = snakes[id];
        let head = { x: snake.segments[0].x + snake.dx, y: snake.segments[0].y + snake.dy };

        if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
            snakes[id].segments = [{ x: 10, y: 10 }];
            continue;
        }

        snake.segments.unshift(head);

        let ateComida = false;
        foods.forEach((food, index) => {
            if (head.x === food.x && head.y === food.y) {
                foods[index] = createNewFood();
                ateComida = true;
            }
        });

        if (!ateComida) {
            snake.segments.pop();
        }
    }

    // --- ALTERAÇÃO AQUI ---
    // Adicionamos a contagem de jogadores ao estado do jogo
    const playerCount = server.clients.size;
    const gameState = JSON.stringify({ snakes, foods, playerCount });

    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(gameState);
        }
    });
}, 150);

console.log('Servidor WebSocket rodando na porta ' + (process.env.PORT || 8081));