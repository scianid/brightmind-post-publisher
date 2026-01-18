# BrightMind Post Publisher

A specialized React application for drafting, styling, and publishing posts to X, powered by the BrightMind Persona API.

## Features

- **Persona Authentication:** Secure entry via BrightMind API Key.
- **Voice Rewriting:** Rewrite drafts in the style of your validated personas using the `Non-Streaming Chat` API.
- **X-like Composer:** Familiar interface with clear focus on content.
- **Intent Publishing:** One-click handoff to X web intent.
- **Reversion:** Easily revert AI edits to your original draft.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run Development Server:**
    ```bash
    npm run dev
    ```

3.  **Open in Browser:**
    Navigate to `http://localhost:5173` (or the port shown in terminal).

## Usage via URL

You can pre-fill the composer using URL parameters:
`http://localhost:5173/?post=Hello%20World&image=https://example.com/image.jpg`

## Design System

Built with Tailwind CSS using a "content-first" monochrome aesthetic designated in `UI_UX.md`.
- **Font:** Inter (Google Fonts)
- **Icons:** Lucide React
