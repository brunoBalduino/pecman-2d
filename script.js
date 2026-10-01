"use strict";

/* =========================================================
CANVAS
========================================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const TILE = 32;
const COLS = 28;
const ROWS = 20;

const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;

canvas.width = WIDTH;
canvas.height = HEIGHT;

/* =========================================================
INTERFACE
========================================================= */

const score1Element = document.getElementById("score1");
const score2Element = document.getElementById("score2");

const lives1Element = document.getElementById("lives1");
const lives2Element = document.getElementById("lives2");

const statusElement = document.getElementById("statusText");
const levelElement = document.getElementById("levelText");

const restartButton = document.getElementById("restartBtn");

const overlay = document.getElementById("overlay");

const resultIcon = document.getElementById("resultIcon");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const resultButton = document.getElementById("resultBtn");

/* =========================================================
MAPA

= parede
. = orb
o = power-up
P = portal
espaço = corredor

O mapa possui exatamente 28 colunas x 20 linhas.
========================================================= */

const MAP = [
"############################",
"#............##............#",
"#.####.#####.##.#####.####.#",
"#o####.#####.##.#####.####o#",
"#..........................#",
"#.####.##.########.##.####.#",
"#......##....##....##......#",
"######.#####.##.#####.######",
"#............PP............#",
"#.####.#####....#####.####.#",
"#......#............#......#",
"####.#.##.####.####.##.#.###",
"#....#........##........#...#",
"#.##.###.####.####.###.##..#",
"#o##.....#....##....#.....o#",
"####.###.#.########.#.###.##",
"#............##............#",
"#.####.#####.##.#####.####.#",
"#..........................#",
"############################"
];

/* =========================================================
ESTADO DO JOGO
========================================================= */

let grid = [];

let pellets = [];
let powerUps = [];
let portals = [];
let particles = [];
let enemies = [];

let gameOver = false;
let level = 1;

let remainingItems = 0;

let frame = 0;

let audioContext = null;

/* =========================================================
TECLADO
========================================================= */

const keys = {};

window.addEventListener("keydown", function (event) {

keys[event.code] = true;

const prevent = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space"
];

if (prevent.includes(event.code)) {
    event.preventDefault();
}

});

window.addEventListener("keyup", function (event) {

keys[event.code] = false;

});

/* =========================================================
UTILITÁRIOS
========================================================= */

function clamp(value, min, max) {

return Math.max(min, Math.min(max, value));

}

function distance(a, b) {

return Math.hypot(
    a.x - b.x,
    a.y - b.y
);

}

function cellToPixel(col, row) {

return {
    x: col * TILE + TILE / 2,
    y: row * TILE + TILE / 2
};

}

function isWall(col, row) {

if (
    row < 0 ||
    row >= ROWS ||
    col < 0 ||
    col >= COLS
) {
    return true;
}

return grid[row][col] === "#";

}

/* =========================================================
CONSTRUIR MAPA
========================================================= */

function buildMap() {

grid = [];
pellets = [];
powerUps = [];
portals = [];

for (let row = 0; row < ROWS; row++) {

    const source = MAP[row];

    grid[row] = [];

    for (let col = 0; col < COLS; col++) {

        const char = source[col];

        if (char === "#") {

            grid[row][col] = "#";

        } else {

            grid[row][col] = " ";

        }

        const position = cellToPixel(col, row);

        if (char === ".") {

            pellets.push({
                x: position.x,
                y: position.y,
                collected: false,
                phase: Math.random() * 10
            });

        }

        if (char === "o") {

            powerUps.push({
                x: position.x,
                y: position.y,
                collected: false,
                phase: Math.random() * 10
            });

        }

        if (char === "P") {

            portals.push({
                x: position.x,
                y: position.y
            });

        }

    }

}

remainingItems =
    pellets.length +
    powerUps.length;

}

/* =========================================================
COLISÃO COM PAREDES
========================================================= */

function canMove(x, y, radius) {

const points = [
    { x: x - radius, y: y - radius },
    { x: x + radius, y: y - radius },
    { x: x - radius, y: y + radius },
    { x: x + radius, y: y + radius }
];

for (const point of points) {

    const col = Math.floor(point.x / TILE);
    const row = Math.floor(point.y / TILE);

    if (isWall(col, row)) {
        return false;
    }

}

return true;

}

