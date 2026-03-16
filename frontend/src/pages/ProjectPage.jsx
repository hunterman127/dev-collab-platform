import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectMessages, getProjectMembers } from "../api/api";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

const socket = io("http://localhost:3000");

function ProjectPage({ token, user }) {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [project, setProject] = useState(null);
  const messagesEndRef = useRef(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
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

    fetch(`http://localhost:3000/projects/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setProject(data);
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

  if (!token || !user) {
    return <div>Loading user...</div>;
  }

  return (
    <div style={{ display: "flex", gap: "20px" }}>
        
        {/* MEMBERS SIDEBAR */}
        <div style={{ width: "200px" }}>
          <h3>Members</h3>

          {membersLoading ? (
            <p>Loading...</p>
          ) : members.length === 0 ? (
            <p>No members</p>
          ) : (
            <ul>
              {members.map((member) => (
                <li key={member.id}>{member.username}</li>
              ))}
            </ul>
          )}
        </div>  

        {/* CHAT SECTION */}
        <div style={{ flex: 1 }}>
          <button onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
          <h2>{project ? project.name : "Loading project..."}</h2>

            <div
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "12px",
                minHeight: "300px",
                maxHeight: "500px",
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

                  <div style={{ marginBottom: "6px" }}>
                    {message.content}
                  </div>

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