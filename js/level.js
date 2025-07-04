import { randomBetween } from './utils.js';

export function generateLevelFromSeed(seedValue, createSeededRandom) {
    const rand = createSeededRandom(seedValue);
    const levelWidth = randomBetween(rand, 1000, 5000);
    return { rand, levelWidth };
}

export function generatePlatformsSeeded(count, rand, scaleFactor, levelWidth, groundY, Matter, platforms, world) {
    platforms.length = 0;
    const width = 100 * scaleFactor;
    const height = 40 * scaleFactor;
    const minSpacingX = 200 * scaleFactor;
    const maxSpacingX = 300 * scaleFactor;
    const delta = 100 * scaleFactor;
    const minY = 100;
    const maxY = groundY - 100;
    const finishX = levelWidth - 100;
    let lastX = 0;
    let lastY = maxY;
    for (let i = 0; i < count; i++) {
        const spacingX = rand() * (maxSpacingX - minSpacingX) + minSpacingX;
        const x = lastX + spacingX;
        if (x >= finishX) break;
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
                    yScale: scaleFactor
                }
            }
        });
        platforms.push(platform);
        Matter.World.add(world, platform);
    }
}

export function generateCoinsSeeded(count, rand, scaleFactor, levelWidth, groundY, Matter, coins, world, ball) {
    coins.length = 0;
    const coinSize = 20 * scaleFactor;
    const exclusionMargin = 5;
    const minCoinYAboveGround = 30;
    const finishX = levelWidth - 100;
    for (let i = 0; i < count; i++) {
        for (let attempt = 0; attempt < 50; attempt++) {
            const x = rand() * (levelWidth - 50) + 25;
            if (x >= finishX) continue;
            const y = rand() * (groundY - coinSize - minCoinYAboveGround - 50) + 50;
            const coinBounds = {
                min: { x: x - coinSize, y: y - coinSize },
                max: { x: x + coinSize, y: y + coinSize }
            };
            const bodiesInRegion = Matter.Query.region(Matter.Composite.allBodies(world), {
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
                !['background', 'ground', 'playerBall'].includes(body.label)
            );
            const coinBottomY = y + coinSize;
            if (!collides) {
                const size = 20 * scaleFactor;
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

export function generateFinishLineSeeded(rand, scaleFactor, levelWidth, groundY, Matter, world) {
    const height = Math.floor(rand() * 100 + 100) * scaleFactor;
    const width = 40 * scaleFactor;
    const x = levelWidth - 100;
    const y = (groundY - height) / 2 + height / 2;
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

export function generateWalls(levelWidth, innerHeight, groundY, Matter, world, Bodies) {
    Matter.World.add(world, [
        Bodies.rectangle(-5, 300, 10, innerHeight, { isStatic: true, label: 'leftLimit' }),
        Bodies.rectangle(levelWidth + 10, 300, 10, innerHeight, { isStatic: true, label: 'rightLimit' }),
        Bodies.rectangle(0, 0, levelWidth * 2, 10, { isStatic: true, label: 'upperLimit' }),
        Bodies.rectangle(0, groundY, levelWidth * 2, 6, { isStatic: true, label: 'ground' })
    ]);
}

export function generateBackground(viewportWidth, viewportHeight, groundHeight, levelWidth, backgroundCenter, Matter, world) {
    const vw = viewportWidth - 5;
    const backgroundHeight = viewportHeight - groundHeight;
    const imageWidth = 2000;
    const backgroundImageHeight = 1000;
    const tilesNeeded = Math.ceil(levelWidth / vw) + 3;
    for (let i = 0; i < tilesNeeded; i++) {
        const x = (i * vw) + vw / 2;
        const backgroundTile = Matter.Bodies.rectangle(x, backgroundCenter, levelWidth, backgroundHeight,
            {
                isStatic: true,
                isSensor: true,
                label: 'background',
                render: {
                    sprite: {
                        texture: 'img/background_favela.png',
                        xScale: viewportWidth / imageWidth,
                        yScale: backgroundHeight / backgroundImageHeight
                    }
                }
            }
        );
        Matter.World.add(world, backgroundTile);
    }
}

export function generateGround(viewportWidth, groundY, groundHeight, levelWidth, Matter, world) {
    const imageWidth = 2000;
    const imageHeight = 600;
    const y = groundY + (groundHeight / 2);
    const tilesNeeded = Math.ceil(levelWidth / viewportWidth) + 3;
    for (let i = 0; i < tilesNeeded; i++) {
        const x = (i * viewportWidth) + viewportWidth / 2;
        const groundTile = Matter.Bodies.rectangle(x, y, viewportWidth, groundHeight,
            {
                isStatic: true,
                label: 'ground',
                render: {
                    sprite: {
                        texture: 'img/ground.png',
                        xScale: viewportWidth / imageWidth,
                        yScale: groundHeight / imageHeight
                    }
                }
            }
        );
        Matter.World.add(world, groundTile);
    }
}

export function getJumpImpulse(ball, scaleFactor, baseHeight) {
    const maxJumpHeight = baseHeight * (150 / 1000000);
    return -maxJumpHeight;
}
