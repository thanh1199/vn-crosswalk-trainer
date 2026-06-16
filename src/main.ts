import Game from './core/Game';

const game = new Game({ container: document.body });

const overlayStart = document.getElementById('overlay-start') as HTMLDivElement | null;
const overlayGameOver = document.getElementById('overlay-gameover') as HTMLDivElement | null;
const overlayClear = document.getElementById('overlay-clear') as HTMLDivElement | null;
const btnStart = document.getElementById('btn-start') as HTMLButtonElement | null;
const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement | null;
const btnNext = document.getElementById('btn-next') as HTMLButtonElement | null;

if (btnStart) {
    btnStart.addEventListener('click', () => {
        overlayStart?.classList.remove('visible');
        game.start();
    });
}

if (btnRestart) {
    btnRestart.addEventListener('click', () => {
        overlayGameOver?.classList.remove('visible');
        game.reset();
        game.start();
    });
}

if (btnNext) {
    btnNext.addEventListener('click', () => {
        overlayClear?.classList.remove('visible');
        game.reset();
        game.start();
    });
}

game.on('gameOver', () => {
    overlayGameOver?.classList.add('visible');
});

game.on('levelClear', () => {
    overlayClear?.classList.add('visible');
});

console.log('Bootstrap complete');

window.addEventListener('resize', () => game.onResize());