/* =========================================================
DIREÇÕES
========================================================= */

const DIRECTIONS = [
{ x: 1, y: 0 },
{ x: -1, y: 0 },
{ x: 0, y: 1 },
{ x: 0, y: -1 }
];

function canDirectionMove(entity, direction) {

const testX =
    entity.x +
    direction.x *
    entity.speed *
    2;

const testY =
    entity.y +
    direction.y *
    entity.speed *
    2;

return canMove(
    testX,
    testY,
    entity.radius
);

}

/* =========================================================
PARTÍCULAS
========================================================= */

function createParticles(
x,
y,
color,
amount = 12
) {

for (let i = 0; i < amount; i++) {

    particles.push({

        x,
        y,

        vx:
            (Math.random() - .5) * 5,

        vy:
            (Math.random() - .5) * 5,

        size:
            2 + Math.random() * 4,

        life:
            20 + Math.random() * 25,

        color

    });

}

}

function updateParticles() {

for (const particle of particles) {

    particle.x += particle.vx;
    particle.y += particle.vy;

    particle.vx *= .96;
    particle.vy *= .96;

    particle.life--;

}

particles =
    particles.filter(
        particle =>
            particle.life > 0
    );

}

function drawParticles() {

for (const particle of particles) {

    ctx.globalAlpha =
        particle.life / 45;

    ctx.fillStyle =
        particle.color;

    ctx.fillRect(
        particle.x,
        particle.y,
        particle.size,
        particle.size
    );

}

ctx.globalAlpha = 1;

}

/* =========================================================
PLAYER
========================================================= */

class Player {

constructor({
    name,
    color,
    x,
    y
}) {

    this.name = name;

    this.color = color;

    this.x = x;
    this.y = y;

    this.spawnX = x;
    this.spawnY = y;

    this.radius = 11;

    this.speed = 2.65;

    this.dirX = 0;
    this.dirY = 0;

    this.nextX = 0;
    this.nextY = 0;

    this.score = 0;

    this.lives = 3;

    this.powerTimer = 0;

    this.invincibleTimer = 0;

    this.portalCooldown = 0;

    this.alive = true;

}

resetPosition() {

    this.x = this.spawnX;
    this.y = this.spawnY;

    this.dirX = 0;
    this.dirY = 0;

    this.nextX = 0;
    this.nextY = 0;

    this.invincibleTimer = 90;
    this.portalCooldown = 30;

}

update(controls) {

    if (!this.alive) {
        return;
    }

    /* =========================
       INPUT
    ========================= */

    if (keys[controls.up]) {

        this.nextX = 0;
        this.nextY = -1;

    }

    if (keys[controls.down]) {

        this.nextX = 0;
        this.nextY = 1;

    }

    if (keys[controls.left]) {

        this.nextX = -1;
        this.nextY = 0;

    }

    if (keys[controls.right]) {

        this.nextX = 1;
        this.nextY = 0;

    }

    /* =========================
       TENTAR NOVA DIREÇÃO
    ========================= */

    if (
        canMove(
            this.x +
            this.nextX *
            this.speed *
            2,

            this.y +
            this.nextY *
            this.speed *
            2,

            this.radius
        )
    ) {

        this.dirX = this.nextX;
        this.dirY = this.nextY;

    }

    /* =========================
       MOVIMENTO
    ========================= */

    const nextPosition = {
        x:
            this.x +
            this.dirX *
            this.speed,

        y:
            this.y +
            this.dirY *
            this.speed
    };

    if (
        canMove(
            nextPosition.x,
            nextPosition.y,
            this.radius
        )
    ) {

        this.x = nextPosition.x;
        this.y = nextPosition.y;

    }

    /* =========================
       TIMERS
    ========================= */

    if (this.powerTimer > 0) {
        this.powerTimer--;
    }

    if (this.invincibleTimer > 0) {
        this.invincibleTimer--;
    }

    if (this.portalCooldown > 0) {
        this.portalCooldown--;
    }

    collectItems(this);

    checkPortal(this);

}

draw() {

    if (!this.alive) {
        return;
    }

    ctx.save();

    /* POWER-UP */

    if (this.powerTimer > 0) {

        ctx.shadowColor = "#24e6ff";
        ctx.shadowBlur = 18;

        ctx.strokeStyle = "#24e6ff";
        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            17 +
            Math.sin(frame * .15) * 2,
            0,
            Math.PI * 2
        );

        ctx.stroke();

    }

