// Arcade Hub - Game Logic

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Arcade Hub] Initializing...');

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameArea = document.getElementById('gameArea');
    const currentGameTitle = document.getElementById('currentGameTitle');
    const gameInstructions = document.getElementById('gameInstructions');
    const resetBtn = document.getElementById('resetBtn');
    const gameCards = document.querySelectorAll('.game-card');

    let currentGame = null;
    let gameLoop = null;
    let gameState = {};

    console.log('[Arcade Hub] Found ' + gameCards.length + ' game cards');

    // Game selection - handle both card and button clicks
    gameCards.forEach(card => {
        card.addEventListener('click', (e) => {
            console.log('[Arcade Hub] Card clicked:', card.dataset.game);
            // Prevent any default button behavior
            if (e.target.tagName === 'BUTTON') {
                e.preventDefault();
                e.stopPropagation();
            }
            const game = card.dataset.game;
            loadGame(game);
        });
    });

    // Also attach listeners directly to play buttons for reliability
    const playButtons = document.querySelectorAll('.play-btn');
    console.log('[Arcade Hub] Found ' + playButtons.length + ' play buttons');
    playButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('[Arcade Hub] Button clicked');
            e.preventDefault();
            e.stopPropagation();
            const card = btn.closest('.game-card');
            if (card) {
                const game = card.dataset.game;
                console.log('[Arcade Hub] Loading game:', game);
                loadGame(game);
            }
        });
    });

    resetBtn.addEventListener('click', () => {
        if (currentGame) {
            loadGame(currentGame);
        }
    });

function loadGame(game) {
    // Clear any existing game loop
    if (gameLoop) {
        clearInterval(gameLoop);
        cancelAnimationFrame(gameLoop);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentGame = game;
    resetBtn.classList.remove('hidden');

    switch (game) {
        case 'snake':
            initSnake();
            break;
        case 'memory':
            initMemory();
            break;
        case 'clicker':
            initClicker();
            break;
    }
}

// ==================== SNAKE GAME ====================
function initSnake() {
    currentGameTitle.textContent = 'Snake Game';
    gameInstructions.textContent = 'Use arrow keys to move. Eat the red food to grow!';

    const gridSize = 20;
    const tileCount = canvas.width / gridSize;

    gameState = {
        snake: [{ x: 10, y: 10 }],
        food: { x: 15, y: 15 },
        dx: 0,
        dy: 0,
        score: 0
    };

    // Keyboard controls
    document.onkeydown = (e) => {
        switch (e.key) {
            case 'ArrowUp':
                if (gameState.dy === 0) { gameState.dx = 0; gameState.dy = -1; }
                break;
            case 'ArrowDown':
                if (gameState.dy === 0) { gameState.dx = 0; gameState.dy = 1; }
                break;
            case 'ArrowLeft':
                if (gameState.dx === 0) { gameState.dx = -1; gameState.dy = 0; }
                break;
            case 'ArrowRight':
                if (gameState.dx === 0) { gameState.dx = 1; gameState.dy = 0; }
                break;
        }
    };

    function drawSnake() {
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw snake
        ctx.fillStyle = '#00d9ff';
        gameState.snake.forEach((segment, index) => {
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        });

        // Draw food
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(gameState.food.x * gridSize, gameState.food.y * gridSize, gridSize - 2, gridSize - 2);

        // Draw score
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('Score: ' + gameState.score, 10, 30);
    }

    function updateSnake() {
        const head = { x: gameState.snake[0].x + gameState.dx, y: gameState.snake[0].y + gameState.dy };

        // Wrap around walls
        if (head.x < 0) head.x = tileCount - 1;
        if (head.x >= tileCount) head.x = 0;
        if (head.y < 0) head.y = tileCount - 1;
        if (head.y >= tileCount) head.y = 0;

        // Check self collision
        for (let segment of gameState.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                gameInstructions.textContent = 'Game Over! Score: ' + gameState.score;
                clearInterval(gameLoop);
                return;
            }
        }

        gameState.snake.unshift(head);

        // Check food collision
        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            gameState.score++;
            gameState.food = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
        } else {
            gameState.snake.pop();
        }

        drawSnake();
    }

    drawSnake();
    gameLoop = setInterval(updateSnake, 100);
}

