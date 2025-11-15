const socket = io();

const joinBtn = document.getElementById('joinRoomBtn');
const leaveBtn = document.getElementById('leaveRoomBtn');
const nameInput = document.getElementById('nameInput');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendChat');
const chatBox = document.getElementById('chatBox');
const userList = document.getElementById('userList');
const copyBtn = document.getElementById('copyLink');

const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const seekBack = document.getElementById('seekBack');
const seekFwd = document.getElementById('seekFwd');
const videoBox = document.getElementById('videoBox');
const reactionsContainer = document.getElementById('reactions');

const room = ROOM_ID || location.pathname.split('/').pop();

let myName = '';
let joined = false;

// Copy room link
copyBtn.onclick = () => {
  navigator.clipboard.writeText(location.href).then(()=> alert('Link copied'));
};

// Join room
joinBtn.onclick = () => {
  if (joined) return alert('Already joined');
  myName = (nameInput.value || 'Guest').trim();
  if (!myName) myName = 'Guest';
  socket.emit('join', { room, name: myName });
  appendSystem(`You joined as ${myName}`);
  joined = true;
};

// Leave room
leaveBtn.onclick = () => {
  if (!joined) return;
  socket.emit('leave', { room, name: myName });
  appendSystem('You left the room.');
  userList.innerHTML = '';
  joined = false;
};

// Chat
sendBtn.onclick = () => sendMessage();
chatInput.addEventListener('keydown', e => { if (e.key==='Enter') sendMessage(); });

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !joined) return;
  const data = { room, sender: myName, text, ts: Date.now() };
  socket.emit('chat', data);
  appendChat('me', data);
  chatInput.value = '';
}

// Receive chat
socket.on('chat', data => {
  if (data.sender !== myName) appendChat('peer', data);
});

// Reactions
document.querySelectorAll('.emoji').forEach(btn => {
  btn.onclick = () => {
    socket.emit('reaction', { room, sender: myName, emoji: btn.dataset.emoji });
    showReaction(btn.dataset.emoji);
  };
});
socket.on('reaction', data => showReaction(data.emoji));

function showReaction(emoji) {
  const el = document.createElement('div');
  el.className = 'reaction-float';
  el.innerText = emoji;
  el.style.left = Math.random() * 60 + '%';
  reactionsContainer.appendChild(el);
  setTimeout(()=> el.remove(), 1800);
}

// Media controls
playBtn.onclick = () => { videoBox.play(); socket.emit('media-control', { room, action:'play' }); };
pauseBtn.onclick = () => { videoBox.pause(); socket.emit('media-control', { room, action:'pause' }); };
seekBack.onclick = () => { videoBox.currentTime -= 10; socket.emit('media-control', { room, action:'seek', value:-10 }); };
seekFwd.onclick = () => { videoBox.currentTime += 10; socket.emit('media-control', { room, action:'seek', value:10 }); };
socket.on('media-control', data => {
  if(data.action==='play') videoBox.play();
  if(data.action==='pause') videoBox.pause();
  if(data.action==='seek') videoBox.currentTime += data.value;
});

// User list
socket.on('user-list', data => {
  userList.innerHTML = '';
  data.users.forEach(u => { const li = document.createElement('li'); li.textContent = u; userList.appendChild(li); });
});

// System messages
function appendSystem(text){
  const div = document.createElement('div');
  div.className = 'chat-line system';
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Chat messages
function appendChat(kind, data){
  const div = document.createElement('div');
  div.className = 'chat-line ' + kind;
  div.innerHTML = `<b>${data.sender}</b>: ${data.text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}