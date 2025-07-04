import { startGameWithSeed, updateViewportSize } from './engine.js';

const { Engine, Render, World, Bodies, Mouse, MouseConstraint, Events, Query } = Matter;

const width = 1024;
const height = 768;
const seed = 1751623929814;
const buttonLabels = ['Escolhida pelo Dev', 'Fase Aleatória'];
const buttonWidth = 300;
const buttonHeight = 60;
const spacing = 5;
const startY = height / 2 - ((buttonHeight + spacing) * 1.5);

const engine = Engine.create();
const world = engine.world;

const canvas = document.getElementById('gameCanvas');
canvas.width = width;
canvas.height = height;

const render = Render.create({
    engine,
    canvas,
    options: {
        pixelRatio: window.devicePixelRatio,
        width,
        height,
        wireframes: false,
        background: '#000'
    }
});

Render.run(render);
Engine.run(engine);

window.keys = {};
document.addEventListener('keydown', e => window.keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => window.keys[e.key.toLowerCase()] = false);
window.addEventListener('resize', updateViewportSize);

const buttons = buttonLabels.map((label, i) => {
    const y = startY + i * (buttonHeight + spacing);
    return Bodies.rectangle(width / 2, y, buttonWidth, buttonHeight, {
        isStatic: true,
        label,
        render: {
            fillStyle: '#222',
            strokeStyle: '#fff',
            lineWidth: 2
        }
    });
});
World.add(world, buttons);

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
World.add(world, mouseConstraint);

Events.on(mouseConstraint, 'mousedown', event => {
    const mousePos = event.mouse.position;
    const clicked = Query.point(buttons, mousePos);
    if (clicked.length > 0) handleButtonClick(clicked[0].label);
});

let menuActive = true;
let menuAnimationId;

function drawInitialText() {
    if (!menuActive) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.font = 'bold 38px Arial';
    ctx.fillStyle = '#FFD600';
    ctx.textAlign = 'center';
    ctx.fillText('Super BitFederal', width / 2, height / 2 - 150);
    ctx.font = '28px Arial';
    ctx.fillStyle = '#fff';
    buttonLabels.forEach((label, i) => {
        const y = startY + i * (buttonHeight + spacing) + 20;
        ctx.fillText(label, width / 2, y);
    });
    ctx.restore();
}

function renderLoop() {
    if (!menuActive) return;
    drawInitialText();
    menuAnimationId = requestAnimationFrame(renderLoop);
}
renderLoop();

function stopMenu() {
    menuActive = false;
    if (menuAnimationId) cancelAnimationFrame(menuAnimationId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
}

function handleButtonClick(label) {
    switch (label) {
        case 'Escolhida pelo Dev':
            stopMenu();
            Render.stop(render);
            World.clear(world, false);
            Engine.clear(engine);
            startGameWithSeed(seed, Matter);
            break;
        case 'Fase Aleatória':
            stopMenu();
            Render.stop(render);
            World.clear(world, false);
            Engine.clear(engine);
            const randomSeed = Math.floor(Math.random() * 1e16);
            startGameWithSeed(randomSeed, Matter);
            break;
        case 'Sair':
            window.close && window.close();
            break;
    }
}

function showMenu() {
    menuActive = true;
    const newEngine = Engine.create();
    const newWorld = newEngine.world;
    const newRender = Render.create({
        engine: newEngine,
        canvas: canvas,
        options: {
            pixelRatio: window.devicePixelRatio,
            width,
            height,
            wireframes: false,
            background: '#000'
        }
    });
    Render.run(newRender);
    Engine.run(newEngine);
    const newButtons = buttonLabels.map((label, i) => {
        const y = startY + i * (buttonHeight + spacing);
        return Bodies.rectangle(width / 2, y, buttonWidth, buttonHeight, {
            isStatic: true,
            label,
            render: {
                fillStyle: '#222',
                strokeStyle: '#fff',
                lineWidth: 2
            }
        });
    });
    World.add(newWorld, newButtons);
    const newMouse = Mouse.create(canvas);
    const newMouseConstraint = MouseConstraint.create(newEngine, {
        mouse: newMouse,
        constraint: { stiffness: 0.2, render: { visible: false } }
    });
    World.add(newWorld, newMouseConstraint);
    Events.on(newMouseConstraint, 'mousedown', event => {
        const mousePos = event.mouse.position;
        const clicked = Query.point(newButtons, mousePos);
        if (clicked.length > 0) {
            Render.stop(newRender);
            World.clear(newWorld, false);
            Engine.clear(newEngine);
            handleButtonClick(clicked[0].label);
        }
    });
    menuAnimationId = null;
    renderLoop();
}

window.addEventListener('gameEnded', () => {
    showMenu();
});
