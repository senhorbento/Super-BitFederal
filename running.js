let engine, world, ball, score = 0;
let canJump = false;
const coins = [];
const platforms = [];
const levelWidth = 2400;
let viewportWidth = 800;
let viewportHeight = 600;
const groundY = viewportHeight - 135;
const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;
let runner;

document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('gameUI').style.display = 'flex';
  startGame();
});

document.getElementById('restartBtn').addEventListener('click', restartGame);

function restartGame() {
  if (runner) Runner.stop(runner);
  if (engine) {
    World.clear(engine.world, false);
    Engine.clear(engine);
  }

  coins.length = 0;
  platforms.length = 0;

  score = 0;
  document.getElementById('score').innerText = `${score} (${coins.length + 1})`
  document.getElementById('winText').style.display = 'none';
  startGame();
}

function startGame() {
  engine = Engine.create();
  world = engine.world;

  const canvas = document.getElementById('gameCanvas');
  canvas.width = viewportWidth;
  canvas.height = viewportHeight;

  const render = Render.create({
    canvas,
    engine,
    options: {
      width: viewportWidth,
      height: viewportHeight,
      wireframes: false,
      background: 'transparent'
    }
  });

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);

  generateWalls();
  generateFinishLine();
  addPlayerBall();
  generatePlatforms(8);
  generateCoins(Math.random() * 100);
  document.getElementById('score').innerText = `${score} (${coins.length + 1})`

  const keys = {};
  document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

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
      canJump = false;
    }
  });

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

  Events.on(engine, 'collisionActive', event => {
    event.pairs.forEach(pair => {
      if (isBallOnGroundOrPlatform(pair)) {
        canJump = true;
      }
    });
  });

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

isBallOnGroundOrPlatform = (pair) => (
  (pair.bodyA === ball && ['ground', 'platform'].includes(pair.bodyB.label)) ||
  (pair.bodyB === ball && ['ground', 'platform'].includes(pair.bodyA.label))
);


function generateWalls() {
  World.add(world, [
    Bodies.rectangle(-5, 300, 10, 600, { isStatic: true, label: 'leftLimit' }), // esquerda
    Bodies.rectangle(levelWidth + 10, 300, 10, 600, { isStatic: true, label: 'rightLimit' }), // direita
    Bodies.rectangle(0, 0, levelWidth * 2, 10, { isStatic: true, label: 'upperLimit' }), // cima
    Bodies.rectangle(0, groundY, levelWidth * 2, 6, { isStatic: true, label: 'ground' }), //baixo
  ]);
}

function generateFinishLine() {
  const finish = Bodies.rectangle(2300, 200, 40, 200, {
    isStatic: true,
    label: 'finishLine',
    render: {
      sprite: {
        texture: 'img/finish.png',
        xScale: 1,
        yScale: 1
      }
    },
  });
  World.add(world, finish);
}

function addPlayerBall() {
  const x = 10;
  const y = 10;
  const size = 25;
  const imgSize = 400;
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

function generatePlatforms(count) {
  const minSpacingX = 200;
  const maxSpacingX = 300;
  const delta = 40;
  const minY = 100;
  const maxY = groundY - 100;

  let lastX = 0;
  let lastY = maxY;
  for (let i = 0; i < count; i++) {
    const random = Math.random();
    const spacingX = random * (maxSpacingX - minSpacingX) + minSpacingX;
    const x = lastX + spacingX;

    let y = lastY;
    if (Math.random() > 0.5) {
      if (lastY - delta >= minY) {
        y = lastY - delta;
      }
      else {
        y = lastY + delta;
      }
    }
    else {
      if (lastY + delta <= maxY) {
        y = lastY + delta;
      } else {
        y = lastY - delta;
      }
    }
    lastX = x;
    lastY = y;

    const width = 100;
    const height = 40;

    const platform = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      label: 'platform',
      render: {
        sprite: {
          texture: 'img/platform.png',
          xScale: width / 100,
          yScale: 1
        }
      }
    });

    platforms.push(platform);
    Matter.World.add(world, platform);
  }
}

function generateCoins(count) {
  const maxAttempts = 50;
  const coinSize = 20;
  const minCoinYAboveGround = 30;
  const exclusionMargin = 5;

  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.random() * (levelWidth - 50) + 25;
      const y = Math.random() * (groundY - coinSize - minCoinYAboveGround - 50) + 50;

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
        break;
      }
    }
  }
}

function collectCoin(coin) {
  const index = coins.indexOf(coin);
  if (index !== -1) {
    World.remove(world, coin);
    coins.splice(index, 1);
    score += 1;
    document.getElementById('score').innerText = `${score} (${coins.length + 1})`;
  }
}
