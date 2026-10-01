const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


/* =====================================================
   ELEMENTOS DA INTERFACE
===================================================== */

const score1 =
    document.getElementById("score1");

const score2 =
    document.getElementById("score2");

const lives1 =
    document.getElementById("lives1");

const lives2 =
    document.getElementById("lives2");

const statusText =
    document.getElementById("status");

const levelText =
    document.getElementById("level");

const restartButton =
    document.getElementById("restartButton");

const message =
    document.getElementById("message");

const messageIcon =
    document.getElementById("messageIcon");

const messageTitle =
    document.getElementById("messageTitle");

const messageText =
    document.getElementById("messageText");

const messageButton =
    document.getElementById("messageButton");


/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const TILE = 32;

const COLS = 30;

const ROWS = 20;

const WIDTH = COLS * TILE;

const HEIGHT = ROWS * TILE;

canvas.width = WIDTH;

canvas.height = HEIGHT;


/* =====================================================
   MAPA

   # = parede
   . = orb
   o = power-up
   P = portal
   espaço = caminho
===================================================== */

const mapTemplate = [

"##############################",
"#............##..............#",
"#.####.#####.##.#####.####...#",
"#o####.#####.##.#####.####.o.#",
"#............................#",
"#.####.##.##########.##.####.#",
"#......##....####....##......#",
"######.#####.####.#####.######",
"#............P..P............#",
"#.####.#####......#####.####.#",
"#......#..............#......#",
"####.###.####.##.####.###.###",
"#...........#....#...........#",
"#.#####.###.#.##.#.###.#####.#",
"#o....#.....#....#.....#....o#",
"#####.#.###.######.###.#.#####",
"#............................#",
"#.####.#####.####.#####.####.#",
"#............................#",
"##############################"

];


/* =====================================================
   ESTADO
===================================================== */

let map = [];

let orbs = [];

let powerUps = [];

let portals = [];

let particles = [];

let enemies = [];

let gameRunning = true;

let level = 1;

let totalOrbs = 0;

let remainingOrbs = 0;

let gameTime = 0;


/* =====================================================
   TECLAS
===================================================== */

const keys = {};

window.addEventListener("keydown", event => {

    keys[event.code] = true;

    if (
        [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Space"
        ].includes(event.code)
    ) {

        event.preventDefault();

    }

});

window.addEventListener("keyup", event => {

    keys[event.code] = false;

});


/* =====================================================
   UTILITÁRIOS
===================================================== */

function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );

}

function random(min, max) {

    return Math.random() *
        (max - min) +
        min;

}

function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );

}

function cellCenter(col, row) {

    return {

        x: col * TILE + TILE / 2,

        y: row * TILE + TILE / 2

    };

}


/* =====================================================
   CONSTRUIR MAPA
===================================================== */

