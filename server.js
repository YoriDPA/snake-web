const WebSocket = require('ws');
const fs = require('fs');

const server = new WebSocket.Server({ port: process.env.PORT || 8081 });

// ... (O topo do arquivo continua o mesmo)
const RANKING_FILE = './ranking.json';
let ranking = {};
try {
    const data = fs.readFileSync(RANKING_FILE);
    ranking = JSON.parse(data);
} catch (error) {
    fs.writeFileSync(RANKING_FILE, JSON.stringify({}));
}
function saveRanking() {
    fs.writeFileSync(RANKING_FILE, JSON.stringify(ranking, null, 2));
}
const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;
let snakes = {};
let foods = [];
function createNewFood() {
    return { x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) };
}
foods.push(createNewFood());
// ...

server.on('connection', (ws) => {
    console.log("DEBUG [Servidor]: Nova conexão estabelecida.");
    let connectionPlayerId = null; 

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            console.log(`DEBUG [Servidor]: Mensagem recebida do tipo: ${data.type}`);

            switch (data.type) {
                case 'join':
                    connectionPlayerId = data.playerId;
                    console.log(`DEBUG [Servidor]: Criando cobra para o jogador ${connectionPlayerId} com o nome ${data.name}`);
                    snakes[connectionPlayerId] = {
                        name: data.name,
                        segments: [{ x: 10, y: 10 }],
                        dx: 1, dy: 0, score: 0,
                        color: `rgb(${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55})`
                    };
                    if (!ranking[connectionPlayerId]) {
                        ranking[connectionPlayerId] = { name: data.name, highScore: 0 };
                        saveRanking();
                    } else {
                        ranking[connectionPlayerId].name = data.name;
                    }
                    break;

                case 'move':
                    const snake = snakes[data.playerId];
                    if (snake) {
                        console.log(`DEBUG [Servidor]: Jogador ${data.playerId} encontrado. Movendo a cobra.`);
                        if ((data.dx !== 0 && snake.dx !== -data.dx) || (data.dy !== 0 && snake.dy !== -data.dy)) {
                            snake.dx = data.dx;
                            snake.dy = data.dy;
                        }
                    } else {
                        console.log(`DEBUG [Servidor]: ERRO! Cobra para o jogador ${data.playerId} não foi encontrada!`);
                    }
                    break;
            }
        } catch (e) {
            console.error("Erro ao processar mensagem:", e);
        }
    });

    ws.on('close', () => {
        if (connectionPlayerId) {
            console.log(`DEBUG [Servidor]: Player ${connectionPlayerId} desconectado.`);
            delete snakes[connectionPlayerId];
        }
    });
});

setInterval(() => {
    // ... (O resto do servidor continua igual)
    for (let id in snakes) {
        let snake = snakes[id];
        let head = { x: snake.segments[0].x + snake.dx, y: snake.segments[0].y + snake.dy };
        if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
            if (ranking[id] && snake.score > ranking[id].highScore) {
                ranking[id].highScore = snake.score;
                saveRanking();
            }
            snake.segments = [{ x: 10, y: 10 }];
            snake.score = 0;
            continue;
        }
        snake.segments.unshift(head);
        let ateComida = false;
        foods.forEach((food, index) => {
            if (head.x === food.x && head.y === food.y) {
                foods[index] = createNewFood();
                ateComida = true;
                snake.score += 1;
            }
        });
        if (!ateComida) {
            snake.segments.pop();
        }
    }
    const playerCount = server.clients.size;
    const gameState = JSON.stringify({ snakes, foods, playerCount, ranking });
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(gameState);
        }
    });
}, 150);

console.log('Servidor WebSocket rodando na porta ' + (process.env.PORT || 8081));