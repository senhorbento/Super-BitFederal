import { jumpSound } from './audio.js';

export let ball;

export function addPlayerBall(scaleFactor, Matter, world) {
    const x = 10;
    const y = 10;
    const size = 25 * scaleFactor;
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

export function handleJump(ball, canJump, scaleFactor) {
    if (canJump) {
        const impulseY = -ball.mass * 0.05;
        Matter.Body.applyForce(ball, ball.position, { x: 0, y: impulseY });
        jumpSound.currentTime = 0;
        jumpSound.volume = 0.1;
        jumpSound.play();
        return false;
    }
    return canJump;
}
