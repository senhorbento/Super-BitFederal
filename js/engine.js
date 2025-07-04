import { createSeededRandom, randomBetween } from './utils.js';
import { generateLevelFromSeed, generatePlatformsSeeded, generateCoinsSeeded, generateFinishLineSeeded, generateWalls, generateBackground, generateGround, getJumpImpulse } from './level.js';
import { addPlayerBall, handleJump, ball } from './player.js';
import { jumpSound, coinSound, bgMusic } from './audio.js';

export let engine, world, runner, render, score = 0, canJump = false, levelWidth, viewportWidth, viewportHeight, groundY, backgroundCenter, rand, scaleFactor = 1;
export let platforms = [], coins = [];
export let baseWidth = 1024, baseHeight = 768, groundHeight = 150;

export function updateViewportSize() {
    const container = document.getElementById('game-container');
    const realWidth = container.clientWidth;
    const realHeight = container.clientHeight;
    scaleFactor = Math.min(realWidth / baseWidth, realHeight / baseHeight);
    viewportWidth = baseWidth * scaleFactor;
    viewportHeight = baseHeight * scaleFactor;
    groundY = viewportHeight - groundHeight * scaleFactor;
    backgroundCenter = groundY / 2;
    const canvas = document.getElementById('gameCanvas');
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
}

export function clearLevelBodies(Composite, World) {
    platforms.forEach(p => World.remove(world, p));
    coins.forEach(c => World.remove(world, c));
    platforms.length = 0;
    coins.length = 0;
    const finishLines = Composite.allBodies(world).filter(b => b.label === 'finishLine');
    finishLines.forEach(f => World.remove(world, f));
}

export function startGameWithSeed(seed, Matter) {
    const { rand: seededRand, levelWidth: newLevelWidth } = generateLevelFromSeed(seed, createSeededRandom);
    rand = seededRand;
    levelWidth = newLevelWidth;
    updateViewportSize();
    canJump = false;
    score = 0;
    if (runner) Matter.Runner.stop(runner);
    if (engine) {
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
    }
    if (render) {
        Matter.Render.stop(render);
        render.textures = {};
    }
    engine = Matter.Engine.create();
    world = engine.world;
    const canvas = document.getElementById('gameCanvas');
    render = Matter.Render.create({
        canvas,
        engine,
        options: {
            width: viewportWidth,
            height: viewportHeight,
            wireframes: false,
            pixelRatio: window.devicePixelRatio
        }
    });
    runner = Matter.Runner.create({ delta: 1000 / 30 });
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);
    clearLevelBodies(Matter.Composite, Matter.World);
    generateBackground(viewportWidth, viewportHeight, groundHeight, levelWidth, backgroundCenter, Matter, world);
    generateGround(viewportWidth, groundY, groundHeight, levelWidth, Matter, world);
    const platformCount = Math.floor(levelWidth / 200);
    const coinCount = platformCount * 4;
    generateFinishLineSeeded(rand, scaleFactor, levelWidth, groundY, Matter, world);
    generatePlatformsSeeded(platformCount, rand, scaleFactor, levelWidth, groundY, Matter, platforms, world);
    generateCoinsSeeded(coinCount, rand, scaleFactor, levelWidth, groundY, Matter, coins, world, ball, baseHeight, groundHeight);
    const seedDisplay = document.getElementById('seedDisplay');
    if (seedDisplay) seedDisplay.innerText = seed;
    const levelSize = document.getElementById('levelSize');
    if (levelSize) levelSize.innerText = levelWidth;
    addPlayerBall(scaleFactor, Matter, world);
    generateWalls(levelWidth, innerHeight, groundY, Matter, world, Matter.Bodies);
    document.getElementById('score').innerText = `${score} (${coins.length})`;
    document.getElementById('winText').style.display = 'none';

    Matter.Events.off(engine, 'beforeUpdate');
    Matter.Events.on(engine, 'beforeUpdate', (event) => {
        const forceBase = 0.0050;
        const velocityLimit = 5;
        const deltaTime = event.delta / 1000;
        const force = forceBase * deltaTime * 30;
        if (window.keys['a'] && ball.velocity.x > -velocityLimit) {
            Matter.Body.applyForce(ball, ball.position, { x: -force * scaleFactor, y: 0 });
        }
        if (window.keys['d'] && ball.velocity.x < velocityLimit) {
            Matter.Body.applyForce(ball, ball.position, { x: force * scaleFactor, y: 0 });
        }
        if (window.keys['w'] && canJump) {
            const impulseY = getJumpImpulse(ball, scaleFactor, baseHeight);
            Matter.Body.applyForce(ball, ball.position, { x: 0, y: impulseY });

            jumpSound.currentTime = 0;
            jumpSound.volume = 0.1;
            jumpSound.play();
            canJump = false;
        }
    });

    Matter.Events.off(engine, 'collisionStart');
    Matter.Events.on(engine, 'collisionStart', event => {
        event.pairs.forEach(pair => {
            const [bodyA, bodyB] = [pair.bodyA, pair.bodyB];
            if ((bodyA.label === 'playerBall' && bodyB.label === 'finishLine') ||
                (bodyB.label === 'playerBall' && bodyA.label === 'finishLine')) {
                runner.enabled = false;
                setTimeout(() => {
                    const evt = new Event('gameEnded');
                    window.dispatchEvent(evt);
                }, 100); // Pequeno delay para mostrar mensagem de vitória
            }
            if (bodyA.label === 'playerBall' && bodyB.label === 'coin') {
                collectCoin(bodyB, Matter.World);
            }
            if (bodyB.label === 'playerBall' && bodyA.label === 'coin') {
                collectCoin(bodyA, Matter.World);
            }
        });
    });

    Matter.Events.off(engine, 'collisionActive');
    Matter.Events.on(engine, 'collisionActive', event => {
        event.pairs.forEach(pair => {
            if (isBallOnGroundOrPlatform(pair)) {
                canJump = true;
            }
        });
    });

    Matter.Events.off(engine, 'collisionEnd');
    Matter.Events.on(engine, 'collisionEnd', event => {
        event.pairs.forEach(pair => {
            if (isBallOnGroundOrPlatform(pair)) {
                canJump = false;
            }
        });
    });

    (function followPlayer() {
        requestAnimationFrame(followPlayer);
        const xOffset = Math.min(
            Math.max(ball.position.x - viewportWidth / 2, 0),
            levelWidth - viewportWidth
        );
        Matter.Render.lookAt(render, {
            min: { x: xOffset, y: 0 },
            max: { x: xOffset + viewportWidth, y: viewportHeight }
        });
    })();
}

export function collectCoin(coin, World) {
    const index = coins.indexOf(coin);
    if (index !== -1) {
        World.remove(world, coin);
        coins.splice(index, 1);
        score += 1;
        coinSound.currentTime = 0;
        coinSound.volume = 0.2;
        coinSound.play();
        document.getElementById('score').innerText = `${score} (${coins.length})`;
    }
}

export function isBallOnGroundOrPlatform(pair) {
    const ballBody = pair.bodyA.label === 'playerBall' ? pair.bodyA : pair.bodyB;
    const surfaceBody = pair.bodyA.label === 'playerBall' ? pair.bodyB : pair.bodyA;
    if (!['ground', 'platform'].includes(surfaceBody.label)) return false;
    const ballBottomY = ballBody.bounds.max.y;
    const surfaceTopY = surfaceBody.bounds.min.y;
    const verticalTolerance = 5;
    return ballBottomY <= surfaceTopY + verticalTolerance;
}