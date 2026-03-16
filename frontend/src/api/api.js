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

export async function createProject(token, name, description, status) {
  const res = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, description, status }),
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