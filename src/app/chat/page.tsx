"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChatLandingPage() {
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
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-6">
      <h1 className="text-3xl font-bold mb-4">🎥 Video Chat Rooms</h1>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="px-4 py-2 rounded-lg text-black"
        />
        <button
          onClick={handleJoin}
          className="bg-indigo-500 px-4 py-2 rounded-lg hover:bg-indigo-600"
        >
          Join Room
        </button>
      </div>

      <button
        onClick={handleCreate}
        className="bg-green-500 px-6 py-2 rounded-lg hover:bg-green-600 mt-3"
      >
        Create New Room
      </button>
    </main>
  );
}
