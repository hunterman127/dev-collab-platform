import { useEffect, useState } from "react";
import { getProjects, createProject, deleteProject } from "../api/api";
import { useNavigate } from "react-router-dom";

function Dashboard({ token, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  async function handleCreateProject() {
    if (!name.trim()) return;

    

    setCreatingProject(true);
    setProjectsError("");

    try {
      const project = await createProject(token, name, description, "active");

      if (project && !project.error) {
        setProjects((prev) => [...prev, project]);
        setName("");
        setDescription("");
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

  useEffect(() => {
    async function loadProjects() {
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

    if (token) {
      loadProjects();
    }
  }, [token]);

  return (
    <div>
      <button onClick={onLogout}>Logout</button>

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

      <button onClick={handleCreateProject} disabled={creatingProject}>
        {creatingProject ? "Creating..." : "Create"}
      </button>
      {projectsError && <p style={{ color: "red" }}>{projectsError}</p>}

      {loadingProjects ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p>No projects yet</p>
      ) : null}

      {projects.map((project) => (
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProject(project.id);
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;