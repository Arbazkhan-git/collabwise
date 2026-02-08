import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

export default function BoardsView({ onBoardClick, user }) {
  const [showInput, setShowInput] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmBoardId, setDeleteConfirmBoardId] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 🔹 Fetch boards where user is a member
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "boards"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBoards(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 🔹 Create 
  
  const handleSave = async () => {
    if (!boardName.trim()) return;

    try {
      await addDoc(collection(db, "boards"), {
        name: boardName.trim(),
        ownerId: user.uid,
        userId: user.uid, // for compatibility with TaskManagerView etc.
        members: [user.uid],
        createdAt: serverTimestamp(),
      });

      setBoardName("");
      setShowInput(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create board");
    }
  };

  // 🔹 Edit board name
  const startEditing = (board) => {
    setEditingBoardId(board.id);
    setEditingName(board.name || "");
  };

  const saveBoardName = async () => {
    if (!editingBoardId || !editingName.trim()) {
      setEditingBoardId(null);
      setEditingName("");
      return;
    }
    try {
      await updateDoc(doc(db, "boards", editingBoardId), {
        name: editingName.trim()
      });
    } catch (err) {
      console.error(err);
      alert("Failed to update board name");
    }
    setEditingBoardId(null);
    setEditingName("");
  };

  // 🔹 Delete board (after user types "delete")
  const openDeleteConfirm = (board) => {
    setDeleteConfirmBoardId(board.id);
    setDeleteConfirmText("");
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmBoardId(null);
    setDeleteConfirmText("");
  };

  const deleteBoard = async () => {
    if (!deleteConfirmBoardId) return;
    if (deleteConfirmText.trim().toLowerCase() !== "delete") return;
    try {
      await deleteDoc(doc(db, "boards", deleteConfirmBoardId));
      closeDeleteConfirm();
    } catch (err) {
      console.error(err);
      alert("Failed to delete board");
    }
  };

  if (loading) {
    return <p className="text-center mt-10 text-gray-500">Loading...</p>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Create board button */}
      <div className="mb-6">
        <button
          onClick={() => setShowInput(!showInput)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all"
        >
          {showInput ? "Cancel" : "+ Create Board"}
        </button>

        {showInput && (
          <div className="mt-4 bg-white border-2 border-blue-200 rounded-xl p-5 shadow-lg max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Create New Board
            </h3>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board Name
            </label>
            <input
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Enter board name..."
              className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />

            <button
              onClick={handleSave}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-md"
            >
              Create Board
            </button>
          </div>
        )}
      </div>

      {/* Boards list */}
      {boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg mb-2">No boards yet</p>
          <p className="text-gray-400 text-sm">
            Create your first board to get started!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {boards.map((board) => (
            <div
              key={board.id}
              className="relative bg-white border-2 border-gray-200 rounded-xl p-5 shadow-md hover:shadow-xl transition-all flex flex-col"
            >
              <div
                onClick={() => !editingBoardId && onBoardClick(board.id, board.name)}
                className="cursor-pointer flex-1 min-w-0"
              >
                <div className="flex justify-between items-start mb-3 gap-2">
                  {editingBoardId === board.id ? (
                    <div className="flex-1 min-w-0 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveBoardName();
                          if (e.key === "Escape") {
                            setEditingBoardId(null);
                            setEditingName("");
                          }
                        }}
                        className="flex-1 min-w-0 font-bold text-xl text-gray-800 border-2 border-blue-300 px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                      />
                      <button
                        onClick={saveBoardName}
                        className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3
                        className="font-bold text-xl text-gray-800 truncate pr-2 flex-1 min-w-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(board);
                        }}
                        title="Click to edit name"
                      >
                        {board.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteConfirm(board);
                        }}
                        className="text-red-500 hover:text-red-700 flex-shrink-0 p-1"
                        title="Delete board"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  👥 {board.members?.length || 0}{" "}
                  {(board.members?.length || 0) === 1 ? "member" : "members"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation: user must type "delete" */}
      {deleteConfirmBoardId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeDeleteConfirm}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg text-gray-800 mb-1">Delete board?</h3>
            <p className="text-sm text-gray-500 mb-4">
              This cannot be undone. Type <strong>delete</strong> below to confirm.
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder='Type "delete" to confirm'
              className="w-full border-2 border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") deleteBoard();
                if (e.key === "Escape") closeDeleteConfirm();
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={closeDeleteConfirm}
                className="flex-1 py-2.5 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteBoard}
                disabled={deleteConfirmText.trim().toLowerCase() !== "delete"}
                className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Delete board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
