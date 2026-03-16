A full-stack SaaS-style developer collaboration platform built with React, Express, PostgreSQL, JWT authentication, and Socket.IO. Users can register, log in, create projects, manage project membership, and communicate through real-time project chat.

Auth
- Register new user
- Reject duplicate email
- Login valid user
- Reject bad login
- Logout

Dashboard
- Load projects
- Create project
- Delete project

Project page
- Open project
- Load members
- Load messages
- Send message
- Refresh page

- ## Architecture

Frontend (React + Vite)
    |
    | HTTP requests (Fetch API)
    v
Backend (Express API)
    |
    | PostgreSQL queries
    v
Database (PostgreSQL)

Realtime Messaging:
Frontend (Socket.IO client)
        ↔
Backend (Socket.IO server)

- ##Screenshots

- ### Dashboard
- <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/5f566696-e267-41fa-9acf-4f7021a76e23" />

-### Project Chat
- <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/bac723cf-266f-4d2b-80c0-9a281b326e69" />

