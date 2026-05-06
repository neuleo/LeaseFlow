# LeaseFlow - Dynamic Leasing Tracker

A modern, containerized leasing tracker to monitor your mileage against your contract.

## Features
- **Dynamic Settings:** Configure start date, duration, mileage budget, etc.
- **Quick Logging:** Fast entry for current mileage.
- **Dashboard:** Visual comparison of actual vs. target mileage.
- **Dark Mode:** Sleek mobile-first design.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Recharts.
- **Backend:** Node.js (Express).
- **Database:** SQLite.
- **Infrastructure:** Docker & Docker Compose.

## Getting Started

### Prerequisites
- Docker & Docker Compose installed.

### Installation & Execution
1. Clone the repository (if applicable).
2. Run the rebuild script:
   ```bash
   bash rebuild.sh
   ```
3. Access the application:
   - Frontend: `http://localhost:3005`
   - Backend API: `http://localhost:3006/api`

## Data Persistence
The SQLite database is stored in the `./data` directory on the host machine, which is mapped to `/app/data` in the container.
