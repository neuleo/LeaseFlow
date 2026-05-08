# Product Guidelines - LeaseFlow

## Prose Style
- **Tone:** Professional, direct, and concise.
- **Language:** German (based on user interaction) for the UI, English for technical documentation and code.
- **Clarity:** Avoid jargon; use clear labels for financial and distance metrics.

## Design Principles
- **Mobile-First:** The UI should be highly responsive and usable on small screens (e.g., while in a car).
- **Dark Mode by Default:** Maintain the current dark, high-contrast theme for better readability in various lighting conditions.
- **Visual Feedback:** Use colors (Green/Red) to indicate status (On Track / Over Budget) clearly.
- **Consistency:** Ensure consistent spacing and typography across all dashboard cards.

## User Experience (UX)
- **Minimal Friction:** Mileage logging should require as few clicks as possible.
- **Immediate Value:** The dashboard must answer the user's most important question ("Am I over my limit?") within seconds of loading.
- **Safety:** Ensure the app handles invalid inputs (e.g., non-numeric odometer readings) gracefully with clear error messages.

## Technical Standards
- **Containerization:** All components must run within Docker containers.
- **Persistence:** All data changes must be persisted to the SQLite database immediately.
- **API First:** The frontend should communicate exclusively via the defined REST API.
