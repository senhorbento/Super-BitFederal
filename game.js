let engine, world, runner, render, ball, score = 0;
let canJump = false;
let viewportWidth = 800;
let viewportHeight = 600;
let levelWidth = 2400;
const coins = [];
const platforms = [];
const groundY = viewportHeight - 135;
const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

const bgMusic = new Audio('audio/bolsonaro-e-norte-bolsonaro-e-nordeste.mp3');
const jumpSound = new Audio('audio/jump.mp3');
const coinSound = new Audio('audio/fazol.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.01;
bgMusic.play();

const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function clearLevelBodies() {
  platforms.forEach(p => World.remove(world, p));
  coins.forEach(c => World.remove(world, c));
  platforms.length = 0;
  coins.length = 0;

  const finishLines = Composite.allBodies(world).filter(b => b.label === 'finishLine');
  finishLines.forEach(f => World.remove(world, f));
}

document.getElementById('startBtn').addEventListener('click', () => {
  bgMusic.play()
  document.getElementById('menu').style.display = 'none';
  document.getElementById('gameUI').style.display = 'flex';
  startGameWithSeed(123456);
});

document.getElementById('restartBtn').addEventListener('click', restartGame);

function restartGame() {
  startGameWithSeed(Date.now());
}

function createSeededRandom(seed) {
  let s = seed;
  return function () {
    s = Math.imul(16807, s) % 2147483647;
    return (s & 0x7fffffff) / 2147483647;
  };
}

function randomBetween(rand, min, max) {
  return Math.floor(rand() * (max - min + 1) + min);
}

function generateLevelFromSeed(seedValue) {
  const rand = createSeededRandom(seedValue);
  levelWidth = randomBetween(rand, 1000, 5000);
  const platformCount = Math.floor(levelWidth / 200);
  const coinCount = platformCount * 4;

  generatePlatformsSeeded(platformCount, rand);
  generateFinishLineSeeded(rand);
  generateCoinsSeeded(coinCount, rand);

  const seedDisplay = document.getElementById('seedDisplay');
  if (seedDisplay) seedDisplay.innerText = seedValue;
  const levelSize = document.getElementById('levelSize');
  if (levelSize) levelSize.innerText = levelWidth;
}

function generatePlatformsSeeded(count, rand) {
  platforms.length = 0;

  const width = 100;
  const height = 40;
  const minSpacingX = 200;
  const maxSpacingX = 300;
  const delta = 40;
  const minY = 100;
  const maxY = groundY - 100;

  let lastX = 0;
  let lastY = maxY;

  for (let i = 0; i < count; i++) {
    const spacingX = rand() * (maxSpacingX - minSpacingX) + minSpacingX;
    const x = lastX + spacingX;

    let y = lastY;
    if (rand() > 0.5) {
      y = lastY - delta;
      if (y < minY) y = lastY + delta;
    } else {
      y = lastY + delta;
      if (y > maxY) y = lastY - delta;
    }

    lastX = x;
    lastY = y;

    const platform = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      label: 'platform',
      render: {
        sprite: {
          texture: 'img/platform_favela.png',
          xScale: width / 100,
          yScale: 1
        }
      }
    });

    platforms.push(platform);
    Matter.World.add(world, platform);
  }
}

function generateCoinsSeeded(count, rand) {
  coins.length = 0;

  const coinSize = 20;
  const exclusionMargin = 5;
  const minCoinYAboveGround = 30;

  for (let i = 0; i < count; i++) {
    let placed = false;

    for (let attempt = 0; attempt < 50; attempt++) {
      const x = rand() * (levelWidth - 50) + 25;
      const y = rand() * (groundY - coinSize - minCoinYAboveGround - 50) + 50;

      const coinBounds = {
        min: { x: x - coinSize, y: y - coinSize },
        max: { x: x + coinSize, y: y + coinSize }
      };

      const bodiesInRegion = Matter.Query.region(Composite.allBodies(world), {
        min: {
          x: coinBounds.min.x - exclusionMargin,
          y: coinBounds.min.y - exclusionMargin
        },
        max: {
          x: coinBounds.max.x + exclusionMargin,
          y: coinBounds.max.y + exclusionMargin
        }
      });

      const collides = bodiesInRegion.some(body =>
        body.label !== 'ground' && body !== ball
      );

      if (!collides) {
        const size = 20;
        const imgSize = 200;
        const coin = Matter.Bodies.circle(x, y, size, {
          isStatic: true,
          isSensor: true,
          label: 'coin',
          collisionFilter: {
            category: 0x0002
          },
          render: {
            sprite: {
              texture: 'img/coin.png',
              xScale: size * 2 / imgSize,
              yScale: size * 2 / imgSize
            }
          }
        });
        coins.push(coin);
        Matter.World.add(world, coin);
        placed = true;
        break;
      }
    }
  }
}

