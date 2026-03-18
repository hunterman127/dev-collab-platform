const API_URL = import.meta.env.VITE_API_URL;

async function handleResponse(res) {
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned invalid response" };
  }
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse(res);
}

export async function registerUser(username, email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, email, password }),
  });

  return handleResponse(res);
}

export async function getCurrentUser(token) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res);
}

export async function getProjects(token) {
  const res = await fetch(`${API_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res);
}

export async function createProject(token, name, description, status, tech_stack, repo_url) {
  const res = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, description, status, tech_stack, repo_url }),
  });

  return handleResponse(res);
}

export async function getProjectMessages(token, projectId) {
  const res = await fetch(`${API_URL}/projects/${projectId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res);
}

export async function sendProjectMessage(token, projectId, content) {
  const res = await fetch(`${API_URL}/projects/${projectId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });

  return handleResponse(res);
}

export async function getProjectMembers(token, projectId) {
  const res = await fetch(`${API_URL}/projects/${projectId}/members`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res);
}

export async function deleteProject(token, projectId) {
  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res);
}

export async function getProjectTasks(token, projectId) {
  const res = await fetch(`http://localhost:3000/projects/${projectId}/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}

export async function createTask(token, projectId, taskData) {
  const res = await fetch(`http://localhost:3000/projects/${projectId}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(taskData),
  });

  return res.json();
}

export async function updateTaskStatus(token, projectId, taskId, status) {
  const res = await fetch(
    `http://localhost:3000/projects/${projectId}/tasks/${taskId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    }
  );

  return res.json();
}

export async function deleteTask(token, projectId, taskId) {
  const res = await fetch(
    `http://localhost:3000/projects/${projectId}/tasks/${taskId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.json();
}

export async function updateProject(token, projectId, data) {
  const res = await fetch(`http://localhost:3000/projects/${projectId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return res.json();
}