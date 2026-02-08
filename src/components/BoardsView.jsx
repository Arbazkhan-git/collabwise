import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

export default function BoardsView({ onBoardClick, user }) {
  const [showInput, setShowInput] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [members, setMembers] = useState("");
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "boards"), where("userId", "==", user.uid));
    const unsubscribeBoards = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBoards(data);
      setLoading(false);
    });

    return () => unsubscribeBoards();
  }, [user]);

  const handleSave = async () => {
    if (!boardName.trim()) return;
    if (isNaN(members) || members <= 0) {
      alert("Members must be a number");
      return;
    }
    try {
      await addDoc(collection(db, "boards"), {
        name: boardName,
        members: Number(members),
        userId: user.uid,
        createdAt: Date.now()
      });
      setBoardName("");
      setMembers("");
      setShowInput(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create board");
    }
  };

  const deleteBoard = async (id) => {
    try {
      await deleteDoc(doc(db, "boards", id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete board");
    }
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <button
          onClick={() => setShowInput(!showInput)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span>{showInput ? "Cancel" : "+ Create Board"}</span>
        </button>

        {showInput && (
          <div className="mt-4 bg-white border-2 border-blue-200 rounded-xl p-4 sm:p-6 shadow-lg max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Board</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Board Name</label>
                <input
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="Enter board name..."
                  className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Members</label>
                <input
                  type="number"
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                  placeholder="Enter number of members"
                  className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>
              <button
                onClick={handleSave}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md"
              >
                Create Board
              </button>
            </div>
          </div>
        )}
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg mb-2">No boards yet</p>
          <p className="text-gray-400 text-sm">Create your first board to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => onBoardClick(board.id, board.name)}
              className="relative bg-white border-2 border-gray-200 rounded-xl p-5 shadow-md hover:shadow-xl cursor-pointer transition-all hover:scale-105 hover:border-blue-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-xl text-gray-800 group-hover:text-blue-600 transition-colors flex-1 pr-2">
                  {board.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${board.name}"?`)) {
                      deleteBoard(board.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity"
                  title="Delete board"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{board.members} {board.members === 1 ? 'member' : 'members'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