function generateFinishLineSeeded(rand) {
  const height = Math.floor(rand() * 100 + 100); // 100-200
  const width = 40;
  const x = levelWidth - 100;
  const y = Math.floor(rand() * (groundY - height - 100) + 100);

  const finish = Matter.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    label: 'finishLine',
    render: {
      sprite: {
        texture: 'img/finish.png',
        xScale: 1,
        yScale: height / 200
      }
    }
  });

  Matter.World.add(world, finish);
}

function generateWalls() {
  World.add(world, [
    Bodies.rectangle(-5, 300, 10, 600, { isStatic: true, label: 'leftLimit' }),
    Bodies.rectangle(levelWidth + 10, 300, 10, 600, { isStatic: true, label: 'rightLimit' }),
    Bodies.rectangle(0, 0, levelWidth * 2, 10, { isStatic: true, label: 'upperLimit' }),
    Bodies.rectangle(0, groundY, levelWidth * 2, 6, { isStatic: true, label: 'ground' })
  ]);
}

function addPlayerBall() {
  const x = 10;
  const y = 10;
  const size = 25;
  const imgSize = 800;
  ball = Matter.Bodies.circle(x, y, size, {
    restitution: 0.2,
    friction: 0.05,
    frictionAir: 0.02,
    frictionStatic: 0.5,
    wireframes: true,
    label: 'playerBall',
    render: {
      sprite: {
        texture: 'img/ball.png',
        xScale: size * 2 / imgSize,
        yScale: size * 2 / imgSize
      }
    }
  });
  Matter.World.add(world, ball);
}

function collectCoin(coin) {
  const index = coins.indexOf(coin);
  if (index !== -1) {
    World.remove(world, coin);
    coins.splice(index, 1);
    score += 1;
    coinSound.currentTime = 0;
    coinSound.volume = 0.2;
    coinSound.play();
    document.getElementById('score').innerText = `${score} (${coins.length + 1})`;
  }
}

function isBallOnGroundOrPlatform(pair) {
  return (
    (pair.bodyA === ball && ['ground', 'platform'].includes(pair.bodyB.label)) ||
    (pair.bodyB === ball && ['ground', 'platform'].includes(pair.bodyA.label))
  );
}

function startGameWithSeed(seed) {
  canJump = false;
  score = 0;
  if (runner) Runner.stop(runner);
  if (engine) {
    World.clear(engine.world, false);
    Engine.clear(engine);
  }
  if (render) {
    Render.stop(render);
    render.textures = {};
  }

  engine = Engine.create();
  world = engine.world;

  const canvas = document.getElementById('gameCanvas');
  canvas.width = viewportWidth;
  canvas.height = viewportHeight;

  render = Render.create({
    canvas,
    engine,
    options: {
      width: viewportWidth,
      height: viewportHeight,
      wireframes: false,
      background: 'transparent'
    }
  });

  runner = Runner.create();
  Runner.run(runner, engine);
  Render.run(render);


  clearLevelBodies();
  generateLevelFromSeed(seed);

  addPlayerBall();
  generateWalls();
  document.getElementById('score').innerText = `${score} (${coins.length + 1})`;
  document.getElementById('winText').style.display = 'none';

  Events.off(engine, 'beforeUpdate');
  Events.on(engine, 'beforeUpdate', () => {
    const force = 0.0015;
    const velocityLimit = 5;

    if (keys['a'] && ball.velocity.x > -velocityLimit) {
      Body.applyForce(ball, ball.position, { x: -force, y: 0 });
    }
    if (keys['d'] && ball.velocity.x < velocityLimit) {
      Body.applyForce(ball, ball.position, { x: force, y: 0 });
    }

    if (keys['w'] && canJump) {
      Body.applyForce(ball, ball.position, { x: 0, y: -0.1 });
      jumpSound.currentTime = 0;
      jumpSound.volume = 0.1;
      jumpSound.play();
      canJump = false;
    }
  });

  Events.off(engine, 'collisionStart');
  Events.on(engine, 'collisionStart', event => {
    event.pairs.forEach(pair => {
      const [bodyA, bodyB] = [pair.bodyA, pair.bodyB];

      if ((bodyA.label === 'playerBall' && bodyB.label === 'finishLine') ||
        (bodyB.label === 'playerBall' && bodyA.label === 'finishLine')) {
        document.getElementById('winText').style.display = 'flex';
        runner.enabled = false;
      }
      if (bodyA.label === 'playerBall' && bodyB.label === 'coin') {
        collectCoin(bodyB);
      }
      if (bodyB.label === 'playerBall' && bodyA.label === 'coin') {
        collectCoin(bodyA);
      }
    });
  });

  Events.off(engine, 'collisionActive');
  Events.on(engine, 'collisionActive', event => {
    event.pairs.forEach(pair => {
      if (isBallOnGroundOrPlatform(pair)) {
        canJump = true;
      }
    });
  });

  Events.off(engine, 'collisionEnd');
  Events.on(engine, 'collisionEnd', event => {
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

    Render.lookAt(render, {
      min: { x: xOffset, y: 0 },
      max: { x: xOffset + viewportWidth, y: viewportHeight }
    });
  })();
}