function buildMap() {

    map = [];

    orbs = [];

    powerUps = [];

    portals = [];

    for (let row = 0; row < ROWS; row++) {

        const line =
            mapTemplate[row]
                .padEnd(COLS, "#");

        map[row] = [];

        for (
            let col = 0;
            col < COLS;
            col++
        ) {

            const char =
                line[col];

            map[row][col] =
                char === "#"
                    ? "#"
                    : " ";

            const position =
                cellCenter(col, row);


            if (char === ".") {

                orbs.push({

                    x: position.x,

                    y: position.y,

                    radius: 4,

                    collected: false,

                    pulse: random(0, 6)

                });

            }


            if (char === "o") {

                powerUps.push({

                    x: position.x,

                    y: position.y,

                    radius: 10,

                    collected: false,

                    pulse: random(0, 6)

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

    totalOrbs =
        orbs.length +
        powerUps.length;

    remainingOrbs =
        totalOrbs;

}


/* =====================================================
   VERIFICAR PAREDE
===================================================== */

function isWall(col, row) {

    if (
        row < 0 ||
        row >= ROWS ||
        col < 0 ||
        col >= COLS
    ) {

        return true;

    }

    return map[row][col] === "#";

}


/* =====================================================
   COLISÃO COM MAPA
===================================================== */

function canMove(x, y, radius) {

    const points = [

        {
            x: x - radius,
            y: y - radius
        },

        {
            x: x + radius,
            y: y - radius
        },

        {
            x: x - radius,
            y: y + radius
        },

        {
            x: x + radius,
            y: y + radius
        }

    ];

    for (const point of points) {

        const col =
            Math.floor(
                point.x / TILE
            );

        const row =
            Math.floor(
                point.y / TILE
            );

        if (
            isWall(col, row)
        ) {

            return false;

        }

    }

    return true;

}


/* =====================================================
   PARTÍCULAS
===================================================== */

function spawnParticles(
    x,
    y,
    color,
    amount = 12
) {

    for (
        let i = 0;
        i < amount;
        i++
    ) {

        particles.push({

            x,

            y,

            vx: random(-3, 3),

            vy: random(-3, 3),

            size: random(2, 5),

            life: random(20, 45),

            color

        });

    }

}

function updateParticles() {

    particles.forEach(p => {

        p.x += p.vx;

        p.y += p.vy;

        p.vx *= .97;

        p.vy *= .97;

        p.life--;

    });

    particles =
        particles.filter(
            p => p.life > 0
        );

}

function drawParticles() {

    particles.forEach(p => {

        ctx.globalAlpha =
            p.life / 45;

        ctx.fillStyle =
            p.color;

        ctx.fillRect(
            p.x,
            p.y,
            p.size,
            p.size
        );

    });

    ctx.globalAlpha = 1;

}


/* =====================================================
   PLAYER
===================================================== */

class Player {

    constructor(options) {

        this.name =
            options.name;

        this.color =
            options.color;

        this.x =
            options.x;

        this.y =
            options.y;

        this.spawnX =
            options.x;

        this.spawnY =
            options.y;

        this.radius = 11;

        this.speed = 2.8;

        this.dirX = 0;

        this.dirY = 0;

        this.nextX = 0;

        this.nextY = 0;

        this.score = 0;

        this.lives = 3;

        this.powerTimer = 0;

        this.invincible = 0;

        this.alive = true;

    }


    resetPosition() {

        this.x =
            this.spawnX;

        this.y =
            this.spawnY;

        this.dirX = 0;

        this.dirY = 0;

        this.nextX = 0;

        this.nextY = 0;

        this.invincible = 90;

    }


    update(control) {

        if (!this.alive) {

            return;

        }


        /* =========================
           CONTROLES
        ========================= */

        if (keys[control.up]) {

            this.nextX = 0;

            this.nextY = -1;

        }

        if (keys[control.down]) {

            this.nextX = 0;

            this.nextY = 1;

        }

        if (keys[control.left]) {

            this.nextX = -1;

            this.nextY = 0;

        }

        if (keys[control.right]) {

            this.nextX = 1;

            this.nextY = 0;

        }


        /* =========================
           NOVA DIREÇÃO
        ========================= */

        const nextX =
            this.x +
            this.nextX *
            this.speed;

        const nextY =
            this.y +
            this.nextY *
            this.speed;

        if (
            canMove(
                nextX,
                nextY,
                this.radius
            )
        ) {

            this.dirX =
                this.nextX;

            this.dirY =
                this.nextY;

        }


        /* =========================
           MOVIMENTO
        ========================= */

        const moveX =
            this.x +
            this.dirX *
            this.speed;

        const moveY =
            this.y +
            this.dirY *
            this.speed;

        if (
            canMove(
                moveX,
                moveY,
                this.radius
            )
        ) {

            this.x = moveX;

            this.y = moveY;

        }


        /* =========================
           POWER-UP
        ========================= */

        if (
            this.powerTimer > 0
        ) {

            this.powerTimer--;

        }

        if (
            this.invincible > 0
        ) {

            this.invincible--;

        }


        collectItems(this);

        usePortal(this);

    }


    collectItems(player) {

        /* ORBS */

        orbs.forEach(orb => {

            if (
                orb.collected
            ) {

                return;

            }

            if (
                Math.hypot(
                    player.x - orb.x,
                    player.y - orb.y
                ) < 15
            ) {

                orb.collected = true;

                player.score += 10;

                remainingOrbs--;

                spawnParticles(
                    orb.x,
                    orb.y,
                    "#ffd43b",
                    7
                );

                playSound(
                    600,
                    .04,
                    "square"
                );

            }

        });


        /* POWER */

        powerUps.forEach(power => {

            if (
                power.collected
            ) {

                return;

            }

            if (
                Math.hypot(
                    player.x - power.x,
                    player.y - power.y
                ) < 18
            ) {

                power.collected = true;

                player.score += 50;

                player.powerTimer =
                    60 * 8;

                remainingOrbs--;

                spawnParticles(
                    power.x,
                    power.y,
                    "#29e7ff",
                    25
                );

                playSound(
                    900,
                    .1,
                    "sine"
                );

            }

        });

    }


    draw() {

        if (!this.alive) {

            return;

        }

        ctx.save();

        /* POWER EFFECT */

        if (
            this.powerTimer > 0
        ) {

            ctx.shadowColor =
                "#29e7ff";

            ctx.shadowBlur = 20;

            ctx.strokeStyle =
                "#29e7ff";

            ctx.lineWidth = 3;

            ctx.beginPath();

            ctx.arc(
                this.x,
                this.y,
                17 +
                    Math.sin(
                        gameTime * .2
                    ) * 2,
                0,
                Math.PI * 2
            );

            ctx.stroke();

        }


        /* INVENCIBILIDADE */

        if (
            this.invincible > 0 &&
            Math.floor(
                this.invincible / 5
            ) % 2 === 0
        ) {

            ctx.globalAlpha = .45;

        }


        /* CABEÇA */

        ctx.fillStyle =
            this.color;

        ctx.shadowColor =
            this.color;

        ctx.shadowBlur = 12;

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

        ctx.fillStyle =
            "#ffffff";

        ctx.beginPath();

        ctx.arc(
            this.x +
                this.dirX * 5,
            this.y +
                this.dirY * 5,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();

    }

}


/* =====================================================
   INIMIGO
===================================================== */

class Enemy {

    constructor(options) {

        this.x =
            options.x;

        this.y =
            options.y;

        this.color =
            options.color;

        this.type =
            options.type;

        this.radius = 12;

        this.speed =
            options.speed || 1.7;

        this.dirX = 0;

        this.dirY = 0;

        this.changeTimer = 0;

    }


    update() {

        const targets = [
            player1,
            player2
        ].filter(
            p => p.alive
        );


        if (
            targets.length === 0
        ) {

            return;

        }


        let target =
            targets[0];

        if (
            distance(
                this,
                targets[1]
            ) <
            distance(
                this,
                targets[0]
            )
        ) {

            target =
                targets[1];

        }


        /* INIMIGO VERMELHO */

        if (
            this.type === "hunter"
        ) {

            this.chase(
                target
            );

        }


        /* INIMIGO ROXO */

        else if (
            this.type === "ambush"
        ) {

            const predicted = {

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

            };

            this.chase(
                predicted
            );

        }


        /* INIMIGO VERDE */

        else {

            this.randomMove();

        }


        const newX =
            this.x +
            this.dirX *
            this.speed;

        const newY =
            this.y +
            this.dirY *
            this.speed;


        if (
            canMove(
                newX,
                newY,
                this.radius
            )
        ) {

            this.x = newX;

            this.y = newY;

        } else {

            this.changeDirection();

        }


        this.checkPlayerCollision();

    }


    chase(target) {

        const dx =
            target.x -
            this.x;

        const dy =
            target.y -
            this.y;


        if (
            Math.abs(dx) >
            Math.abs(dy)
        ) {

            this.dirX =
                Math.sign(dx);

            this.dirY = 0;

        } else {

            this.dirX = 0;

            this.dirY =
                Math.sign(dy);

        }


        /* TENTAR MOVIMENTO ALTERNATIVO */

        if (
            !canMove(
                this.x +
                    this.dirX *
                    this.speed,
                this.y +
                    this.dirY *
                    this.speed,
                this.radius
            )
        ) {

            if (
                Math.abs(dx) >
                Math.abs(dy)
            ) {

                this.dirX = 0;

                this.dirY =
                    Math.sign(dy);

            } else {

                this.dirX =
                    Math.sign(dx);

                this.dirY = 0;

            }

        }

    }


    randomMove() {

        this.changeTimer--;

        if (
            this.changeTimer <= 0
        ) {

            this.changeDirection();

        }

    }


    changeDirection() {

        const directions = [

            {
                x: 1,
                y: 0
            },

            {
                x: -1,
                y: 0
            },

            {
                x: 0,
                y: 1
            },

            {
                x: 0,
                y: -1
            }

        ];

        const possible =
            directions.filter(
                direction =>
                    canMove(
                        this.x +
                            direction.x *
                            TILE / 2,
                        this.y +
                            direction.y *
                            TILE / 2,
                        this.radius
                    )
            );


        if (
            possible.length
        ) {

            const direction =
                possible[
                    Math.floor(
                        Math.random() *
                        possible.length
                    )
                ];

            this.dirX =
                direction.x;

            this.dirY =
                direction.y;

        }

        this.changeTimer =
            Math.floor(
                random(30, 90)
            );

    }


    checkPlayerCollision() {

        const players = [
            player1,
            player2
        ];

        players.forEach(player => {

            if (
                !player.alive
            ) {

                return;

            }

            const d =
                distance(
                    this,
                    player
                );


            if (
                d <
                this.radius +
                player.radius
            ) {

                if (
                    player.powerTimer >
                    0
                ) {

                    player.score += 100;

                    spawnParticles(
                        this.x,
                        this.y,
                        this.color,
                        25
                    );

                    playSound(
                        250,
                        .12,
                        "sawtooth"
                    );

                    this.respawn();

                } else {

                    damagePlayer(
                        player
                    );

                }

            }

        });

    }


    respawn() {

        const freeCells = [];

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
                    !isWall(
                        col,
                        row
                    )
                ) {

                    freeCells.push(
                        cellCenter(
                            col,
                            row
                        )
                    );

                }

            }

        }

        const position =
            freeCells[
                Math.floor(
                    Math.random() *
                    freeCells.length
                )
            ];

        this.x =
            position.x;

        this.y =
            position.y;

    }


    draw() {

        ctx.save();

        ctx.shadowColor =
            this.color;

        ctx.shadowBlur = 15;

        ctx.fillStyle =
            this.color;


        /* CABEÇA */

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.radius,
            Math.PI,
            0
        );

        ctx.lineTo(
            this.x +
                this.radius,
            this.y +
                this.radius
        );

        ctx.lineTo(
            this.x +
                5,
            this.y +
                7
        );

        ctx.lineTo(
            this.x,
            this.y +
                this.radius
        );

        ctx.lineTo(
            this.x -
                5,
            this.y +
                7
        );

        ctx.lineTo(
            this.x -
                this.radius,
            this.y +
                this.radius
        );

        ctx.closePath();

        ctx.fill();


        /* OLHOS */

        ctx.shadowBlur = 0;

        ctx.fillStyle =
            "#ffffff";

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


        ctx.fillStyle =
            "#111";

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


/* =====================================================
   CRIAR PLAYERS
===================================================== */

const player1 =
    new Player({

        name: "PLAYER 1",

        color: "#ff3b5f",

        x: TILE * 2.5,

        y: TILE * 4.5

    });


const player2 =
    new Player({

        name: "PLAYER 2",

        color: "#3b8cff",

        x: TILE * 27.5,

        y: TILE * 4.5

    });


/* =====================================================
   INIMIGOS
===================================================== */

function createEnemies() {

    enemies = [

        new Enemy({

            x: TILE * 14.5,

            y: TILE * 8.5,

            color: "#ff416c",

            type: "hunter",

            speed: 1.65

        }),

        new Enemy({

            x: TILE * 15.5,

            y: TILE * 8.5,

            color: "#b34dff",

            type: "ambush",

            speed: 1.55

        }),

        new Enemy({

            x: TILE * 14.5,

            y: TILE * 10.5,

            color: "#39e66d",

            type: "random",

            speed: 1.45

        }),

        new Enemy({

            x: TILE * 15.5,

            y: TILE * 10.5,

            color: "#ff9f1c",

            type: "hunter",

            speed: 1.35

        })

    ];

}


/* =====================================================
   DANO AO PLAYER
===================================================== */

function damagePlayer(player) {

    if (
        player.invincible > 0
    ) {

        return;

    }

    player.lives--;

    spawnParticles(
        player.x,
        player.y,
        player.color,
        25
    );

    playSound(
        100,
        .2,
        "sawtooth"
    );


    if (
        player.lives <= 0
    ) {

        player.alive = false;

        checkGameOver();

        return;

    }


    player.resetPosition();

}


/* =====================================================
   PORTAIS
===================================================== */

function usePortal(player) {

    if (
        portals.length < 2
    ) {

        return;

    }


    portals.forEach((portal, index) => {

        const d =
            Math.hypot(
                player.x - portal.x,
                player.y - portal.y
            );

        if (
            d < 15
        ) {

            const destination =
                portals[
                    index === 0
                        ? 1
                        : 0
                ];

            if (
                Math.hypot(
                    player.x -
                        destination.x,
                    player.y -
                        destination.y
                ) < 10
            ) {

                return;

            }

            player.x =
                destination.x;

            player.y =
                destination.y;

            player.score += 5;

            spawnParticles(
                player.x,
                player.y,
                "#a855ff",
                20
            );

        }

    });

}


/* =====================================================
   DESENHAR FUNDO
===================================================== */

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
        "#050817"
    );

    gradient.addColorStop(
        1,
        "#02030a"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

}


/* =====================================================
   DESENHAR MAPA
===================================================== */

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
                isWall(col, row)
            ) {

                const x =
                    col * TILE;

                const y =
                    row * TILE;


                /* PAREDE */

                ctx.fillStyle =
                    "#0d1735";

                ctx.fillRect(
                    x,
                    y,
                    TILE,
                    TILE
                );


                /* BORDA */

                ctx.strokeStyle =
                    "#1d49a8";

                ctx.lineWidth = 1;

                ctx.strokeRect(
                    x + 1,
                    y + 1,
                    TILE - 2,
                    TILE - 2
                );


                /* DETALHE */

                ctx.fillStyle =
                    "rgba(60,130,255,.08)";

                ctx.fillRect(
                    x + 5,
                    y + 5,
                    TILE - 10,
                    3
                );

            }

        }

    }


    /* PORTAIS */

    portals.forEach(
        (portal, index) => {

            const pulse =
                Math.sin(
                    gameTime * .12 +
                    index
                ) * 3;


            ctx.save();

            ctx.shadowColor =
                "#a855ff";

            ctx.shadowBlur = 20;

            ctx.strokeStyle =
                "#a855ff";

            ctx.lineWidth = 3;

            ctx.beginPath();

            ctx.arc(
                portal.x,
                portal.y,
                10 + pulse,
                0,
                Math.PI * 2
            );

            ctx.stroke();

            ctx.restore();

        }
    );

}


