import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

export default function Home() {
  const [openProfile, setOpenProfile] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [members, setMembers] = useState("");
  const [boards, setBoards] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpenProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth listener + load boards
  useEffect(() => {
    let unsubscribeBoards = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setBoards([]);
        setLoading(false);
        if (unsubscribeBoards) unsubscribeBoards();
        return;
      }

      const q = query(collection(db, "boards"), where("userId", "==", currentUser.uid));
      unsubscribeBoards = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBoards(data);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeBoards) unsubscribeBoards();
    };
  }, []);

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
  if (!user) return <p className="text-center mt-10 text-gray-500">You are logged out.</p>;

  return (
    <div>
      <div className="flex w-full items-center h-20 justify-between gap-2 shadow-md mb-5 px-5">
        <div className="flex items-center gap-3">
          <img className="h-20 w-auto" src="/collabwiselogo.png" alt="logo" />
          <h1 className="text-lg md:text-lg lg:text-3xl font-bold">CollabWise</h1>
        </div>
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setOpenProfile(!openProfile)}
            className="border px-4 py-1 rounded-lg"
          >
            Profile
          </button>
          {openProfile && (
            <div className="absolute right-0 mt-2 w-64 max-h-60 overflow-y-auto border bg-white shadow-lg rounded-lg z-50">
              <div className="p-3 border-b">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium break-all">{user.email}</p>
              </div>
              <div className="p-3 space-y-2">
                <button className="w-full text-left text-sm hover:bg-gray-100 p-2 rounded">
                  Account settings
                </button>
                <button className="w-full text-left text-sm hover:bg-gray-100 p-2 rounded">
                  My boards
                </button>
                <button
                  onClick={async () => {
                    await auth.signOut();
                    navigate("/loginuser");
                  }}
                  className="w-full text-left text-sm text-red-600 hover:bg-red-50 p-2 rounded"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>




<div className="flex">
      <button
        onClick={() => setShowInput(!showInput)}
        className="bg-blue-600 m-5 px-5 py-2 h-10 text-xl text-white rounded"
      >
        {showInput ? "Close Board Form" : "Create Board"}
      </button>


      {showInput && (
        <div className="m-5 flex gap-3 flex-col w-fit">
          <input
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Board name"
            className="border px-3 py-2 rounded w-64"
          />
          <input
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            placeholder="Members"
            className="border px-3 py-2 rounded w-64"
          />
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      )}
      </div>

      {boards.length === 0 ? (
        <p className="m-5 text-gray-400 italic">No boards yet</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 m-5">

          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => navigate(`/taskmanager/${board.id}`)}
              className="relative w-[80%] border p-4 rounded shadow flex flex-col gap-2 cursor-pointer hover:bg-gray-50"
            >
              <span className="font-medium text-2xl">{board.name}</span>
              <span className="text-gray-400 text-sm">• {board.members} members</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent click navigating to taskmanager
                  deleteBoard(board.id);
                }}
                className="absolute top-2 right-2 text-red-500"
              >
                ❌
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
