import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import { ArrowLeft, Plus } from "lucide-react";

export default function Taskmanager() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const navigate = useNavigate();
  const { boardId } = useParams();  

   
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setTasks([]);
        setLoading(false);
        navigate("/loginuser");
        return;
      }
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // Load user boards
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "boards"), where("userId", "==", user.uid));
    const unsubscribeBoards = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBoards(data);
    });

    return () => unsubscribeBoards();
  }, [user]);

  // Load tasks for current board
  useEffect(() => {
    if (!user || !boardId) return;

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      where("boardId", "==", boardId)
    );

    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribeTasks();
  }, [user, boardId]);

  const addTask = async () => {
    if (!taskText.trim()) return;

    await addDoc(collection(db, "tasks"), {
      text: taskText,
      status: "todo",
      userId: user.uid,
      boardId: boardId,
      createdAt: Date.now(),
    });

    setTaskText("");
  };

  const updateStatus = async (taskId, newStatus) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { status: newStatus });
  };

  const removeTask = async (taskId) => {
    await deleteDoc(doc(db, "tasks", taskId));
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;
  if (!user) return null;

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  return ( 
    <div className=" ">
      <div className="flex w-full items-center h-20 justify-between shadow-md mb-8 px-5">
        <div className="flex items-center gap-3">
        <p
  onClick={() => navigate("/home")} // <-- navigate to Home on click
  className="font-medium text-gray-400 flex items-center gap-1 hover:text-gray-600 cursor-pointer"
>
  <ArrowLeft className="w-4 h-4" />
  Boards
</p>

          <b className="text-gray-300">|</b>
          <span className="font-semibold">{boards.find(b => b.id === boardId)?.name}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <TaskColumn
          title="Todo"
          tasks={todoTasks}
          taskText={taskText}
          setTaskText={setTaskText}
          onAdd={addTask}
          actionLabel="Start Task"
          onAction={(task) => updateStatus(task.id, "progress")}
        />

        <TaskColumn
          title="In Progress"
          tasks={inProgressTasks}
          actionLabel="Done"
          onAction={(task) => updateStatus(task.id, "done")}
        />

        <TaskColumn
          title="Done"
          tasks={doneTasks}
          actionLabel="Remove"
          onAction={(task) => removeTask(task.id)}
        />
      </div>
    </div>
  );
}

function TaskColumn({ title, tasks, taskText, setTaskText, onAdd, actionLabel, onAction }) {
  return (
    <div className="w-full md:min-w-70 border rounded-xl shadow-sm bg-white flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-700">{title}</h2>
      </div>

      {onAdd && title === "Todo" && (
        <div className="p-3 flex gap-2">
          <input
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="New task..."
            className="border px-2 py-1 rounded-md w-full text-sm"
          />
          <button
            onClick={onAdd}
            className="bg-blue-600 text-white px-2 rounded-md"
          >
            <Plus size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No tasks</p>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className="border rounded-md p-2 text-sm bg-gray-50 flex justify-between items-center"
            >
              <span>{task.text}</span>
              {onAction && (
                <button
                  onClick={() => onAction(task)}
                  className={`text-xs px-2 py-1 rounded ${
                    title === "Done"
                      ? "bg-red-600 text-white"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {actionLabel}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