    /* INVENCIBILIDADE */

    if (
        this.invincibleTimer > 0 &&
        Math.floor(
            this.invincibleTimer / 5
        ) % 2 === 0
    ) {

        ctx.globalAlpha = .4;

    }

    ctx.fillStyle = this.color;

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 13;

    ctx.beginPath();

    ctx.arc(
        this.x,
        this.y,
        this.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    /* OLHO */

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";

    const eyeX =
        this.x +
        this.dirX * 5;

    const eyeY =
        this.y +
        this.dirY * 5;

    ctx.beginPath();

    ctx.arc(
        eyeX,
        eyeY,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

}

}

/* =========================================================
CRIAR JOGADORES
========================================================= */

const player1 = new Player({

name: "PLAYER 1",

color: "#ff3864",

x: TILE * 1.5,

y: TILE * 4.5

});

const player2 = new Player({

name: "PLAYER 2",

color: "#378bff",

x: TILE * 26.5,

y: TILE * 4.5

});

/* =========================================================
PEGAR ITENS
========================================================= */

function collectItems(player) {

for (const pellet of pellets) {

    if (pellet.collected) {
        continue;
    }

    if (
        distance(
            player,
            pellet
        ) < 15
    ) {

        pellet.collected = true;

        player.score += 10;

        remainingItems--;

        createParticles(
            pellet.x,
            pellet.y,
            "#ffd447",
            6
        );

        playTone(
            600,
            .035,
            "square"
        );

    }

}

for (const power of powerUps) {

    if (power.collected) {
        continue;
    }

    if (
        distance(
            player,
            power
        ) < 18
    ) {

        power.collected = true;

        player.score += 50;

        player.powerTimer =
            60 * 7;

        remainingItems--;

        createParticles(
            power.x,
            power.y,
            "#24e6ff",
            22
        );

        playTone(
            900,
            .1,
            "sine"
        );

    }

}

}

/* =========================================================
PORTAIS
========================================================= */

function checkPortal(player) {

if (
    player.portalCooldown > 0 ||
    portals.length < 2
) {
    return;
}

for (let i = 0; i < portals.length; i++) {

    const portal = portals[i];

    if (
        distance(
            player,
            portal
        ) < 13
    ) {

        const other =
            portals[
                i === 0 ? 1 : 0
            ];

        player.x = other.x;
        player.y = other.y;

        player.portalCooldown = 40;

        player.score += 5;

        createParticles(
            other.x,
            other.y,
            "#b45cff",
            20
        );

        playTone(
            450,
            .08,
            "triangle"
        );

        break;

    }

}

}

/* =========================================================
INIMIGO
========================================================= */

class Enemy {

constructor({
    x,
    y,
    color,
    mode,
    speed
}) {

    this.x = x;
    this.y = y;

    this.spawnX = x;
    this.spawnY = y;

    this.color = color;

    this.mode = mode;

    this.radius = 11;

    this.speed = speed;

    this.dirX = 0;
    this.dirY = 0;

    this.changeTimer = 0;

}

update() {

    const targets = [
        player1,
        player2
    ].filter(
        player =>
            player.alive
    );

    if (targets.length === 0) {
        return;
    }

    let target = targets[0];

    if (
        targets.length > 1 &&
        distance(
            this,
            targets[1]
        ) <
        distance(
            this,
            targets[0]
        )
    ) {

        target = targets[1];

    }

    if (this.mode === "random") {

        this.randomBehavior();

    } else if (
        this.mode === "ambush"
    ) {

        this.chase({
            x:
                target.x +
                target.dirX *
                TILE *
                3,

            y:
                target.y +
                target.dirY *
                TILE *
                3
        });

    } else {

        this.chase(target);

    }

    const nextX =
        this.x +
        this.dirX *
        this.speed;

    const nextY =
        this.y +
        this.dirY *
        this.speed;

    if (
        canMove(
            nextX,
            nextY,
            this.radius
        )
    ) {

        this.x = nextX;
        this.y = nextY;

    } else {

        this.chooseDirection();

    }

    this.collideWithPlayers();

}

chase(target) {

    const dx =
        target.x - this.x;

    const dy =
        target.y - this.y;

    let primary;
    let secondary;

    if (
        Math.abs(dx) >
        Math.abs(dy)
    ) {

        primary = {
            x: Math.sign(dx),
            y: 0
        };

        secondary = {
            x: 0,
            y: Math.sign(dy)
        };

    } else {

        primary = {
            x: 0,
            y: Math.sign(dy)
        };

        secondary = {
            x: Math.sign(dx),
            y: 0
        };

    }

    if (
        canDirectionMove(
            this,
            primary
        )
    ) {

        this.dirX = primary.x;
        this.dirY = primary.y;

    } else if (
        canDirectionMove(
            this,
            secondary
        )
    ) {

        this.dirX = secondary.x;
        this.dirY = secondary.y;

    } else {

        this.chooseDirection();

    }

}

randomBehavior() {

    this.changeTimer--;

    if (
        this.changeTimer <= 0 ||
        !canDirectionMove(
            this,
            {
                x: this.dirX,
                y: this.dirY
            }
        )
    ) {

        this.chooseDirection();

    }

}

chooseDirection() {

    const available =
        DIRECTIONS.filter(
            direction =>
                canDirectionMove(
                    this,
                    direction
                )
        );

    if (available.length === 0) {
        return;
    }

    const direction =
        available[
            Math.floor(
                Math.random() *
                available.length
            )
        ];

    this.dirX = direction.x;
    this.dirY = direction.y;

    this.changeTimer =
        35 +
        Math.floor(
            Math.random() * 65
        );

}

collideWithPlayers() {

    const players = [
        player1,
        player2
    ];

    for (const player of players) {

        if (!player.alive) {
            continue;
        }

        if (
            distance(
                this,
                player
            ) <
            this.radius +
            player.radius
        ) {

            if (
                player.powerTimer > 0
            ) {

                player.score += 100;

                createParticles(
                    this.x,
                    this.y,
                    this.color,
                    25
                );

                playTone(
                    220,
                    .1,
                    "sawtooth"
                );

                this.respawn();

            } else {

                hurtPlayer(player);

            }

        }

    }

}

respawn() {

    const openCells = [];

    for (
        let row = 1;
        row < ROWS - 1;
        row++
    ) {

        for (
            let col = 1;
            col < COLS - 1;
            col++
        ) {

            if (
                !isWall(col, row)
            ) {

                openCells.push(
                    cellToPixel(
                        col,
                        row
                    )
                );

            }

        }

    }

    if (openCells.length === 0) {
        return;
    }

    const position =
        openCells[
            Math.floor(
                Math.random() *
                openCells.length
            )
        ];

    this.x = position.x;
    this.y = position.y;

    this.chooseDirection();

}

draw() {

    ctx.save();

    ctx.fillStyle = this.color;

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 13;

    /* CORPO */

    ctx.beginPath();

    ctx.arc(
        this.x,
        this.y,
        this.radius,
        Math.PI,
        0
    );

    ctx.lineTo(
        this.x + this.radius,
        this.y + this.radius
    );

    ctx.lineTo(
        this.x + 5,
        this.y + 7
    );

    ctx.lineTo(
        this.x,
        this.y + this.radius
    );

    ctx.lineTo(
        this.x - 5,
        this.y + 7
    );

    ctx.lineTo(
        this.x - this.radius,
        this.y + this.radius
    );

    ctx.closePath();

    ctx.fill();

    /* OLHOS */

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();

    ctx.arc(
        this.x - 4,
        this.y - 2,
        3,
        0,
        Math.PI * 2
    );

    ctx.arc(
        this.x + 4,
        this.y - 2,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#111827";

    ctx.beginPath();

    ctx.arc(
        this.x - 4 +
        this.dirX * 2,

        this.y - 2 +
        this.dirY * 2,

        1.5,

        0,
        Math.PI * 2
    );

    ctx.arc(
        this.x + 4 +
        this.dirX * 2,

        this.y - 2 +
        this.dirY * 2,

        1.5,

        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

}

}

/* =========================================================
CRIAR INIMIGOS
========================================================= */

function createEnemies() {

enemies = [

    new Enemy({
        x: TILE * 13.5,
        y: TILE * 8.5,
        color: "#ff416c",
        mode: "chase",
        speed: 1.45
    }),

    new Enemy({
        x: TILE * 14.5,
        y: TILE * 8.5,
        color: "#b45cff",
        mode: "ambush",
        speed: 1.35
    }),

    new Enemy({
        x: TILE * 13.5,
        y: TILE * 10.5,
        color: "#35e875",
        mode: "random",
        speed: 1.25
    }),

    new Enemy({
        x: TILE * 14.5,
        y: TILE * 10.5,
        color: "#ff9d1c",
        mode: "chase",
        speed: 1.15
    })

];

enemies.forEach(enemy => {
    enemy.chooseDirection();
});

}

/* =========================================================
DANO AO JOGADOR
========================================================= */

function hurtPlayer(player) {

if (
    player.invincibleTimer > 0
) {
    return;
}

player.lives--;

createParticles(
    player.x,
    player.y,
    player.color,
    25
);

playTone(
    120,
    .15,
    "sawtooth"
);

if (player.lives <= 0) {

    player.alive = false;

    checkGameOver();

} else {

    player.resetPosition();

}

}

/* =========================================================
DESENHAR FUNDO
========================================================= */

function drawBackground() {

const gradient =
    ctx.createLinearGradient(
        0,
        0,
        0,
        HEIGHT
    );

gradient.addColorStop(
    0,
    "#030718"
);

gradient.addColorStop(
    .5,
    "#060b1d"
);

gradient.addColorStop(
    1,
    "#02030a"
);

ctx.fillStyle = gradient;

ctx.fillRect(
    0,
    0,
    WIDTH,
    HEIGHT
);

}

/* =========================================================
DESENHAR LABIRINTO
========================================================= */

function drawMap() {

for (
    let row = 0;
    row < ROWS;
    row++
) {

    for (
        let col = 0;
        col < COLS;
        col++
    ) {

        if (
            !isWall(col, row)
        ) {
            continue;
        }

        const x = col * TILE;
        const y = row * TILE;

        /* PAREDE */

        ctx.fillStyle = "#0a1532";

        ctx.fillRect(
            x,
            y,
            TILE,
            TILE
        );

        /* BORDA */

        ctx.strokeStyle =
            "#1744a3";

        ctx.lineWidth = 1;

        ctx.strokeRect(
            x + .5,
            y + .5,
            TILE - 1,
            TILE - 1
        );

        /* BRILHO INTERNO */

        ctx.fillStyle =
            "rgba(52, 125, 255, .09)";

        ctx.fillRect(
            x + 4,
            y + 4,
            TILE - 8,
            3
        );

    }

}

/* PORTAIS */

portals.forEach(
    (portal, index) => {

        const pulse =
            Math.sin(
                frame * .12 +
                index
            ) * 3;

        ctx.save();

        ctx.strokeStyle =
            "#b45cff";

        ctx.shadowColor =
            "#b45cff";

        ctx.shadowBlur = 20;

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            portal.x,
            portal.y,
            9 + pulse,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.restore();

    }
);

}

/* =========================================================
DESENHAR ITENS
========================================================= */

function drawItems() {

for (const pellet of pellets) {

    if (pellet.collected) {
        continue;
    }

    const pulse =
        Math.sin(
            frame * .12 +
            pellet.phase
        ) * 1.2;

    ctx.fillStyle = "#ffd447";

    ctx.shadowColor = "#ffd447";
    ctx.shadowBlur = 8;

    ctx.beginPath();

    ctx.arc(
        pellet.x,
        pellet.y,
        3.5 + pulse,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;

}

for (const power of powerUps) {

    if (power.collected) {
        continue;
    }

    const pulse =
        Math.sin(
            frame * .1 +
            power.phase
        ) * 2;

    ctx.save();

    ctx.translate(
        power.x,
        power.y
    );

    ctx.rotate(
        frame * .025
    );

    ctx.fillStyle = "#24e6ff";

    ctx.shadowColor = "#24e6ff";
    ctx.shadowBlur = 20;

    ctx.beginPath();

    ctx.moveTo(
        0,
        -11 - pulse
    );

    ctx.lineTo(
        9 + pulse,
        0
    );

    ctx.lineTo(
        0,
        11 + pulse
    );

    ctx.lineTo(
        -9 - pulse,
        0
    );

    ctx.closePath();

    ctx.fill();

    ctx.restore();

}

}

/* =========================================================
HUD
========================================================= */

function updateHUD() {

score1Element.textContent =
    String(
        player1.score
    ).padStart(6, "0");

score2Element.textContent =
    String(
        player2.score
    ).padStart(6, "0");

lives1Element.textContent =
    player1.lives > 0
        ? "♥ ".repeat(player1.lives)
        : "SEM VIDAS";

lives2Element.textContent =
    player2.lives > 0
        ? "♥ ".repeat(player2.lives)
        : "SEM VIDAS";

if (
    player1.powerTimer > 0
) {

    statusElement.textContent =
        "PLAYER 1 ESTÁ PODEROSO!";

} else if (
    player2.powerTimer > 0
) {

    statusElement.textContent =
        "PLAYER 2 ESTÁ PODEROSO!";

} else {

    statusElement.textContent =
        `ITENS RESTANTES: ${remainingItems}`;

}

}

/* =========================================================
VITÓRIA
========================================================= */

function checkVictory() {

if (
    remainingItems > 0
) {
    return;
}

if (gameOver) {
    return;
}

gameOver = true;

let winnerText;

if (
    player1.score >
    player2.score
) {

    winnerText =
        "PLAYER 1 TERMINOU NA FRENTE!";

} else if (
    player2.score >
    player1.score
) {

    winnerText =
        "PLAYER 2 TERMINOU NA FRENTE!";

} else {

    winnerText =
        "OS DOIS TERMINARAM EMPATADOS!";

}

resultIcon.textContent = "🏆";

resultTitle.textContent =
    "FASE CONCLUÍDA!";

resultText.textContent =
    winnerText;

resultButton.textContent =
    "JOGAR NOVAMENTE";

overlay.classList.remove(
    "hidden"
);

playTone(
    800,
    .18,
    "sine"
);

}

/* =========================================================
GAME OVER
========================================================= */

function checkGameOver() {

if (
    player1.alive ||
    player2.alive
) {
    return;
}

gameOver = true;

resultIcon.textContent = "💀";

resultTitle.textContent =
    "GAME OVER";

resultText.textContent =
    "Os dois jogadores perderam todas as vidas.";

resultButton.textContent =
    "TENTAR NOVAMENTE";

overlay.classList.remove(
    "hidden"
);

}

/* =========================================================
SOM
========================================================= */

function playTone(
frequency,
duration,
type = "sine"
) {

try {

    if (!audioContext) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }

    if (
        audioContext.state === "suspended"
    ) {

        audioContext.resume();

    }

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
        frequency,
        audioContext.currentTime
    );

    gain.gain.setValueAtTime(
        .045,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        .001,
        audioContext.currentTime +
        duration
    );

    oscillator.connect(gain);

    gain.connect(
        audioContext.destination
    );

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime +
        duration
    );

} catch (error) {

    /* O áudio é opcional.
       O jogo continua normalmente. */

}

}

/* =========================================================
RESET
========================================================= */

function resetGame() {

gameOver = false;

level = 1;

levelElement.textContent =
    `FASE ${level}`;

particles = [];

player1.score = 0;
player1.lives = 3;
player1.alive = true;
player1.powerTimer = 0;

player2.score = 0;
player2.lives = 3;
player2.alive = true;
player2.powerTimer = 0;

player1.resetPosition();
player2.resetPosition();

buildMap();

createEnemies();

overlay.classList.add(
    "hidden"
);

updateHUD();

}

/* =========================================================
LOOP PRINCIPAL
========================================================= */

function update() {

if (gameOver) {
    return;
}

frame++;

player1.update({

    up: "KeyW",
    down: "KeyS",
    left: "KeyA",
    right: "KeyD"

});

player2.update({

    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight"

});

for (const enemy of enemies) {

    enemy.update();

}

updateParticles();

updateHUD();

checkVictory();

}

function draw() {

drawBackground();

drawMap();

drawItems();

for (const enemy of enemies) {

    enemy.draw();

}

player1.draw();

player2.draw();

drawParticles();

}

function gameLoop() {

update();

draw();

requestAnimationFrame(
    gameLoop
);

}

/* =========================================================
BOTÕES
========================================================= */

restartButton.addEventListener(
"click",
function () {

    resetGame();

}

);

resultButton.addEventListener(
"click",
function () {

    resetGame();

}

);

/* =========================================================
INICIALIZAÇÃO
========================================================= */

buildMap();

createEnemies();

player1.resetPosition();

player2.resetPosition();

updateHUD();

gameLoop();

