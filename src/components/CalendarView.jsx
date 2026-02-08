import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { Calendar as CalendarIcon, X, Plus, Trash2, Edit2, Save } from "lucide-react";

export default function CalendarView({ user, onBoardClick }) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [targets, setTargets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [targetDate, setTargetDate] = useState(null);
  const [targetText, setTargetText] = useState("");
  const [editingTarget, setEditingTarget] = useState(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "boards"), where("userId", "==", user.uid));
    const unsubscribeBoards = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBoards(data);
    });

    return () => unsubscribeBoards();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribeTasks();
  }, [user]);

  // Load calendar targets
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "calendarTargets"), where("userId", "==", user.uid));
    const unsubscribeTargets = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTargets(data);
    });

    return () => unsubscribeTargets();
  }, [user]);

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;

  // Get tasks for selected date (simplified - you can enhance this with actual date filtering)
  const tasksForDate = tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return taskDate.toDateString() === selectedDate.toDateString();
  });

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(selectedDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + direction, 1));
  };

  const getTasksForDay = (date) => {
    if (!date) return [];
    return tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const getTargetsForDay = (date) => {
    if (!date) return [];
    // Normalize date to YYYY-MM-DD format (local time, not UTC)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return targets.filter(target => {
      // If target.date is already a string in YYYY-MM-DD format, use it directly
      // Otherwise, parse it
      const targetDateStr = typeof target.date === 'string' 
        ? target.date 
        : new Date(target.date).toISOString().split('T')[0];
      return targetDateStr === dateStr;
    });
  };

  const handleDateClick = (date, target = null) => {
    if (!date) return;
    setTargetDate(date);
    setSelectedDate(date);
    if (target) {
      // Edit existing target
      setEditingTarget(target);
      setEditingText(target.text);
      setTargetText("");
    } else {
      // Add new target
      setEditingTarget(null);
      setEditingText("");
      setTargetText("");
    }
    setShowModal(true);
  };

  const handleSaveTarget = async () => {
    const textToSave = editingTarget ? editingText : targetText;
    if (!textToSave.trim() || !targetDate) return;

    try {
      // Normalize date to YYYY-MM-DD format (local time, not UTC)
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (editingTarget) {
        // Update existing target
        const targetRef = doc(db, "calendarTargets", editingTarget.id);
        await updateDoc(targetRef, {
          text: textToSave.trim()
        });
      } else {
        // Create new target
        await addDoc(collection(db, "calendarTargets"), {
          text: textToSave.trim(),
          date: dateStr,
          userId: user.uid,
          createdAt: Date.now()
        });
      }
      setTargetText("");
      setEditingText("");
      setEditingTarget(null);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save target");
    }
  };

  const handleDeleteTarget = async (targetId) => {
    try {
      await deleteDoc(doc(db, "calendarTargets", targetId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete target");
    }
  };

  const getTargetsForSelectedDate = () => {
    if (!selectedDate) return [];
    // Normalize date to YYYY-MM-DD format (local time, not UTC)
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return targets.filter(target => {
      // If target.date is already a string in YYYY-MM-DD format, use it directly
      const targetDateStr = typeof target.date === 'string' 
        ? target.date 
        : new Date(target.date).toISOString().split('T')[0];
      return targetDateStr === dateStr;
    });
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6">
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigateMonth(-1)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors font-medium text-sm"
            >
              ← Prev
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border-2 border-blue-500 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-colors font-medium text-sm"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 py-2 text-xs sm:text-sm">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.substring(0, 1)}</span>
            </div>
          ))}
          {days.map((date, idx) => {
            const dayTasks = getTasksForDay(date);
            const dayTargets = getTargetsForDay(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            const isSelected = date && date.toDateString() === selectedDate.toDateString();
            return (
              <div
                key={idx}
                className={`min-h-16 sm:min-h-24 border-2 rounded-lg p-1 sm:p-2 transition-all ${
                  date ? "bg-white hover:bg-gray-50 cursor-pointer hover:shadow-md" : "bg-gray-50"
                } ${isToday ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"} ${isSelected ? "ring-2 ring-purple-500" : ""}`}
                onClick={() => handleDateClick(date)}
              >
                {date && (
                  <>
                    <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? "text-blue-600 font-bold" : "text-gray-700"} ${isSelected ? "text-purple-600" : ""}`}>
                      {date.getDate()}
                    </div>
                    {dayTargets.length > 0 && (
                      <div className="mb-1 space-y-1">
                        {dayTargets.map((target) => (
                          <div
                            key={target.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDateClick(date, target);
                            }}
                            className="bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 text-xs cursor-pointer hover:bg-purple-200 transition-colors group relative"
                            title={target.text}
                          >
                            <div className="flex items-center gap-1">
                              <span>🎯</span>
                              <span className="truncate flex-1">{target.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {dayTasks.length > 0 && (
                      <div className="space-y-1">
                        {dayTasks.slice(0, dayTargets.length > 0 ? 1 : 2).map(task => (
                          <div
                            key={task.id}
                            className={`text-xs p-1 rounded truncate ${
                              task.status === "done"
                                ? "bg-green-100 text-green-700"
                                : task.status === "progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                            title={task.text}
                          >
                            {task.text}
                          </div>
                        ))}
                        {dayTasks.length > (dayTargets.length > 0 ? 1 : 2) && (
                          <div className="text-xs text-gray-500">
                            +{dayTasks.length - (dayTargets.length > 0 ? 1 : 2)} more
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Tasks and Targets */}
      {(tasksForDate.length > 0 || getTargetsForSelectedDate().length > 0) && (
        <div className="mt-4 sm:mt-6 bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 shadow-md">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">
            {selectedDate.toLocaleDateString()}
          </h3>
          
          {/* Targets Section */}
          {getTargetsForSelectedDate().length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold mb-3 text-purple-700">🎯 Targets</h4>
              <div className="space-y-2">
                {getTargetsForSelectedDate().map(target => (
                  <div
                    key={target.id}
                    className="border-2 border-purple-200 rounded-lg p-3 bg-purple-50 flex justify-between items-start gap-2 hover:bg-purple-100 transition-colors"
                  >
                    <p className="font-medium text-purple-900 flex-1">{target.text}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDateClick(selectedDate, target)}
                        className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="Edit target"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this target?")) {
                            await handleDeleteTarget(target.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete target"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Section */}
          {tasksForDate.length > 0 && (
            <div>
              <h4 className="text-md font-semibold mb-3 text-gray-700">Tasks</h4>
              <div className="space-y-2">
                {tasksForDate.map(task => {
                  const board = boards.find(b => b.id === task.boardId);
                  return (
                    <div
                      key={task.id}
                      className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onBoardClick(task.boardId, board?.name)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{task.text}</p>
                          <p className="text-sm text-gray-500">{board?.name}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            task.status === "done"
                              ? "bg-green-100 text-green-700"
                              : task.status === "progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for Adding/Editing Target */}
      {showModal && (
        <div  
          className="fixed inset-0 z-50 p-4
               flex items-center justify-center
               bg-black/30
               backdrop-blur-md
               supports-[backdrop-filter]:bg-black/20"
  >
          <div className="bg-white rounded-xl p-5 sm:p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                {editingTarget ? "Edit Target" : "Add Target"} for {targetDate?.toLocaleDateString()}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setTargetText("");
                  setEditingText("");
                  setEditingTarget(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target / Goal
              </label>
              <textarea
                value={editingTarget ? editingText : targetText}
                onChange={(e) => editingTarget ? setEditingText(e.target.value) : setTargetText(e.target.value)}
                placeholder="Enter your target or goal for this date..."
                className="w-full border-2 border-gray-300 rounded-lg p-3 h-24 resize-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                autoFocus
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              {editingTarget && (
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete this target?")) {
                      await handleDeleteTarget(editingTarget.id);
                      setShowModal(false);
                      setEditingTarget(null);
                      setEditingText("");
                    }
                  }}
                  className="px-4 py-2.5 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => {
                  setShowModal(false);
                  setTargetText("");
                  setEditingText("");
                  setEditingTarget(null);
                }}
                className="px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTarget}
                disabled={!(editingTarget ? editingText.trim() : targetText.trim())}
                className={`px-4 py-2.5 rounded-lg text-white font-medium transition-colors flex items-center gap-2 ${
                  (editingTarget ? editingText.trim() : targetText.trim())
                    ? "bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {editingTarget ? <><Edit2 size={16} /> Update</> : <><Save size={16} /> Save Target</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
