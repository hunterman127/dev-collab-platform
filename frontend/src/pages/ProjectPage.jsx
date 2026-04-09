import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectMessages, getProjectMembers, getProjectTasks, createTask, updateTaskStatus, deleteTask, updateProject, removeProjectMember } from "../api/api";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { sendInvite } from "../api/api";

const socket = io(import.meta.env.VITE_API_URL);

function ProjectPage({ token, user }) {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [project, setProject] = useState(null);
  const messagesEndRef = useRef(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editTechStack, setEditTechStack] = useState("");
  const [editRepoUrl, setEditRepoUrl] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const navigate = useNavigate();

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    const sameDay = date.toDateString() === now.toDateString();

    if (sameDay) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    if (!token) return;

    fetch(`${import.meta.env.VITE_API_URL}/projects/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setProject(data);
        setEditDescription(data.description || "");
        setEditStatus(data.status || "");
        setEditTechStack(data.tech_stack || "");
        setEditRepoUrl(data.repo_url || "");
      });
  }, [id, token]);

  useEffect(() => {
    if (!token) return;

    async function loadMessages() {
      const data = await getProjectMessages(token, id);

      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
        console.error("messages error:", data);
      }
    }

    loadMessages();

    socket.on("connect", () => {
      socket.emit("join_project", Number(id));
    });

    function handleNewMessage(message) {
      if (String(message.project_id) === String(id)) {
        setMessages((prev) => [...prev, message]);
      }
    }

    socket.on("new_message", handleNewMessage);

    if (socket.connected) {
      socket.emit("join_project", Number(id));
    }

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("connect");
    };
  }, [token, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token) return;

    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const data = await getProjectMembers(token, id);
        setMembers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load members:", err);
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
  }, [token, id]);

  useEffect(() => {
    if (!token) return;

    const fetchTasks = async () => {
      try {
        setTasksLoading(true);
        const data = await getProjectTasks(token, id);
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load tasks:", err);
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [token, id]);

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;

    try {
      setCreatingTask(true);

      const newTask = await createTask(token, id, {
        title: taskTitle,
        description: taskDescription,
        status: "backlog",
        assigned_to: assignedTo || null,
      });

      if (newTask && !newTask.error) {
        const refreshedTasks = await getProjectTasks(token, id);
        setTasks(Array.isArray(refreshedTasks) ? refreshedTasks : []);

        setTaskTitle("");
        setTaskDescription("");
        setAssignedTo("");
      } else {
        console.error("task creation failed:", newTask?.error);
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreatingTask(false);
    }
  }

  function handleSendMessage() {
    if (!content.trim()) return;
    if (!user) return;

    socket.emit("send_message", {
      projectId: Number(id),
      senderId: user.id,
      content,
    });

    setContent("");
  }

  async function handleMoveTask(taskId, newStatus) {
    try {
      const updatedTask = await updateTaskStatus(token, id, taskId, newStatus);

      if (updatedTask && !updatedTask.error) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: updatedTask.status } : task
          )
        );
      } else {
        console.error("Failed to update task:", updatedTask?.error);
      }
    } catch (err) {
      console.error("Failed to move task:", err);
    }
  }

  async function handleDeleteTask(taskId) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;

    try {
      const result = await deleteTask(token, id, taskId);

      if (!result.error) {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
      } else {
        console.error("Failed to delete task:", result.error);
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  }

  async function handleSaveProject() {
    try {
      const updated = await updateProject(token, id, {
        description: editDescription,
        status: editStatus,
        tech_stack: editTechStack,
        repo_url: editRepoUrl,
      });

      if (updated && !updated.error) {
        setProject(updated);
        setEditingProject(false);
      } else {
        console.error("Failed to update project:", updated?.error);
      }
    } catch (err) {
      console.error("Failed to update project:", err);
    }
  }

  async function handleInvite() {
    if (!inviteUsername.trim()) return;

    try {
      const res = await sendInvite(id, inviteUsername, token);

      if (!res.error) {
        alert(res.message || "Invite sent");
        setInviteUsername("");
      } else {
        alert(res.error);
      }
    } catch (err) {
      console.error("invite failed:", err);
      alert("Failed to send invite");
    }
  }

  async function handleRemoveMember(memberId) {
  try {
    const result = await removeProjectMember(token, id, memberId);

    if (result.error) {
      alert(result.error);
      return;
    }

    setMembers((prev) => prev.filter((member) => member.id !== memberId));
  } catch (err) {
    console.error("remove member failed:", err);
    alert("Failed to remove member");
  }
}

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const isOwner =
    members.some(
      (member) =>
        String(member.id) === String(currentUser.id) && member.role?.toLowerCase() === "owner"
    ) || false;

  const backlogTasks = tasks.filter((task) => task.status === "backlog");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const doneTasks = tasks.filter((task) => task.status === "done");

  if (!token || !user) {
    return <div>Loading workspace...</div>;
  }

  return (
    <div style={{ display: "flex", height: "100vh", padding: "20px", boxSizing: "border-box", gap: "20px" }}>
      {/* MEMBERS SIDEBAR */}
      <div
        style={{
          width: "240px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "12px",
          backgroundColor: "#fafafa",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3>Members</h3>

        {isOwner && (
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Enter username"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            <button onClick={handleInvite}>Add Member</button>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            maxHeight: "500px",
            borderTop: "1px solid #ddd",
            paddingTop: "8px",
          }}
        >
          {membersLoading ? (
            <p>Loading...</p>
          ) : members.length === 0 ? (
            <p>No members in this project yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "8px",
                    backgroundColor: "#fff",
                  }}
                >
                  <div>
                    {member.username} {member.role ? `(${member.role})` : ""}
                  </div>

                  {isOwner && member.role?.toLowerCase() !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      style={{ marginTop: "8px" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TASKS SECTION */}
      <div
        style={{
          flex: 1.2,
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <h3>Tasks</h3>

        <div style={{ marginBottom: "12px" }}>
          <input
            placeholder="Task title"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            style={{ display: "block", marginBottom: "8px", width: "100%" }}
          />

          <input
            placeholder="Task description"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            style={{ display: "block", marginBottom: "8px", width: "100%" }}
          />

          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            style={{ display: "block", marginBottom: "8px", width: "100%" }}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.username}
              </option>
            ))}
          </select>

          <button onClick={handleCreateTask} disabled={creatingTask}>
            {creatingTask ? "Creating..." : "Add Task"}
          </button>
        </div>

        {tasksLoading ? (
          <p>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p>No tasks yet. Create the first task for this project.</p>
        ) : (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowX: "auto",
              overflowY: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 300px)",
                gap: "12px",
                alignItems: "stretch",
                minWidth: "936px",
                height: "100%",
              }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "10px",
                  backgroundColor: "#fafafa",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  minHeight: 0,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <h4>Backlog</h4>
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {backlogTasks.length === 0 ? (
                    <p>No backlog tasks</p>
                  ) : (
                    backlogTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          padding: "8px",
                          marginBottom: "8px",
                          backgroundColor: "#f4f4f4",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <div style={{ fontWeight: "bold" }}>{task.title}</div>
                        <div>{task.description}</div>

                        {task.assigned_username && (
                          <div style={{ fontSize: "12px", color: "gray" }}>
                            Assigned to: {task.assigned_username}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button onClick={() => handleMoveTask(task.id, "in_progress")}>
                            Move to In Progress
                          </button>

                          {isOwner && (
                            <button onClick={() => handleDeleteTask(task.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "10px",
                  backgroundColor: "#fafafa",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  minHeight: 0,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <h4>In Progress</h4>
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {inProgressTasks.length === 0 ? (
                    <p>No in-progress tasks</p>
                  ) : (
                    inProgressTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          padding: "8px",
                          marginBottom: "8px",
                          backgroundColor: "#f4f4f4",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <div style={{ fontWeight: "bold" }}>{task.title}</div>
                        <div>{task.description}</div>

                        {task.assigned_username && (
                          <div style={{ fontSize: "12px", color: "gray" }}>
                            Assigned to: {task.assigned_username}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button onClick={() => handleMoveTask(task.id, "backlog")}>
                            Move to Backlog
                          </button>

                          <button onClick={() => handleMoveTask(task.id, "done")}>
                            Move to Done
                          </button>

                          {isOwner && (
                            <button onClick={() => handleDeleteTask(task.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "10px",
                  backgroundColor: "#fafafa",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  minHeight: 0,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <h4>Done</h4>
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {doneTasks.length === 0 ? (
                    <p>No completed tasks</p>
                  ) : (
                    doneTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          padding: "8px",
                          marginBottom: "8px",
                          backgroundColor: "#f4f4f4",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <div style={{ fontWeight: "bold" }}>{task.title}</div>
                        <div>{task.description}</div>

                        {task.assigned_username && (
                          <div style={{ fontSize: "12px", color: "gray" }}>
                            Assigned to: {task.assigned_username}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: "8px",
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button onClick={() => handleMoveTask(task.id, "in_progress")}>
                            Move Back to In Progress
                          </button>

                          {isOwner && (
                            <button onClick={() => handleDeleteTask(task.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}  
      </div>      

      {/* CHAT SECTION */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid #ccc", borderRadius: "8px", padding: "12px", backgroundColor: "#fff" }}>
        <button onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </button>

        {/* PROJECT INFO */}
        {project ? (
          <div style={{ marginBottom: "16px" }}>
            <h2>{project.name}</h2>

            {isOwner && editingProject ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  placeholder="Description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />

                <input
                  placeholder="Status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                />

                <input
                  placeholder="Tech Stack"
                  value={editTechStack}
                  onChange={(e) => setEditTechStack(e.target.value)}
                />

                <input
                  placeholder="Repository URL"
                  value={editRepoUrl}
                  onChange={(e) => setEditRepoUrl(e.target.value)}
                />
              </div>
            ) : (
              <>
                <p>{project.description}</p>

                <p>
                  <strong>Status:</strong> {project.status}
                </p>

                <p>
                  <strong>Tech Stack:</strong> {project.tech_stack}
                </p>

                {project.repo_url && (
                  <p>
                    <strong>Repo:</strong>{" "}
                    <a href={project.repo_url} target="_blank" rel="noreferrer">
                      {project.repo_url}
                    </a>
                  </p>
                )}
              </>
            )}

            {isOwner && (
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                {isOwner && editingProject ? (
                  <>
                    <button onClick={handleSaveProject}>Save</button>
                    <button
                      onClick={() => {
                        setEditDescription(project.description || "");
                        setEditStatus(project.status || "");
                        setEditTechStack(project.tech_stack || "");
                        setEditRepoUrl(project.repo_url || "");
                        setEditingProject(false);
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditingProject(true)}>Edit Project</button>
                )}
              </div>
            )}
          </div>
        ) : (
          <h2>Loading project workspace...</h2>
        )}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: "12px",
          }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "10px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                {message.username || message.sender_id}
              </div>

              <div style={{ marginBottom: "6px" }}>{message.content}</div>

              <div style={{ fontSize: "12px", color: "gray" }}>
                {formatTimestamp(message.sent_at)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>

        <input
          placeholder="Type a message"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}
export default ProjectPage;