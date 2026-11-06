# Task Management System

A full-stack, real-time Kanban application built with React, Node.js, and TypeScript. This project features a robust event-driven architecture, mathematical drag-and-drop ordering, and role-based access control.

## Core Features

- **Authentication & RBAC:** Secure JWT-based authentication with Admin and User roles. Admins manage projects and invitations; Users manage tasks within assigned projects.
- **Real-Time Synchronization:** WebSockets (Socket.IO) ensure that task creation, updates, deletions, and reordering instantly sync across all active clients without page reloads.
- **Optimized Drag & Drop:** Utilizes LexoRank string mathematics for O(1) database updates during drag-and-drop operations, completely avoiding bulk index shifting.
- **Dynamic Views:** Toggle seamlessly between a Kanban Board view and a Data Table List view.
- **Task Metadata:** Support for task priority levels, due dates, and real-time search filtering.

## Tech Stack

**Frontend**
- React (Vite)
- TypeScript
- Tailwind CSS
- @hello-pangea/dnd (Drag and Drop)
- Socket.IO Client
- Axios

**Backend**
- Node.js & Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- JSON Web Tokens (JWT) & bcrypt

---

## Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (Local or Cloud instance like Neon/Supabase)

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 2. Environment Configuration

Create a `.env` file in the `server` directory:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
JWT_SECRET="your_super_secret_jwt_key_here"
```

Create a `.env` file in the `client` directory (if required by your Vite setup):
```env
VITE_API_URL="http://localhost:5000/api"
```

### 3. Backend Setup
Navigate to the server directory, install dependencies, and push the database schema:

```bash
cd server
npm install
npx prisma db push
npm run dev
```
The server will start on `http://localhost:5000`.

### 4. Frontend Setup
Open a new terminal window, navigate to the client directory, and start the Vite development server:

```bash
cd client
npm install
npm run dev
```
The client will start on `http://localhost:5173`.

---

## Architectural Highlights

### LexoRank Implementation
To handle task reordering at scale, this application avoids standard integer-based indexes. Instead, it generates lexicographical strings (LexoRank) for the `order` column. When a task is dropped between two others, the backend calculates the mathematical midpoint between the upper and lower strings. This ensures database updates remain O(1) regardless of the dataset size.

### Real-Time WebSockets
Socket.IO is implemented using a Room-based architecture. When a user connects to a specific project board, they join a socket room unique to that `projectId`. This prevents data leakage and ensures clients only receive updates relevant to their active viewport.

### AI Usage Disclosure
In accordance with the project guidelines, AI coding assistants were strictly limited to generating the Authentication, User Management, and Role-Based Access Control (RBAC) implementations. All core application logic, database schemas, Kanban physics, and WebSocket architectures were hand-coded.
