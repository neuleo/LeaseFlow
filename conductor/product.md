# Initial Concept
A modern, containerized leasing tracker to monitor mileage against a contract.

# Product Guide - LeaseFlow

## Vision
LeaseFlow is a streamlined, user-friendly tool designed for individuals with vehicle leasing contracts. It provides a visual and data-driven way to track mileage in real-time, ensuring users stay within their contractual limits and avoid unexpected costs at the end of their lease term.

## Target Users
- Individual car lessees who want to monitor their mileage.
- Small fleet managers looking for a simple tracker.
- Tech-savvy users who prefer a self-hosted, containerized solution.

## Core Goals
- **Real-time Monitoring:** Provide an instant comparison between actual mileage and the theoretical target based on the contract duration.
- **Ease of Use:** Minimize friction for logging new mileage entries.
- **Actionable Insights:** Use visual aids (graphs, progress bars) to alert users if they are exceeding their budget.
- **Portability:** Ensure easy deployment using Docker.

## Key Features
- **Dashboard:** A central hub showing current status, target vs. actual km, and overall progress.
- **Financial Projection:** Estimation of excess/under-mileage costs based on contract specific rates.
- **Mileage Logging:** A simple interface to record odometer readings with dates.
- **Dynamic Settings:** Flexibility to configure start dates, annual mileage, contract duration, and allowances.
- **Graphing:** Historical data visualization using Recharts to see trends over time.
