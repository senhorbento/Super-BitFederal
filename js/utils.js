export function randomBetween(rand, min, max) {
    return Math.floor(rand() * (max - min + 1) + min);
}

export function createSeededRandom(seed) {
    let s = seed;
    return function () {
        s = Math.imul(16807, s) % 2147483647;
        return (s & 0x7fffffff) / 2147483647;
    };
}
