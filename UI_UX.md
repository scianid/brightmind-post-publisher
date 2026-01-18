# UI/UX & Design System Specification

## 1. Design Philosophy
The interface mimics the modern, text-centric aesthetic of "X" (formerly Twitter) while introducing a layer of professional elegance. The focus is on **content clarity**, **minimalism**, and **fluid interaction**.

*   **Content-First:** The post content is the hero. UI elements recede to support the writing process.
*   **High Contrast & Readability:** Stark black text on white backgrounds to ensure focus.
*   **Tactile Interactions:** Subtle feedback on hover and focus states to make the app feel responsive and premium.

## 2. Color System
A strictly monochrome palette with semantic colors only used for critical actions.

### Base Colors
*   **Background (Canvas):** `#FFFFFF` (Pure White)
*   **Surface (Cards/Sidebars):** `#FAFAFA` (Very Light Gray) or `#F5F5F7`
*   **Border/Divider:** `#E5E7EB` (Light Gray)

### Typography Colors
*   **Primary Text:** `#111827` (Near Black - reduces eye strain compared to #000)
*   **Secondary Text (Metadata):** `#6B7280` (Medium Gray)
*   **Placeholder/Disabled:** `#9CA3AF`

### Interactive/Accents
*   **Primary Action (Black):** `#0F1419` (X-like Black)
*   **Primary Hover:** `#272C30`
*   **Destructive/Error:** `#EF4444` (Soft Red)
*   **Success:** `#10B981` (Emerald Green - for validation)
*   **Focus Ring:** `#0F1419` (2px offset)

## 3. Typography
**Font Family:** [**Inter**](https://fonts.google.com/specimen/Inter) (Google Fonts)
*   *Rational:* Inter is designed specifically for computer screens. It allows for high legibility at small sizes and a clean, "elegant" aesthetic in headings.

### Scale
*   **H1 (App Title):** 24px, Weight 600 (SemiBold), Tracking -0.5px
*   **H2 (Section Headers):** 14px, Weight 600, Uppercase, Tracking 1px, Color: `#6B7280`
*   **Body (Input/Post):** 18px, Weight 400 (Regular), Line-height 1.5 (Mimics X readability)
*   **Button Text:** 14px, Weight 600
*   **Small (Metadata):** 12px, Weight 500

## 4. Layout Structure (Wireframe Translation)

### The Page
*   **Max Width:** 1000px centered on screen.
*   **Grid:** 2-Column Layout.
    *   **Left (Persona Sidebar):** 300px Fixed width.
    *   **Right (Composer):** Flex-grow (Remaining space).
*   **Padding:** 40px all around.

### A. The "Gate" (API Key Modal)
*   **Backdrop:** White with 90% opacity or simple Blur (`backdrop-filter: blur(8px)`).
*   **Container:** Centered card, minimal shadow (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)`).
*   **Input:** Single-line, large text, no borders except bottom border (`border-bottom: 2px solid #E5E7EB`).
*   **Animation:** Fade out upon success.

### B. Sidebar (Personas)
*   **List Style:** Clean flat list.
*   **Item State (Default):** Transparent background.
*   **Item State (Hover):** Light Gray background (`#F3F4F6`), Rounded corners (8px).
*   **Item State (Selected):** Black background (`#0F1419`), White Text.
*   **Avatar:** Circle, 40x40px.

### C. Composer (Main Area)
*   **Container:** No border, feels like writing on a blank sheet.
*   **Text Area:**
    *   No resize handle.
    *   Auto-expanding height.
    *   No visible border (focus state adds subtle highlight).
    *   Font size: 18px (Large).
*   **Image Preview:**
    *   Rounded corners (16px).
    *   Positioned below text.
    *   Subtle border: 1px solid `#E5E7EB`.
*   **Controls Area:**
    *   Right-aligned "Post to X" button (Pill shape).
    *   Left-aligned "Rewrite" button (Text/Icon style).

## 5. UI Elements & States

### Buttons
1.  **Primary (Post to X)**
    *   Background: Black (`#0F1419`)
    *   Text: White
    *   Shape: Pill (Rounded full)
    *   Padding: 10px 24px
2.  **Secondary (Rewrite)**
    *   Background: White
    *   Border: 1px solid `#E5E7EB`
    *   Text: Black
    *   Hover: Border Black.
3.  **Tertiary (Revert/View Original)**
    *   Text Link style (`text-decoration: underline` opacity 0.6).

### Loading States
*   **Persona Rewrite:** The textarea pulses or shows a skeleton loader overlay (`animate-pulse`).
*   **API Validation:** Button shows a spinning circle/loader instead of text.

### Visual Polish
*   **Shadows:** Very minimal. Use borders and spacing to define hierarchy instead of heavy drop shadows.
*   **Transitions:** `all 0.2s ease-in-out` on interactive elements.

## 6. CSS Framework Strategy
Since we are using Vanilla JS, we will treat CSS as a lightweight design system.
*   **Reset:** Modern CSS reset.
*   **Variables:** Define colors and spacing in `:root`.
*   **Flexbox/Grid:** For layout.