// ==================== MEMORY GAME ====================
function initMemory() {
    currentGameTitle.textContent = 'Memory Match';
    gameInstructions.textContent = 'Click cards to flip them. Find all matching pairs!';

    const emojis = ['🎮', '🎲', '🎯', '🎪', '🎨', '🎭'];
    const cards = [...emojis, ...emojis];
    cards.sort(() => Math.random() - 0.5);

    gameState = {
        cards: cards,
        flipped: [],
        matched: [],
        canFlip: true
    };

    // Clear canvas and set up click handler
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = 4;
    const rows = 3;
    const cardWidth = 120;
    const cardHeight = 100;
    const gapX = 20;
    const gapY = 20;
    const startX = (canvas.width - (cols * cardWidth + (cols - 1) * gapX)) / 2;
    const startY = (canvas.height - (rows * cardHeight + (rows - 1) * gapY)) / 2;

    function drawMemoryBoard() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        gameState.cards.forEach((emoji, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (cardWidth + gapX);
            const y = startY + row * (cardHeight + gapY);

            // Draw card background
            if (gameState.matched.includes(index) || gameState.flipped.includes(index)) {
                ctx.fillStyle = '#00d9ff';
                ctx.fillRect(x, y, cardWidth, cardHeight);
                ctx.fillStyle = '#000000';
                ctx.font = '40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emoji, x + cardWidth / 2, y + cardHeight / 2);
            } else {
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(x, y, cardWidth, cardHeight);
                ctx.strokeStyle = '#00d9ff';
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, cardWidth, cardHeight);
                ctx.fillStyle = '#00d9ff';
                ctx.font = '30px Arial';
                ctx.fillText('?', x + cardWidth / 2, y + cardHeight / 2);
            }
        });

        // Check win condition
        if (gameState.matched.length === gameState.cards.length) {
            ctx.fillStyle = '#00d9ff';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('You Won!', canvas.width / 2, 50);
        }
    }

    canvas.onclick = (e) => {
        if (!gameState.canFlip) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Find clicked card
        for (let i = 0; i < gameState.cards.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (cardWidth + gapX);
            const y = startY + row * (cardHeight + gapY);

            if (clickX >= x && clickX <= x + cardWidth &&
                clickY >= y && clickY <= y + cardHeight &&
                !gameState.flipped.includes(i) &&
                !gameState.matched.includes(i)) {

                gameState.flipped.push(i);
                drawMemoryBoard();

                if (gameState.flipped.length === 2) {
                    gameState.canFlip = false;
                    const [first, second] = gameState.flipped;

                    if (gameState.cards[first] === gameState.cards[second]) {
                        gameState.matched.push(first, second);
                        gameState.flipped = [];
                        gameState.canFlip = true;
                        drawMemoryBoard();
                    } else {
                        setTimeout(() => {
                            gameState.flipped = [];
                            gameState.canFlip = true;
                            drawMemoryBoard();
                        }, 1000);
                    }
                }
                break;
            }
        }
    };

    drawMemoryBoard();
}

// ==================== CLICKER GAME ====================
function initClicker() {
    currentGameTitle.textContent = 'Clicker Game';
    gameInstructions.textContent = 'Click the target as fast as you can for 10 seconds!';

    gameState = {
        score: 0,
        timeLeft: 10,
        targetX: 250,
        targetY: 200,
        targetRadius: 30,
        isPlaying: false,
        gameStarted: false
    };

    function drawClicker() {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!gameState.gameStarted) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Click anywhere to start!', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Draw target
        ctx.beginPath();
        ctx.arc(gameState.targetX, gameState.targetY, gameState.targetRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4757';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw score
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + gameState.score, 20, 40);

        // Draw time
        ctx.textAlign = 'right';
        ctx.fillText('Time: ' + gameState.timeLeft + 's', canvas.width - 20, 40);

        if (gameState.timeLeft <= 0) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00d9ff';
            ctx.font = '40px Arial';
            ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
            ctx.font = '24px Arial';
            ctx.fillText('Final Score: ' + gameState.score, canvas.width / 2, canvas.height / 2 + 40);
            gameState.isPlaying = false;
        }
    }

    canvas.onclick = (e) => {
        if (gameState.timeLeft <= 0) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (!gameState.gameStarted) {
            gameState.gameStarted = true;
            gameState.isPlaying = true;

            // Start timer
            const timer = setInterval(() => {
                if (gameState.timeLeft > 0) {
                    gameState.timeLeft--;
                } else {
                    clearInterval(timer);
                }
                drawClicker();
            }, 1000);

            drawClicker();
            return;
        }

        // Check if clicked on target
        const distance = Math.sqrt(
            Math.pow(clickX - gameState.targetX, 2) +
            Math.pow(clickY - gameState.targetY, 2)
        );

        if (distance <= gameState.targetRadius) {
            gameState.score++;
            // Move target to random position
            gameState.targetX = Math.random() * (canvas.width - 60) + 30;
            gameState.targetY = Math.random() * (canvas.height - 60) + 30;
        }

        drawClicker();
    };

    drawClicker();
}

}); // End DOMContentLoaded
