
# Blocdash Next.js Server

This project is the backend service for the **Blocdash** platform, built using **Next.js API routes** and **TypeScript**. It supports dashboard management, user authentication, and interactions with a MongoDB database.

## ✨ Features
- RESTful API using Next.js API routes
- MongoDB for persistent storage (via Mongoose)
- JWT-based authentication system
- CORS configuration for frontend-backend integration
- TypeScript for type safety and maintainability

## 📂 Folder Structure
```
blocdash-nextjs-server/
├── pages/api/           # API route handlers
│   ├── auth/            # Login, register, logout
│   └── dashboard/       # Dashboard data handling
├── lib/                 # Database and auth utilities
│   ├── db.ts            # MongoDB connection
│   └── auth.ts          # JWT and user handling
├── models/              # Mongoose schemas
├── types/               # TypeScript interfaces
├── .env                 # Environment config
├── package.json         # Project metadata
└── tsconfig.json        # TypeScript configuration
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v16+)
- MongoDB

### Clone the Repository
```bash
git clone https://github.com/dangquynhnguyen/blocdash-nextjs-server.git
cd blocdash-nextjs-server
```

### Install Dependencies
```bash
yarn install
# or
npm install
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
MONGO_URI=mongodb://localhost:27017/blocdash
JWT_SECRET=your_jwt_secret
```

### Run in Development
```bash
yarn dev
# or
npm run dev
```

## 🔐 Authentication
- JWT tokens are issued on login
- Tokens must be included in headers for protected routes:
```http
Authorization: Bearer <your_token>
```

## 🧪 Sample API Route (GET /api/dashboard)
```http
GET /api/dashboard HTTP/1.1
Authorization: Bearer <token>
```
Response:
```json
{
  "data": [ ... ]
}
```

## 🚀 Tech Stack
- **Next.js** (API routes)
- **TypeScript**
- **MongoDB** + **Mongoose**
- **JWT** for Authentication

## 🚨 Contributing
1. Fork this repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## ✉️ Contact
Created by [Dang Quynh Nguyen](https://github.com/dangquynhnguyen)

---

> A backend template for Next.js applications with secure user handling and data APIs.
