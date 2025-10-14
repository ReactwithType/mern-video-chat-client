
"use client";

import { useParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Send, Users } from "lucide-react";

// Chat message type
type ChatMsg = { userName: string; message: string; time: string };

// Payload sent via socket (includes roomId)
type ChatPayload = ChatMsg & { roomId: string };

// const SOCKET_URL = "http://localhost:5000";
// let globalSocket: Socket | null = null;
// Use environment variable for Socket URL
const SOCKET_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
let globalSocket: Socket | null = null;

export default function RoomChatPage() {
  const { roomId } = useParams() as { roomId?: string };
  const [userName, setUserName] = useState("");
  const [joined, setJoined] = useState(false);
  const [remoteUser, setRemoteUser] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize socket
  useEffect(() => {
    if (!globalSocket) globalSocket = io(SOCKET_URL);
  }, []);

  // Chat history listener
  useEffect(() => {
    const socket = globalSocket;
    if (!socket) return;

    const onHistory = (history: ChatMsg[]) => setMessages(history);

    socket.on("chat-history", onHistory);
    return () => { socket.off("chat-history", onHistory); };
  }, [roomId]);

  // Other socket listeners
  useEffect(() => {
    const socket = globalSocket;
    if (!socket) return;

    const onUserJoined = (name: string) => {
      setParticipants((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setMessages((prev) => [...prev, {
        userName: "System",
        message: `${name} joined the room`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    };

    const onUserLeft = (name: string) => {
      setParticipants((prev) => prev.filter((p) => p !== name));
      setMessages((prev) => [...prev, {
        userName: "System",
        message: `${name} left the room`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    };

    const onReceiveMessage = (msg: ChatMsg) => setMessages((prev) => [...prev, msg]);

    const onOffer = async (offer: RTCSessionDescriptionInit) => {
      if (!pcRef.current) createPeerConnection();
      await pcRef.current!.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current!.createAnswer();
      await pcRef.current!.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
    };

    const onAnswer = async (answer: RTCSessionDescriptionInit) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onCandidate = async (candidate: RTCIceCandidateInit) => {
      await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    };

    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("receive-message", onReceiveMessage);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("candidate", onCandidate);

    return () => {
      socket.off("user-joined", onUserJoined);
      socket.off("user-left", onUserLeft);
      socket.off("receive-message", onReceiveMessage);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("candidate", onCandidate);
    };
  }, [roomId]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const createPeerConnection = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] });
    pc.onicecandidate = (ev) => { if (ev.candidate) globalSocket?.emit("candidate", { roomId, candidate: ev.candidate }); };
    pc.ontrack = (ev) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0]; };
    pcRef.current = pc;
    return pc;
  };

  const handleJoinRoom = () => {
    if (!userName.trim() || !globalSocket) return;
    globalSocket.emit("join-room", { roomId, userName });
    setParticipants((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
    setJoined(true);
  };

  const handleStartCall = async () => {
    try {
      createPeerConnection();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pcRef.current?.addTrack(track, stream));
      const offer = await pcRef.current!.createOffer();
      await pcRef.current!.setLocalDescription(offer);
      globalSocket?.emit("offer", { roomId, offer });
    } catch { alert("Check camera/mic permissions"); }
  };

  const toggleMic = () => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !micOn); setMicOn(!micOn); };
  const toggleCam = () => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !camOn); setCamOn(!camOn); };
  const handleEndCall = () => { pcRef.current?.close(); pcRef.current=null; localStreamRef.current?.getTracks().forEach(t=>t.stop()); localStreamRef.current=null; setJoined(false); };
  if (!roomId) {
    alert("Room ID not found");
    return;
  }
  const sendMessage = () => {
    if (!newMessage.trim() || !globalSocket) return;
    const payload: ChatPayload = {
      roomId,
      userName: userName || "Anonymous",
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    globalSocket.emit("send-message", payload);
    const chatMsg: ChatMsg = { userName: payload.userName, message: payload.message, time: payload.time };
    setMessages((prev) => [...prev, chatMsg]);
    setNewMessage("");
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-white p-4 gap-6">
      {/* Video Section */}
      <section className="flex-1 flex flex-col items-center">
        {!joined ? (
          <div className="bg-gray-800 p-4 rounded-lg flex flex-col gap-3 items-center">
            <input className="bg-gray-700 px-3 py-2 rounded-md w-full text-white outline-none" placeholder="Enter display name" value={userName} onChange={(e)=>setUserName(e.target.value)} />
            <div className="flex gap-3 mt-2">
              <button onClick={handleJoinRoom} className="bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700">Join Room</button>
              <button onClick={()=>{const newRoom=Math.random().toString(36).substring(2,8); window.location.href=`/chat/${newRoom}`}} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">Create Room</button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div>{userName}</div>
                <video ref={localVideoRef} autoPlay playsInline muted className="bg-black rounded w-72 h-48 object-cover" />
              </div>
              <div className="flex flex-col items-center">
                <div>{remoteUser || "Waiting..."}</div>
                <video ref={remoteVideoRef} autoPlay playsInline className="bg-black rounded w-72 h-48 object-cover" />
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <button onClick={toggleMic} className="bg-gray-700 p-3 rounded-full">{micOn?<Mic/>:<MicOff/>}</button>
              <button onClick={toggleCam} className="bg-gray-700 p-3 rounded-full">
  {camOn ? <Video /> : <VideoOff />}
</button>
              <button onClick={handleEndCall} className="bg-red-600 p-3 rounded-full"><PhoneOff/></button>
              <button onClick={handleStartCall} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">Start Call</button>
            </div>
          </div>
        )}
      </section>

      {/* Chat Sidebar */}
      <aside className="w-full md:w-80 flex flex-col gap-4">
        <div className="bg-gray-800 p-3 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Participants</h3>
          <ul className="space-y-2">{participants.map((p,i)=><li key={i} className="flex items-center gap-2"><User />{p}</li>)}</ul>
        </div>
        <div className="bg-gray-800 p-3 rounded-lg flex flex-col h-96">
          <h3 className="text-sm font-semibold mb-2">Chat</h3>
          <div className="flex-1 overflow-y-auto mb-3 space-y-2 p-1">
            {messages.map((m,i)=>(
              <div key={i} className={`p-2 rounded-md ${m.userName==="System"?"bg-gray-600 text-center italic text-sm":m.userName===userName?"bg-blue-700 text-right":"bg-gray-700 text-left"}`}>
                {m.userName!=="System" && <div className="text-xs font-semibold">{m.userName}</div>}
                <div>{m.message}</div>
                <div className="text-xs text-gray-300 mt-1">{m.time}</div>
              </div>
            ))}
            <div ref={chatEndRef}/>
          </div>
          <div className="flex gap-2">
            <input value={newMessage} onChange={(e)=>setNewMessage(e.target.value)} onKeyDown={(e)=>e.key==="Enter" && sendMessage()} placeholder="Type a message..." className="flex-1 px-3 py-2 rounded-l-md bg-gray-900 text-white outline-none" />
            <button onClick={sendMessage} className="bg-indigo-600 px-3 py-2 rounded-r-md hover:bg-indigo-700 flex items-center"><Send/></button>
          </div>
        </div>
      </aside>
    </main>
  );
}
