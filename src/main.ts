import "./style.css";
import { io } from "socket.io-client";

/**
 * websocketの処理
 */

const socket = io("ws://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to server");
});

/**
 * video設定
 */
const video = document.querySelector("#localVideo")! as HTMLVideoElement;
const remoteVideo = document.querySelector("#remoteVideo")! as HTMLVideoElement;

/**
 * peer
 */
let localPeerConnection: RTCPeerConnection;

/**
 * buttons
 */
const startButton = document.querySelector("#start")!;
const call = document.querySelector("#call")!;

startButton.addEventListener("click", start);
call.addEventListener("click", offer);

// videoの再生
async function start() {
  const constraints = {
    audio: false,
    video: true,
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  video.srcObject = stream;

  video.play();
  // RTCPeerConnectionの作成
  localPeerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // streamをset
  stream.getTracks().forEach((track) => {
    // mediaStreamをpeerにセット
    localPeerConnection.addTrack(track, stream);
  });

  // eventを設定
  localPeerConnection.addEventListener(
    "icecandidate",
    (e: RTCPeerConnectionIceEvent) => {
      if (e.candidate == null) {
        console.log("icecandidate end");
        return;
      }

      console.log("icecandidate", e.candidate);

      socket.emit("candidate", {
        type: "candidate",
        label: e.candidate.sdpMLineIndex,
        id: e.candidate.sdpMid,
        candidate: e.candidate.candidate,
      });
    }
  );

  // 相手がストリームを送ってき時の処理
  localPeerConnection.addEventListener("track", (e: Event) => {
    console.log("track", e);

    remoteVideo.srcObject = e.streams[0];
  });
}

// offerを作成、送信
async function offer() {
  const sessionDescription = await localPeerConnection.createOffer();
  await localPeerConnection.setLocalDescription(sessionDescription);
  socket.emit("offer", sessionDescription);
}

socket
  .on("offer", async (offer: RTCSessionDescriptionInit) => {
    console.log("offer来たよ", offer);

    // offerを受信
    await localPeerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    // answerを作成して送信
    const answer = await localPeerConnection.createAnswer();
    await localPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  })
  .on("answer", (answer) => {
    console.log("answer来たよ", answer);

    // answerを受信
    localPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  })
  .on("candidate", (message: any) => {
    console.log("on message : Candidate", message);

    const candidate = new RTCIceCandidate({
      sdpMLineIndex: message?.label,
      candidate: message?.candidate,
    });

    localPeerConnection.addIceCandidate(candidate);
  });

function createRtcPeerConnection(stream: MediaStream) {}
