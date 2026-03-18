// DOM Elements
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom   = document.getElementById('btn-join-room');
const joinRoomCode  = document.getElementById('join-room-code');
const lobbyError    = document.getElementById('lobby-error');
const resetBtn      = document.getElementById('reset-game');
const leaveRoomBtn  = document.getElementById('leave-room');
const cells         = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('game-status');
const celebrationScreen = document.getElementById('celebration');

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCo1HSjIr-xZqq-GBRRrHUoRpNBhq1fch0",
    authDomain: "zootopia-game-e599a.firebaseapp.com",
    databaseURL: "https://zootopia-game-e599a-default-rtdb.firebaseio.com",
    projectId: "zootopia-game-e599a",
    storageBucket: "zootopia-game-e599a.firebasestorage.app",
    messagingSenderId: "209733577829",
    appId: "1:209733577829:web:67438de34366b24938aa8c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Names
const NAMES = { fox: 'Zyad 🦊', rabbit: 'Batool 🐰' };

// State
let myRole    = null;
let roomCode  = null;
let gameRef   = null;
let gameState = Array(9).fill(null);
let currentTurn  = 'fox';
let currentState = 'lobby';
let scores    = { fox: 0, rabbit: 0 };
let listening = false;

// ── Helpers ──────────────────────────────────────────────
function generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
}

// ── Create Room ───────────────────────────────────────────
btnCreateRoom.onclick = async () => {
    btnCreateRoom.disabled = true;
    btnCreateRoom.querySelector('span').innerText = 'جاري الإنشاء...';

    roomCode = generateCode();
    myRole   = 'fox';
    gameRef  = db.ref('rooms/' + roomCode);

    await gameRef.set({
        board: Array(9).fill(null),
        turn: 'fox',
        state: 'waiting',
        scores: { fox: 0, rabbit: 0 },
        winner: null,
        winCombo: null
    });

    gameRef.onDisconnect().remove();
    document.getElementById('room-code-display').innerText = roomCode;
    showScreen('waiting-screen');
    startListening();
};

// ── Join Room ─────────────────────────────────────────────
btnJoinRoom.onclick = async () => {
    lobbyError.innerText = '';
    const code = joinRoomCode.value.trim();
    if (!code) { lobbyError.innerText = 'اكتب الكود الأول!'; return; }

    const snap = await db.ref('rooms/' + code).once('value');
    if (!snap.exists()) { lobbyError.innerText = 'الغرفة مش موجودة!'; return; }

    const data = snap.val();
    if (data.state !== 'waiting') { lobbyError.innerText = 'الغرفة ممتلئة!'; return; }

    roomCode = code;
    myRole   = 'rabbit';
    gameRef  = db.ref('rooms/' + roomCode);

    await gameRef.update({ state: 'playing' });
    document.getElementById('current-room-display').innerText = roomCode;
    showScreen('game-screen');
    startListening();
};

// ── Firebase Listener ─────────────────────────────────────
function startListening() {
    if (listening) return;
    listening = true;

    gameRef.on('value', snap => {
        const data = snap.val();
        if (!data) { alert('الغرفة اتقفلت.'); location.reload(); return; }

        gameState    = data.board   || Array(9).fill(null);
        currentTurn  = data.turn    || 'fox';
        currentState = data.state;
        scores       = data.scores  || { fox: 0, rabbit: 0 };

        if (data.state === 'waiting') {
            showScreen('waiting-screen');

        } else if (data.state === 'playing') {
            document.getElementById('current-room-display').innerText = roomCode;
            showScreen('game-screen');
            renderBoard(data);
            celebrationScreen.classList.add('hidden');
            resetBtn.classList.add('hidden-btn');
            updateStatus();

        } else if (data.state === 'finished') {
            document.getElementById('current-room-display').innerText = roomCode;
            showScreen('game-screen');
            renderBoard(data);
            handleFinish(data);
        }
    });
}

