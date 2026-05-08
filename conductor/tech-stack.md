# Tech Stack - LeaseFlow

## Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 3
- **Visualization:** Recharts
- **Icons:** Lucide React
- **Language:** TypeScript
- **State Management:** React Hooks (useState, useMemo, useEffect)
- **HTTP Client:** Axios

## Backend
- **Runtime:** Node.js (v20-slim)
- **Framework:** Express.js
- **Database Driver:** sqlite3
- **Middleware:** CORS, Body-parser
- **Configuration:** Dotenv

## Database
- **Engine:** SQLite 3
- **Persistence:** Local file `/app/data/database.sqlite` (mapped to host `./data/`)

## Infrastructure
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Deployment:** Container-based setup with automatic restarts
