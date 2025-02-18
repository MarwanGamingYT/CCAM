const hostBtn = document.getElementById('hostBtn');
const watchBtn = document.getElementById('watchBtn');
const videoContainer = document.getElementById('videoContainer');
const liveVideo = document.getElementById('liveVideo');

const socket = io(); // Connect to the signaling server

let localStream;
let peerConnection;

// Replace with your signaling server URL (e.g., localhost or a deployed server)
const signalingServerUrl = 'https://your-signaling-server.com';
socket.connect(signalingServerUrl);

// Host button: Start streaming
hostBtn.addEventListener('click', async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        liveVideo.srcObject = localStream;
        videoContainer.classList.remove('hidden');

        // Notify watchers that a host is available
        socket.emit('host-ready');
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
});

// Watch button: Request to watch the stream
watchBtn.addEventListener('click', () => {
    socket.emit('watcher-ready');
    videoContainer.classList.remove('hidden');
});

// WebRTC setup
socket.on('offer', async (id, description) => {
    peerConnection = new RTCPeerConnection();
    peerConnection.setRemoteDescription(description);

    // Add the host's stream to the peer connection
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', id, answer);
});

socket.on('answer', (description) => {
    peerConnection.setRemoteDescription(description);
});

socket.on('ice-candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
    }
};

peerConnection.ontrack = (event) => {
    liveVideo.srcObject = event.streams[0];
};

// Cleanup on disconnect
socket.on('disconnect', () => {
    if (peerConnection) peerConnection.close();
});
