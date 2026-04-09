import { useEffect, useState } from "react";
import {
  getProjects,
  createProject,
  deleteProject,
  leaveProject,
  getInvites,
  acceptInvite,
  declineInvite,
} from "../api/api";
import { useNavigate } from "react-router-dom";

function Dashboard({ token, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const [techStack, setTechStack] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [invites, setInvites] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  console.log("DASHBOARD NEW BUILD LOADED");

  useEffect(() => {
    if (token) {
      loadProjects();
      loadInvites();
    }
  }, [token]);

  async function loadProjects() {
    if (!token) return;

    setLoadingProjects(true);
    setProjectsError("");

    const data = await getProjects(token);

    if (Array.isArray(data)) {
      setProjects(data);
    } else {
      setProjects([]);
      setProjectsError(data?.error || "Failed to load projects");
    }

    setLoadingProjects(false);
  }

  async function loadInvites() {
    if (!token) return;

    try {
      const data = await getInvites(token);

      if (Array.isArray(data)) {
        setInvites(data);
      } else {
        setInvites([]);
        console.error("failed to load invites:", data?.error || "Failed to load invites");
      }
    } catch (err) {
      console.error("failed to load invites:", err);
      setInvites([]);
    }
  }

  async function handleCreateProject() {
    if (!name.trim()) return;

    setCreatingProject(true);
    setProjectsError("");

    try {
      const project = await createProject(
        token,
        name,
        description,
        "active",
        techStack,
        repoUrl
      );

      if (project && !project.error) {
        setProjects((prev) => [...prev, project]);
        setName("");
        setDescription("");
        setTechStack("");
        setRepoUrl("");
      } else {
        setProjectsError(project?.error || "Failed to create project");
      }
    } catch (err) {
      console.error("create project failed:", err);
      setProjectsError("Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  }

  async function handleDeleteProject(projectId) {
    const confirmed = window.confirm("Delete this project?");
    if (!confirmed) return;

    const result = await deleteProject(token, projectId);

    if (!result.error) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } else {
      setProjectsError(result.error);
    }
  }

  async function handleLeaveProject(projectId) {
    const confirmed = window.confirm("Leave this project?");
    if (!confirmed) return;

    const result = await leaveProject(token, projectId);

    if (!result.error) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } else {
      setProjectsError(result.error);
    }
  }

  async function handleAccept(inviteId) {
    const data = await acceptInvite(inviteId, token);

    if (!data.error) {
      await loadInvites();
      await loadProjects();
    } else {
      console.error("accept failed:", data.error);
    }
  }

  async function handleDecline(inviteId) {
    const data = await declineInvite(inviteId, token);

    if (!data.error) {
      await loadInvites();
    } else {
      console.error("decline failed:", data.error);
    }
  }

console.log("currentUser:", currentUser);
console.log("projects:", projects);

  return (
    <div>
      <button onClick={onLogout}>Logout</button>

      <div style={{ marginBottom: "20px" }}>
        <h2>Invites</h2>

        {!Array.isArray(invites) || invites.length === 0 ? (
          <p>No pending invites</p>
        ) : (
          invites.map((invite) => (
            <div key={invite.id} style={{ marginBottom: "10px" }}>
              <p>
                {invite.sender_username} invited you to join{" "}
                <strong>{invite.project_name}</strong>
              </p>
              <button onClick={() => handleAccept(invite.id)}>Accept</button>
              <button onClick={() => handleDecline(invite.id)}>Decline</button>
            </div>
          ))
        )}
      </div>

      <h2>Your Projects</h2>

      <h3>Create Project</h3>

      <input
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        placeholder="Tech Stack (React, Node, PostgreSQL)"
        value={techStack}
        onChange={(e) => setTechStack(e.target.value)}
      />

      <input
        placeholder="Repository URL (GitHub link)"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
      />

      <button onClick={handleCreateProject} disabled={creatingProject}>
        {creatingProject ? "Creating..." : "Create"}
      </button>

      {projectsError && <p style={{ color: "red" }}>{projectsError}</p>}

      {loadingProjects ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p>No projects yet. Create your first project workspace.</p>
      ) : null}

      {projects.map((project) => {
        console.log("owner check:", {
          projectId: project.id,
          ownerId: project.owner_id,
          currentUserId: currentUser?.id,
        });

        return (
          <div
            key={project.id}
            onClick={() => navigate(`/project/${project.id}`)}
            style={{
              cursor: "pointer",
              border: "1px solid gray",
              margin: "10px",
              padding: "10px",
            }}
          >
            <h3>{project.name}</h3>

            <p>{project.description}</p>
            <p><strong>Status:</strong> {project.status}</p>
            <p><strong>Tech Stack:</strong> {project.tech_stack}</p>
            <p><strong>Repo:</strong> {project.repo_url}</p>
            <p><strong>Owner ID:</strong> {project.owner_id}</p>

            {Number(project.owner_id) === Number(currentUser?.id) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
                }}
              >
                Delete
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeaveProject(project.id);
                }}
              >
                Leave Project
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Dashboard;