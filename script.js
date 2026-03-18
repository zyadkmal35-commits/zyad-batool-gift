const landing = document.getElementById('landing');
const scanner = document.getElementById('scanner');
const progressBar = document.getElementById('progress-bar');
const reveal = document.getElementById('reveal');
const typewriter = document.getElementById('typewriter');
const bgMusic = document.getElementById('bg-music');
const cells = document.querySelectorAll('.cell');
const gameStatus = document.getElementById('game-status');
const resetBtn = document.getElementById('reset-game');
const roleSelection = document.getElementById('role-selection');
const btnZyad = document.getElementById('btn-zyad');
const btnBatool = document.getElementById('btn-batool');

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCo1HSjIr-xZqq-GBRRrHUoRpNBhq1fch0",
    authDomain: "zootopia-game-e599a.firebaseapp.com",
    databaseURL: "https://zootopia-game-e599a-default-rtdb.firebaseio.com",
    projectId: "zootopia-game-e599a",
    storageBucket: "zootopia-game-e599a.firebasestorage.app",
    messagingSenderId: "209733577829",
    appId: "1:209733577829:web:67438de34366b24938aa8c",
    measurementId: "G-E84DN3XS6T"
};

// Initialize Firebase
let db = null;
let gameRef = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    if (firebase.database) {
        db = firebase.database();
        gameRef = db.ref('zyad_batool_game');
    }
}

let pressTimer;
let progress = 0;
const message = "إلى شريكتي في الجريمة، بتول.. القضية اليوم مغلقة لأننا وجدنا أهم شيء نبحث عنه: حبنا. يا أغلى جودي في الدنيا، وجودك بمثابة الحل لكل الألغاز. زياد دايماً معاكي.. ❤️🐾";

function startScan() {
    pressTimer = setInterval(() => {
        progress += 2;
        progressBar.style.width = progress + '%';
        
        if (progress >= 100) {
            clearInterval(pressTimer);
            unlock();
        }
    }, 40);
}

function stopScan() {
    clearInterval(pressTimer);
    if (progress < 100) {
        progress = 0;
        progressBar.style.width = '0%';
    }
}

function unlock() {
    landing.style.opacity = '0';
    setTimeout(() => {
        landing.classList.remove('active');
        reveal.classList.add('active');
        startTypewriter();
        initGame(); // Start multiplayer sync
        bgMusic.play().catch(() => {
            console.log("Autoplay blocked, needs user interaction.");
        });
    }, 500);
}

function startTypewriter() {
    let i = 0;
    typewriter.innerHTML = "";
    
    function type() {
        if (i < message.length) {
            typewriter.innerHTML += message.charAt(i);
            i++;
            if (message.charAt(i-1) === '❤️' || Math.random() > 0.9) {
                createHeart();
            }
            setTimeout(type, 50);
        }
    }
    type();
}

function createHeart() {
    const heart = document.createElement('div');
    heart.innerHTML = '❤️';
    heart.className = 'heart-particle';
    heart.style.left = Math.random() * 100 + 'vw';
    heart.style.animationDuration = Math.random() * 2 + 3 + 's';
    heart.style.fontSize = Math.random() * 15 + 15 + 'px';
    document.body.appendChild(heart);
    
    setTimeout(() => {
        heart.remove();
    }, 5000);
}

// --- Multiplayer Game Logic ---
let gameState = Array(9).fill(null);
let currentPlayer = 'nick';
let scores = { nick: 0, judy: 0 };

let myRole = localStorage.getItem('playerRole');
if (myRole) {
    roleSelection.style.display = 'none';
}

btnZyad.addEventListener('click', () => selectRole('nick'));
btnBatool.addEventListener('click', () => selectRole('judy'));

function selectRole(role) {
    myRole = role;
    localStorage.setItem('playerRole', role);
    roleSelection.style.display = 'none';
}

function initGame() {
    if (gameRef) {
        gameRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                gameState = data.board || Array(9).fill(null);
                currentPlayer = data.turn || 'nick';
                scores = data.scores || { nick: 0, judy: 0 };
                updateBoardUI();
                checkWinner();
            }
        });
    } else {
        updateBoardUI();
    }
}

function updateBoardUI() {
    cells.forEach((cell, index) => {
        cell.className = 'cell';
        if (gameState[index]) {
            cell.classList.add(gameState[index]);
        }
    });
    document.getElementById('score-fox').innerText = scores.nick;
    document.getElementById('score-rabbit').innerText = scores.judy;
    gameStatus.innerText = currentPlayer === 'nick' ? "دور زياد (Nick) 🦊" : "دور بتول (Judy) 🐰";
}

function handleCellClick(e) {
    const index = e.target.getAttribute('data-index');
    
    if (gameState[index]) return;

    if (!myRole) {
        alert("لازم تختار إنت مين الأول من القائمة عشان تلعب!");
        return;
    }
    if (currentPlayer !== myRole) {
        alert("مش دورك يا مكار! ده دور " + (currentPlayer === 'nick' ? 'زياد 🦊' : 'بتول 🐰'));
        return;
    }
    
    gameState[index] = currentPlayer;
    const nextPlayer = currentPlayer === 'nick' ? 'judy' : 'nick';
    
    if (gameRef) {
        gameRef.update({
            board: gameState,
            turn: nextPlayer
        });
    } else {
        currentPlayer = nextPlayer;
        updateBoardUI();
        checkWinner();
    }
}

function checkWinner() {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (let combo of wins) {
        const [a, b, c] = combo;
        if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
            const winner = gameState[a];
            gameStatus.innerText = `${winner === 'nick' ? 'زياد' : 'بتول'} كسب القضية! 🎉`;
            
            // Winning animation (burst of hearts)
            for(let i=0; i<20; i++) setTimeout(createHeart, i * 100);
            
            return true;
        }
    }
    return false;
}

function resetGame() {
    if (gameRef) {
        gameRef.update({
            board: Array(9).fill(null),
            turn: 'nick'
        });
    } else {
        gameState = Array(9).fill(null);
        currentPlayer = 'nick';
        updateBoardUI();
        gameStatus.innerText = "دور زياد (Nick) 🦊";
    }
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
resetBtn.addEventListener('click', resetGame);

// Touch & Mouse Events
scanner.addEventListener('mousedown', startScan);
scanner.addEventListener('mouseup', stopScan);
scanner.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startScan();
});
scanner.addEventListener('touchend', stopScan);
