const socket = io('https://walkie-backend.onrender.com');

let localStream;
let peerConnection;
const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const micButton = document.getElementById('mic');

micButton.onclick = async () => {
    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startCall();
        micButton.textContent = '🔴 Stop Talking';
    } else {
        stopStream(localStream);
        localStream = null;
        micButton.textContent = '🎤 Tap to Talk';
    }
};

function stopStream(stream) {
    stream.getTracks().forEach(track => track.stop());
}

function startCall() {
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = e => {
        if (e.candidate) socket.emit('candidate', e.candidate);
    };

    peerConnection.ontrack = e => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.play();
    };

    peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    });
}

socket.on('offer', offer => {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        localStream = stream;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
        micButton.textContent = '🔴 Stop Talking';
        return peerConnection.createAnswer();
    }).then(answer => {
        peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    });

    peerConnection.ontrack = e => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.play();
    };

    peerConnection.onicecandidate = e => {
        if (e.candidate) socket.emit('candidate', e.candidate);
    };
});

socket.on('answer', answer => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', candidate => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
