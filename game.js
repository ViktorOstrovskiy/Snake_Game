class Snake {
    constructor(size = 20) {
        this.size = size;
        this.body = [{ x: 10, y: 10 }];
        this.direction = { x: 1, y: 0 };
        this.isGrowing = false;
    }

    move() {
        const newHead = {
            x: (this.body[0].x + this.direction.x + this.size) % this.size,
            y: (this.body[0].y + this.direction.y + this.size) % this.size
        };

        if (this.isGrowing) {
            this.isGrowing = false;
        } else {
            this.body.pop();
        }

        this.body.unshift(newHead);
    }

    grow() {
        this.isGrowing = true;
    }

    changeDirection(newDirection) {
        if (
            (newDirection.x === -this.direction.x && newDirection.y === 0) ||
            (newDirection.y === -this.direction.y && newDirection.x === 0)
        ) {
            return;
        }
        this.direction = newDirection;
    }

    hasCollided() {
        const [head, ...body] = this.body;
        return body.some(segment => segment.x === head.x && segment.y === head.y);
    }

    isOutOfBounds(width, height) {
        const head = this.body[0];
        return head.x < 0 || head.y < 0 || head.x >= width || head.y >= height;
    }

    isOccupying(position) {
        return this.body.some(segment => segment.x === position.x && segment.y === position.y);
    }
}

class Food {
    constructor(size = 20, snake = null, walls = []) {
        this.size = size;
        this.position = this.randomPosition(snake, walls);
    }

    randomPosition(snake = null, walls = []) {
        let position;
        do {
            position = {
                x: Math.floor(Math.random() * this.size),
                y: Math.floor(Math.random() * this.size)
            };
        } while (
            (snake && snake.isOccupying(position)) ||
            walls.some(wall => wall.x === position.x && wall.y === position.y)
            );
        return position;
    }

    respawn(snake = null, walls = []) {
        this.position = this.randomPosition(snake, walls);
    }
}

class GameManager {
    constructor(app) {
        this.app = app;

        this.size = 20;
        this.snake = new Snake(this.size);
        this.food = new Food(this.size, this.snake);
        this.food2 = null;
        this.portals = [];
        this.walls = [];
        this.currentMode = 'classic';
        this.bestScore = 0;
        this.score = 0;

        this.moveInterval = 200;
        this.lastMoveTime = 0;

        this.setup();
        this.isPlaying = false;
    }

    setup() {
        this.snakeGraphic = new PIXI.Graphics();
        this.foodGraphic = new PIXI.Graphics();
        this.wallsGraphic = new PIXI.Graphics();
        this.app.stage.addChild(this.snakeGraphic);
        this.app.stage.addChild(this.foodGraphic);
        this.app.stage.addChild(this.wallsGraphic);

        window.addEventListener('keydown', this.handleKeyInput.bind(this));

        document.getElementById('game-modes').addEventListener('change', (event) => {
            this.currentMode = event.target.value;
            this.resetGame();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            this.pauseGame();
        });

        this.updateScore();
    }

    handleKeyInput(event) {
        if (!this.isPlaying) return;
        switch (event.key) {
            case 'ArrowUp':
                this.snake.changeDirection({ x: 0, y: -1 });
                break;
            case 'ArrowDown':
                this.snake.changeDirection({ x: 0, y: 1 });
                break;
            case 'ArrowLeft':
                this.snake.changeDirection({ x: -1, y: 0 });
                break;
            case 'ArrowRight':
                this.snake.changeDirection({ x: 1, y: 0 });
                break;
        }
    }

    startGame() {
        this.isPlaying = true;
        this.lastMoveTime = performance.now();
        this.app.ticker.add(this.tickerCallback, this);
        document.getElementById('play-btn').style.display = 'none';
        document.getElementById('exit-btn').style.display = 'none';
        document.getElementById('game-modes').style.display = 'none';
        document.getElementById('menu-btn').style.display = 'inline-block';

        if (this.currentMode === 'portal') {
            this.spawnPortals();
        } else {
            this.food.respawn(this.snake, this.walls);
        }
    }

    pauseGame() {
        this.isPlaying = false;
        this.app.ticker.remove(this.tickerCallback, this);
        document.getElementById('play-btn').style.display = 'inline-block';
        document.getElementById('exit-btn').style.display = 'inline-block';
        document.getElementById('game-modes').style.display = 'flex';
        document.getElementById('menu-btn').style.display = 'none';
        this.moveInterval = 200;
    }

    tickerCallback(delta) {
        this.playGame(delta);
    }

