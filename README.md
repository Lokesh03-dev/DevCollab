# 🚀 DevCollab

### Real-Time Developer Collaboration Platform

DevCollab is a full-stack platform that brings **project management, task tracking, team communication, and collaborative coding** into one workspace.

Developers can create projects, invite team members, manage tasks, collaborate on code in real time, and track project activity.

---

## ✨ Features

* 🔐 **JWT Authentication** — Secure login and protected routes
* 📁 **Project Management** — Create and manage development projects
* 👥 **Team Collaboration** — Invite and manage project members
* ✅ **Task Management** — Assign, track, and manage tasks
* 📅 **Project Calendar** — Track project timelines and deadlines
* 💻 **Collaborative Code Editor** — Real-time code editing with Monaco Editor
* 💬 **Real-Time Chat** — Project-based communication using Socket.IO
* 🔔 **Notifications** — Real-time collaboration updates
* 🐙 **GitHub Integration** — Connect projects with GitHub repositories
* 📊 **Activity Tracking** — Monitor project activities

---

## 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │      USER        │
                         │    Browser       │
                         └────────┬─────────┘
                                  │
                           HTTP / WebSocket
                                  │
                 ┌────────────────▼────────────────┐
                 │        React + Tailwind         │
                 │                                │
                 │ Dashboard • Projects • Tasks   │
                 │ Calendar • Chat • Code Editor  │
                 └────────────────┬────────────────┘
                                  │
                         REST API / Socket.IO
                                  │
                 ┌────────────────▼────────────────┐
                 │       Node.js + Express        │
                 │                                │
                 │ Auth • Projects • Tasks        │
                 │ Chat • Notifications           │
                 │ Collaborative Editor           │
                 └───────────────┬────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
             ┌──────▼──────┐          ┌──────▼──────┐
             │   MongoDB   │          │  GitHub API │
             │             │          │             │
             │ Users       │          │ Repositories│
             │ Projects    │          │ Commits     │
             │ Tasks       │          │ Issues      │
             │ Messages    │          └─────────────┘
             │ Code Files  │
             └─────────────┘
```

---

## 🛠️ Tech Stack

**Frontend**
`React` `Vite` `Tailwind CSS` `Monaco Editor` `Axios`

**Backend**
`Node.js` `Express.js` `Socket.IO` `JWT` `bcrypt`

**Database**
`MongoDB` `Mongoose`

**Integration**
`GitHub REST API`

---

## 🔄 Real-Time Collaboration

```text
Developer A
     │
     ▼
Monaco Editor
     │
     ▼
  Socket.IO
     │
     ▼
 Node.js Server
     │
     ├──────────────┐
     ▼              ▼
Developer B     Developer C
```

Code changes and chat messages are synchronized between project members in real time.

---

## 📂 Project Structure

```text
DevCollab/
├── client/          # React frontend
│   ├── components/
│   ├── pages/
│   ├── context/
│   └── services/
│
├── server/          # Node.js backend
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── sockets/
│
└── README.md
```

---

## 🚀 Getting Started

```bash
git clone <repository-url>
cd DevCollab

# Frontend
cd client
npm install
npm run dev

# Backend
cd server
npm install
npm run dev
```

Configure your `.env` with MongoDB, JWT, GitHub, and frontend URL settings.

---

## 🎯 Goal

> **One workspace for developers to plan, communicate, and build together.**

---

### 👩‍💻 Author

**Lokesht**
- 💼 [LinkedIn](https://www.linkedin.com/in/lokesh-vats-843092321/)
- 🐙 [GitHub](https://github.com/Lokesh03-dev)
- 📸 [Instagram](https://www.instagram.com/lokesh_vats/)
- 📧 [rvats3639@gmail.com](mailto:rvats3639@gmail.com)
