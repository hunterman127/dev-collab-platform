# Developer Collaboration Platform

This is a full-stack web application for small software teams that need a simple place to manage projects and communicate in real time. Users can register, log in, create projects, add collaborators, and chat inside project-specific workspaces. The goal of the platform is to combine project membership, metadata, and communication into one focused tool for side projects, hackathons, and small dev teams. The system is being designed as a clean monolith with a React frontend, Express backend, PostgreSQL database, and WebSocket-based real-time chat. It is meant to demonstrate practical engineering skills such as authentication, API design, relational schema design, real-time messaging, Dockerization, and cloud deployment. Version 1 will focus only on core collaboration features and avoid unnecessary scope like file storage, video chat, or AI features.

## MVP Features

- User registration and login
- Create and view projects
- Add collaborators to projects
- View projects a user belongs to
- Real-time project chat
- Persistent message history