    playGame(delta) {
        if (!this.isPlaying) return;

        const currentTime = performance.now();
        if (currentTime - this.lastMoveTime >= this.moveInterval) {
            this.snake.move();

            const head = this.snake.body[0];

            if (this.currentMode === 'classic') {
                if (
                    this.snake.isOutOfBounds(this.size, this.size) ||
                    this.snake.hasCollided()
                ) {
                    alert('Game Over!');
                    this.stopGame();
                    return;
                }
            } else if (this.currentMode === 'no-die') {

            } else {
                if (this.snake.isOutOfBounds(this.size, this.size) || this.snake.hasCollided()) {
                    alert('Game Over!');
                    this.stopGame();
                    return;
                }
            }

            if (this.currentMode === 'walls') {
                if (this.walls.some(wall => wall.x === head.x && wall.y === head.y)) {
                    alert('Game Over!');
                    this.stopGame();
                    return;
                }
            }

            if (this.currentMode === 'portal') {
                this.handlePortalEating();
            } else {
                if (head.x === this.food.position.x && head.y === this.food.position.y) {
                    this.snake.grow();
                    this.score += 1;
                    this.updateScore();

                    if (this.currentMode === 'walls') {
                        this.addWall();
                    }

                    if (this.currentMode === 'speed') {
                        this.increaseSpeed();
                    }

                    this.food.respawn(this.snake, this.walls);
                }
            }

            this.lastMoveTime = currentTime;
        }

        this.drawGame();
    }

    handlePortalEating() {
        const head = this.snake.body[0];
        if (
            (head.x === this.food.position.x && head.y === this.food.position.y) ||
            (head.x === this.food2.position.x && head.y === this.food2.position.y)
        ) {
            const otherPortal =
                head.x === this.food.position.x && head.y === this.food.position.y
                    ? this.food2.position
                    : this.food.position;

            head.x = otherPortal.x;
            head.y = otherPortal.y;

            this.snake.grow();
            this.score += 1;
            this.updateScore();
            this.spawnPortals();
        }
    }

    addWall() {
        let wallPosition;
        do {
            wallPosition = {
                x: Math.floor(Math.random() * this.size),
                y: Math.floor(Math.random() * this.size)
            };
        } while (
            this.snake.isOccupying(wallPosition) ||
            this.walls.some(wall => wall.x === wallPosition.x && wall.y === wallPosition.y) ||
            (this.food.position.x === wallPosition.x && this.food.position.y === wallPosition.y)
            );
        this.walls.push(wallPosition);
    }

    spawnPortals() {
        this.food = new Food(this.size, this.snake, this.walls);
        this.food2 = new Food(this.size, this.snake, this.walls);

        while (
            this.food.position.x === this.food2.position.x &&
            this.food.position.y === this.food2.position.y
            ) {
            this.food2.respawn(this.snake, this.walls);
        }
    }

    resetGame() {
        this.snake = new Snake(this.size);
        this.score = 0;
        this.moveInterval = 200;
        this.walls = [];
        this.portals = [];
        this.food = new Food(this.size, this.snake);
        this.food2 = null;
        this.updateScore();
    }

    stopGame() {
        this.isPlaying = false;
        this.app.ticker.remove(this.tickerCallback, this);
        document.getElementById('play-btn').style.display = 'inline-block';
        document.getElementById('exit-btn').style.display = 'inline-block';
        document.getElementById('game-modes').style.display = 'flex';
        document.getElementById('menu-btn').style.display = 'none';
        this.resetGame();
    }

    drawGame() {
        this.snakeGraphic.clear();
        this.snake.body.forEach(segment => {
            this.snakeGraphic.beginFill(0x00ff00);
            this.snakeGraphic.drawRect(segment.x * 20, segment.y * 20, 20, 20);
            this.snakeGraphic.endFill();
        });

        this.foodGraphic.clear();
        this.foodGraphic.beginFill(0xff0000);
        this.foodGraphic.drawRect(this.food.position.x * 20, this.food.position.y * 20, 20, 20);
        this.foodGraphic.endFill();

        if (this.currentMode === 'portal' && this.food2) {
            this.foodGraphic.beginFill(0x0000ff);
            this.foodGraphic.drawRect(this.food2.position.x * 20, this.food2.position.y * 20, 20, 20);
            this.foodGraphic.endFill();
        }

        this.wallsGraphic.clear();
        this.walls.forEach(wall => {
            this.wallsGraphic.beginFill(0x808080);
            this.wallsGraphic.drawRect(wall.x * 20, wall.y * 20, 20, 20);
            this.wallsGraphic.endFill();
        });
    }

    updateScore() {
        document.getElementById('current-score').textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            document.getElementById('best-score').textContent = this.bestScore;
        }
    }

    increaseSpeed() {
        this.moveInterval *= 0.9;
        if (this.moveInterval < 50) this.moveInterval = 50;
    }
}

async function initializeGame() {
    const app = new PIXI.Application();

    await app.init({
        width: 400,
        height: 400,
        backgroundColor: '#3a3f46'
    });

    document.getElementById('gameCanvas').appendChild(app.canvas);

    const gameManager = new GameManager(app);

    document.getElementById('play-btn').addEventListener('click', () => {
        gameManager.startGame();
    });

    document.getElementById('exit-btn').addEventListener('click', () => {
        gameManager.stopGame();
    });
}

window.onload = function () {
    initializeGame();
};
