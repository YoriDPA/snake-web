const WebSocket = require('ws');
const fs = require('fs');

const server = new WebSocket.Server({ port: process.env.PORT || 8081 });

// --- NOVA CONSTANTE ---
const IDLE_TIMEOUT_MS = 30000; // 30 segundos em milissegundos

const RANKING_FILE = './ranking.json';
let ranking = {};
try { const data = fs.readFileSync(RANKING_FILE); ranking = JSON.parse(data); } catch (error) { fs.writeFileSync(RANKING_FILE, JSON.stringify({})); }
function saveRanking() { fs.writeFileSync(RANKING_FILE, JSON.stringify(ranking, null, 2)); }

const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;
let snakes = {};
let foods = [];

function createNewFood() { return { x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) }; }
foods.push(createNewFood());

server.on('connection', (ws) => {
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            switch (data.type) {
                case 'join':
                    // --- ALTERAÇÃO AQUI: Anexar ID ao WebSocket e registrar atividade ---
                    ws.playerId = data.playerId; // Anexa o ID persistente à conexão
                    console.log(`Player ${ws.playerId} (nome: ${data.name}) entrou no jogo.`);
                    
                    snakes[ws.playerId] = {
                        name: data.name,
                        segments: [{ x: 10, y: 10 }],
                        dx: 1, dy: 0, score: 0,
                        lastActivityTime: Date.now(), // Registra a hora da última atividade
                        color: `rgb(${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55})`
                    };

                    if (!ranking[ws.playerId]) {
                        ranking[ws.playerId] = { name: data.name, highScore: 0 };
                        saveRanking();
                    } else {
                        ranking[ws.playerId].name = data.name;
                    }
                    ws.send(JSON.stringify({ type: 'joined' }));
                    break;

                case 'move':
                    const snake = snakes[data.playerId];
                    if (snake) {
                        // --- ALTERAÇÃO AQUI: Atualiza a hora da última atividade ---
                        snake.lastActivityTime = Date.now();
                        if ((data.dx !== 0 && snake.dx !== -data.dx) || (data.dy !== 0 && snake.dy !== -data.dy)) {
                            snake.dx = data.dx;
                            snake.dy = data.dy;
                        }
                    }
                    break;
            }
        } catch (e) { console.error("Erro ao processar mensagem:", e); }
    });

    ws.on('close', () => {
        // Usa o playerId anexado para saber quem desconectou
        if (ws.playerId && snakes[ws.playerId]) {
            console.log(`Player ${snakes[ws.playerId].name} (${ws.playerId}) desconectado.`);
            delete snakes[ws.playerId];
        }
    });
});

setInterval(() => {
    // --- NOVO BLOCO DE CÓDIGO: Verificação de Inatividade ---
    const now = Date.now();
    for (const client of server.clients) {
        // Verifica apenas clientes que já se juntaram ao jogo
        if (client.playerId && snakes[client.playerId]) {
            const snake = snakes[client.playerId];
            if (now - snake.lastActivityTime > IDLE_TIMEOUT_MS) {
                console.log(`Player ${snake.name} (${client.playerId}) removido por inatividade.`);
                client.terminate(); // Força o fechamento da conexão
            }
        }
    }
    // --- FIM DO NOVO BLOCO ---

    // Lógica de movimento e colisão... (continua a mesma)
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
        if (!ateComida) { snake.segments.pop(); }
    }
    
    const playerCount = server.clients.size;
    const gameState = JSON.stringify({ snakes, foods, playerCount, ranking });
    
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) { client.send(gameState); }
    });
}, 150);

console.log('Servidor WebSocket rodando na porta ' + (process.env.PORT || 8081));