/* =====================================================
   DESENHAR ORBS
===================================================== */

function drawOrbs() {

    orbs.forEach(orb => {

        if (
            orb.collected
        ) {

            return;

        }

        const pulse =
            Math.sin(
                gameTime * .12 +
                orb.pulse
            ) * 1.5;


        ctx.fillStyle =
            "#ffd43b";

        ctx.shadowColor =
            "#ffd43b";

        ctx.shadowBlur = 10;

        ctx.beginPath();

        ctx.arc(
            orb.x,
            orb.y,
            orb.radius +
                pulse,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.shadowBlur = 0;

    });


    powerUps.forEach(power => {

        if (
            power.collected
        ) {

            return;

        }

        const pulse =
            Math.sin(
                gameTime * .1 +
                power.pulse
            ) * 3;


        ctx.save();

        ctx.translate(
            power.x,
            power.y
        );

        ctx.rotate(
            gameTime * .03
        );

        ctx.shadowColor =
            "#29e7ff";

        ctx.shadowBlur = 20;

        ctx.fillStyle =
            "#29e7ff";

        ctx.beginPath();

        ctx.moveTo(
            0,
            -12 - pulse
        );

        ctx.lineTo(
            10 + pulse,
            0
        );

        ctx.lineTo(
            0,
            12 + pulse
        );

        ctx.lineTo(
            -10 - pulse,
            0
        );

        ctx.closePath();

        ctx.fill();

        ctx.restore();

    });

}


/* =====================================================
   HUD
===================================================== */

function updateHUD() {

    score1.textContent =
        String(
            player1.score
        ).padStart(
            6,
            "0"
        );

    score2.textContent =
        String(
            player2.score
        ).padStart(
            6,
            "0"
        );


    lives1.textContent =
        "❤️ ".repeat(
            Math.max(
                player1.lives,
                0
            )
        );


    lives2.textContent =
        "❤️ ".repeat(
            Math.max(
                player2.lives,
                0
            )
        );


    if (
        player1.powerTimer > 0
    ) {

        statusText.textContent =
            "PLAYER 1: PODER ATIVO!";

    }

    else if (
        player2.powerTimer > 0
    ) {

        statusText.textContent =
            "PLAYER 2: PODER ATIVO!";

    }

    else {

        statusText.textContent =
            `ORBES RESTANTES: ${remainingOrbs}`;

    }

}


/* =====================================================
   VERIFICAR VITÓRIA
===================================================== */

function checkVictory() {

    if (
        remainingOrbs > 0
    ) {

        return false;

    }

    gameRunning = false;

    messageIcon.textContent =
        "🏆";

    messageTitle.textContent =
        "FASE CONCLUÍDA!";

    const winner =
        player1.score >
        player2.score
            ? "PLAYER 1"
            : player2.score >
              player1.score
                ? "PLAYER 2"
                : "EMPATE";

    messageText.textContent =
        `${winner} terminou com mais pontos!`;

    messageButton.textContent =
        "PRÓXIMA FASE";

    message.classList.remove(
        "hidden"
    );

    playSound(
        800,
        .15,
        "sine"
    );

    return true;

}


/* =====================================================
   GAME OVER
===================================================== */

function checkGameOver() {

    if (
        player1.alive ||
        player2.alive
    ) {

        return;

    }

    gameRunning = false;

    messageIcon.textContent =
        "💀";

    messageTitle.textContent =
        "GAME OVER";

    messageText.textContent =
        "Os dois jogadores foram derrotados.";

    messageButton.textContent =
        "TENTAR NOVAMENTE";

    message.classList.remove(
        "hidden"
    );

}


/* =====================================================
   ATUALIZAÇÃO
===================================================== */

function update() {

    gameTime++;

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


    enemies.forEach(
        enemy =>
            enemy.update()
    );


    updateParticles();

    updateHUD();

    checkVictory();

}


/* =====================================================
   DESENHAR
===================================================== */

function draw() {

    drawBackground();

    drawMap();

    drawOrbs();

    enemies.forEach(
        enemy =>
            enemy.draw()
    );

    player1.draw();

    player2.draw();

    drawParticles();

}


/* =====================================================
   LOOP
===================================================== */

function gameLoop() {

    if (
        gameRunning
    ) {

        update();

    }

    draw();

    requestAnimationFrame(
        gameLoop
    );

}


/* =====================================================
   SOM
===================================================== */

let audioContext = null;

function playSound(
    frequency,
    duration,
    type
) {

    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();

        }


        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();


        oscillator.type =
            type;

        oscillator.frequency.value =
            frequency;


        gain.gain.setValueAtTime(
            .06,
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

        /* O jogo continua funcionando
           mesmo se o navegador bloquear áudio. */

    }

}


/* =====================================================
   REINICIAR
===================================================== */

function restartGame() {

    player1.score = 0;

    player2.score = 0;

    player1.lives = 3;

    player2.lives = 3;

    player1.alive = true;

    player2.alive = true;

    player1.powerTimer = 0;

    player2.powerTimer = 0;

    player1.resetPosition();

    player2.resetPosition();

    particles = [];

    buildMap();

    createEnemies();

    gameRunning = true;

    message.classList.add(
        "hidden"
    );

    statusText.textContent =
        "COLETE TODOS OS ORBES!";

}


/* =====================================================
   BOTÕES
===================================================== */

restartButton.addEventListener(
    "click",
    restartGame
);


messageButton.addEventListener(
    "click",
    () => {

        if (
            remainingOrbs === 0
        ) {

            level++;

            levelText.textContent =
                `FASE ${level}`;

        }

        restartGame();

    }
);


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

buildMap();

createEnemies();

player1.resetPosition();

player2.resetPosition();

gameLoop();
