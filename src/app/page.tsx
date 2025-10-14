"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Video, Users } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const handleJoin = () => {
    if (roomId.trim()) router.push(`/chat/${roomId}`);
  };

  const handleCreate = () => {
    const newRoom = Math.random().toString(36).substring(2, 8);
    router.push(`/chat/${newRoom}`);
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-indigo-900 via-black to-gray-900 text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background Blur Circles */}
      <div className="absolute w-72 h-72 bg-indigo-500 rounded-full blur-3xl opacity-20 top-10 left-20 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-pink-500 rounded-full blur-3xl opacity-20 bottom-10 right-10 animate-pulse"></div>

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Video size={40} className="text-indigo-400" />
          <h1 className="text-4xl md:text-5xl font-bold">Video Chat</h1>
        </div>

        <p className="text-gray-300 mb-8 text-lg max-w-md mx-auto">
          Connect with your friends in real-time with high-quality audio and video.
        </p>

        {/* Input Section */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="px-4 py-3 rounded-lg text-black w-64"
          />
          <button
            onClick={handleJoin}
            className="bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-lg font-semibold transition"
          >
            Join Room
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={handleCreate}
            className="bg-green-500 hover:bg-green-600 px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto transition"
          >
            <Users size={22} />
            Create New Room
          </button>
        </div>

        {/* Footer */}
        <p className="text-gray-400 text-sm mt-10">
          Built with ❤️ using Next.js, Socket.io, and WebRTC
        </p>
      </div>
    </main>
  );
}
