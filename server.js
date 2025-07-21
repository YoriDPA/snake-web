const WebSocket = require('ws');
const fs = require('fs');

const server = new WebSocket.Server({ port: process.env.PORT || 8081 });

const IDLE_TIMEOUT_MS = 30000;
const LOOT_FOOD_LIFETIME_MS = 15000;

const RANKING_FILE = './ranking.json';
let ranking = {};
try { const data = fs.readFileSync(RANKING_FILE); ranking = JSON.parse(data); } catch (error) { fs.writeFileSync(RANKING_FILE, JSON.stringify({})); }
function saveRanking() { fs.writeFileSync(RANKING_FILE, JSON.stringify(ranking, null, 2)); }

const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;
let snakes = {};
let foods = [];
let stars = [];

function createNewFood() { return { x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) }; }
foods.push(createNewFood());

function manageStars() { /* ... (função da estrela) ... */ }
setInterval(manageStars, 1000);

server.on('connection', (ws) => {
    let connectionPlayerId = null; 

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            switch (data.type) {
                case 'join':
                    connectionPlayerId = data.playerId;
                    ws.playerId = data.playerId;
                    snakes[connectionPlayerId] = {
                        name: data.name,
                        segments: [{ x: 10, y: 10 }],
                        dx: 0, dy: 0, 
                        score: 0,
                        growth: 0,
                        lastActivityTime: Date.now(),
                        color: `rgb(${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55}, ${Math.floor(Math.random() * 200) + 55})`
                    };
                    if (!ranking[connectionPlayerId]) {
                        ranking[connectionPlayerId] = { name: data.name, highScore: 0 };
                        saveRanking();
                    } else {
                        ranking[connectionPlayerId].name = data.name;
                    }
                    ws.send(JSON.stringify({ type: 'joined' }));
                    break;

                case 'move':
                    const snake = snakes[data.playerId];
                    if (snake) {
                        snake.lastActivityTime = Date.now();
                        if ((snake.dx === 0 && snake.dy === 0) || (data.dx !== -snake.dx && data.dy !== -snake.dy)) {
                            snake.dx = data.dx;
                            snake.dy = data.dy;
                        }
                    }
                    break;
            }
        } catch (e) { console.error("Erro ao processar mensagem:", e); }
    });

    ws.on('close', () => {
        if (ws.playerId && snakes[ws.playerId]) {
            delete snakes[ws.playerId];
        }
    });
});


setInterval(() => {
    const now = Date.now();
    
    foods = foods.filter(food => !food.createdAt || (now - food.createdAt < LOOT_FOOD_LIFETIME_MS));
    if (!foods.some(food => !food.createdAt)) {
        foods.push(createNewFood());
    }

    for (const client of server.clients) {
        if (client.playerId && snakes[client.playerId]) {
            if (now - snakes[client.playerId].lastActivityTime > IDLE_TIMEOUT_MS) {
                client.terminate();
            }
        }
    }

    const playersToReset = new Set();
    const playerPositions = {};
    const futureHeadPositions = {};

    for (const id in snakes) {
        const snake = snakes[id];
        if (snake.dx === 0 && snake.dy === 0) {
            futureHeadPositions[id] = snake.segments[0];
        } else {
            futureHeadPositions[id] = { x: snake.segments[0].x + snake.dx, y: snake.segments[0].y + snake.dy };
        }
        playerPositions[id] = snake.segments;
    }

    for (const id in snakes) {
        const snake = snakes[id];
        if (snake.dx === 0 && snake.dy === 0) continue;

        const head = futureHeadPositions[id];
        if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
            playersToReset.add(id); continue;
        }
        for (const otherId in playerPositions) {
            const segmentsToTest = (id === otherId) ? playerPositions[otherId].slice(1) : playerPositions[otherId];
            if (segmentsToTest.some(seg => seg.x === head.x && seg.y === head.y)) {
                playersToReset.add(id); break;
            }
        }
    }

    playersToReset.forEach(id => {
        const deadSnake = snakes[id];
        
        // --- CORREÇÃO AQUI ---
        // Compara a pontuação atual com a pontuação máxima guardada no ranking
        if (ranking[id] && deadSnake.score > ranking[id].highScore) {
            ranking[id].highScore = deadSnake.score;
            console.log(`Novo recorde para ${ranking[id].name}: ${ranking[id].highScore}`);
            saveRanking();
        }

        if (server.clients.size > 2) {
            deadSnake.segments.forEach(seg => {
                foods.push({ x: seg.x, y: seg.y, createdAt: now });
            });
        }
        deadSnake.segments = [{ x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) }];
        deadSnake.score = 0;
        deadSnake.growth = 0;
        deadSnake.dx = 0;
        deadSnake.dy = 0;
    });

    for (let id in snakes) {
        if (playersToReset.has(id)) continue;
        const snake = snakes[id];
        
        if (snake.dx !== 0 || snake.dy !== 0) {
            const head = futureHeadPositions[id];
            snake.segments.unshift(head);

            let ateComida = false;
            foods.forEach((food, index) => {
                if (head.x === food.x && head.y === food.y) {
                    foods.splice(index, 1);
                    ateComida = true;
                    snake.score += 1;
                }
            });
            
            stars.forEach((star, index) => {
                if(head.x === star.x && head.y === star.y) {
                    snake.growth += 5;
                    snake.score += 5;
                    stars.splice(index, 1);
                }
            });

            if (ateComida) {} 
            else if (snake.growth > 0) { snake.growth -= 1; } 
            else { snake.segments.pop(); }
        }
    }
    
    const playerCount = server.clients.size;
    const gameState = JSON.stringify({ snakes, foods, stars, playerCount, ranking }); 
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) { client.send(gameState); }
    });
}, 150);

console.log('Servidor WebSocket rodando na porta ' + (process.env.PORT || 8081));

const STAR_LIFETIME_MS = 10000;
const STAR_SPAWN_CHANCE = 0.15;
function manageStars() {
    const now = Date.now();
    stars = stars.filter(star => now - star.createdAt < STAR_LIFETIME_MS);
    if (server.clients.size > 3 && stars.length === 0 && Math.random() < STAR_SPAWN_CHANCE) {
        stars.push({ x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT), createdAt: now });
    }
}