const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

let snakes = {};
let foods = [{ x: 15, y: 15 }];

server.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);
    ws.send(JSON.stringify({ playerId }));
    snakes[playerId] = { segments: [{ x: 10, y: 10 }], dx: 1, dy: 0, color: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})` };

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if (data.type === 'move' && snakes[data.playerId]) {
            const snake = snakes[data.playerId];
            if ((data.dx === -snake.dx && data.dy === -snake.dy) || (data.dy === -snake.dy && data.dx === -snake.dx)) return;
            snake.dx = data.dx;
            snake.dy = data.dy;
        }
    });

    ws.on('close', () => delete snakes[playerId]);

    setInterval(() => {
        for (let id in snakes) {
            let snake = snakes[id];
            let head = { x: snake.segments[0].x + snake.dx, y: snake.segments[0].y + snake.dy };
            if (head.x < 0 || head.x >= canvas.width / 20 || head.y < 0 || head.y >= canvas.height / 20) {
                head = { x: snake.segments[0].x, y: snake.segments[0].y };
            }
            snake.segments.unshift(head);
            if (head.x === foods[0].x && head.y === foods[0].y) {
                foods[0] = { x: Math.floor(Math.random() * (canvas.width / 20)), y: Math.floor(Math.random() * (canvas.height / 20)) };
            } else {
                snake.segments.pop();
            }
        }
        server.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ snakes, foods }));
            }
        });
    }, 100);
});

console.log('Servidor WebSocket rodando na porta ' + (process.env.PORT || 8080));