# Fi-Notes

A full-stack, containerized note-taking application visually inspired by Google Keep. Fi-Notes allows you to create, manage, share, and organize your daily thoughts efficiently. 

## Features

- **User Authentication**: Secure sign-up and login using JWT.
- **Rich Dashboard**: A sleek, responsive sidebar-driven user interface built with Tailwind CSS.
- **Labels & Organization**: Create custom labels and tag notes to keep everything organized. 
- **Trash & Soft-Delete**: Accidentally deleted something? Notes go to the Trash first, where they can be either restored or permanently deleted.
- **Collaborative Sharing**: Share specific notes with other registered users on the platform.
- **Fully Containerized**: Runs seamlessly on any machine using Docker and Docker Compose.

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide React (Icons).
- **Backend**: Node.js, Express.js.
- **Database Architecture**: PostgreSQL managed with Prisma ORM.
- **Infrastructure**: Docker & Docker Compose.

---

## Getting Started (via Docker)

You don't need to manually install Node.js or PostgreSQL on your computer to run this! The entire stack runs inside Docker.

### 1. Prerequisites
Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine.

### 2. Set up Environment Variables
Create the required environment files for both the backend and frontend.

**Inside `backend/.env`**:
Create a `.env` file in the `backend/` folder and add your database credentials and a secure secret for JWT. Because we use Docker, the database host is simply `postgres`:
```env
DATABASE_URL="postgresql://postgres:password@postgres:5432/fi_notes"
JWT_SECRET="your_custom_secure_jwt_secret_key"
PORT=3001
```

**Inside `frontend/.env.local`**:
Create a `.env.local` file in the `frontend/` folder so the Next.js app knows where to talk to the backend:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 3. Build & Run
Open a terminal in the root folder of this project and run:

```bash
docker compose up --build
```
*Wait a minute or two for Docker to download the dependencies, build the frontend, and boot up the database and node servers.*

### 4. Sync the Database
Since the Docker PostgreSQL database starts completely empty, we need to push our tables (Users, Notes, Labels, etc.) into it. 

Leave the previous terminal running, open a **new** terminal tab, and run:
```bash
docker compose exec backend npx prisma db push
```

### 5. Open the App
You are all set! Open your browser and head to:
**[http://localhost:3000](http://localhost:3000)**

Create an account, log in, and start writing notes! To stop the application, just hit `Ctrl + C` in the Docker terminal, or run `docker compose down`.