// ── Render Board ──────────────────────────────────────────
function renderBoard(data) {
    cells.forEach((cell, i) => {
        cell.className = 'cell';
        cell.innerHTML = ''; // clear old emoji
        const val = gameState[i];
        if (val) {
            cell.classList.add(val);
            const span = document.createElement('span');
            span.className = 'cell-emoji';
            span.textContent = val === 'fox' ? '🦊' : '🐰';
            cell.appendChild(span);
        }
        if (data.winCombo && data.winCombo.includes(i)) cell.classList.add('win');
        const clickable = currentState === 'playing' && !val && currentTurn === myRole;
        cell.style.cursor = clickable ? 'pointer' : 'not-allowed';
        cell.style.opacity = (!val && currentState === 'playing' && currentTurn !== myRole) ? '0.5' : '1';
    });

    document.getElementById('score-fox').innerText    = scores.fox;
    document.getElementById('score-rabbit').innerText = scores.rabbit;
}

function updateStatus() {
    if (currentTurn === myRole) {
        statusDisplay.innerText = '✨ دورك أنت!';
        statusDisplay.style.color = myRole === 'fox' ? '#f97316' : '#ec4899';
    } else {
        const other = myRole === 'fox' ? NAMES.rabbit : NAMES.fox;
        statusDisplay.innerText = `⏳ دور ${other}`;
        statusDisplay.style.color = '#94a3b8';
    }
}

// ── Finish UI ─────────────────────────────────────────────
function handleFinish(data) {
    resetBtn.classList.remove('hidden-btn');
    celebrationScreen.classList.add('hidden');

    if (data.winner === 'draw') {
        statusDisplay.innerText = '🤝 تعادل!';
        statusDisplay.style.color = '#94a3b8';
    } else {
        statusDisplay.innerText = `${NAMES[data.winner]} فاز! 🎉`;
        statusDisplay.style.color = data.winner === 'fox' ? '#f97316' : '#ec4899';

        if (data.winner === myRole) {
            document.getElementById('celebration-text').innerText = `برافو ${NAMES[myRole]}! 🏆`;
            celebrationScreen.classList.remove('hidden');
            setTimeout(() => celebrationScreen.classList.add('hidden'), 2500);
        }
    }
}

// ── Win Check ─────────────────────────────────────────────
function checkWin(board) {
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (const [a,b,c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], combo: [a,b,c] };
        }
    }
    if (!board.includes(null)) return { winner: 'draw', combo: null };
    return { winner: null, combo: null };
}

// ── Cell Click ────────────────────────────────────────────
function handleCellClick(e) {
    if (currentState !== 'playing') return;
    if (currentTurn !== myRole) return;

    const i = parseInt(e.currentTarget.getAttribute('data-index'));
    if (gameState[i] !== null) return;

    const newBoard = [...gameState];
    newBoard[i] = myRole;

    const { winner, combo } = checkWin(newBoard);
    const nextTurn = myRole === 'fox' ? 'rabbit' : 'fox';
    const newScores = { ...scores };
    if (winner && winner !== 'draw') newScores[winner]++;

    gameRef.update({
        board: newBoard,
        turn: winner ? currentTurn : nextTurn,
        state: winner ? 'finished' : 'playing',
        winner: winner || null,
        winCombo: combo || null,
        scores: newScores
    });
}

cells.forEach(c => c.addEventListener('click', handleCellClick));

// ── Reset ─────────────────────────────────────────────────
resetBtn.onclick = () => {
    if (currentState !== 'finished') return;
    gameRef.update({
        board: Array(9).fill(null),
        turn: 'fox',
        state: 'playing',
        winner: null,
        winCombo: null
    });
};

// ── Leave ─────────────────────────────────────────────────
leaveRoomBtn.onclick = () => {
    if (confirm('متأكد إنك عايز تخرج؟')) {
        if (gameRef) gameRef.remove();
        location.reload();
    }
};
