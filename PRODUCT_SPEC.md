# Product Specification: BrightMind Post Publisher

## 1. Overview
The **BrightMind Post Publisher** is a single-page web application designed to streamline the process of drafting, styling, and publishing posts to X (formerly Twitter). It leverages the BrightMind Persona API to rewrite content in the unique voice of validated personas.

## 2. User User & Access
### Authentication
- Upon landing, if no valid session/API key is detected, the user is presented with a modal/screen to enter their **BrightMind API Key**.
- **Validation:** The application validates the key by calling `GET /personas/list`.
  - *Success:* Application loads, key is stored (session/local storage).
  - *Failure:* Error message displayed, user remains gated.

### URL Parameters
The application accepts initial content via URL parameters:
- `post`: Text content to pre-fill the editor.
- `image`: URL of an image to display (preview only, not uploaded to X via intent).

## 3. Core Features

### A. Post Editor (X-like UI)
- A central text area that mimics the look and feel of an X post composer.
- **Manual Editing:** Users can type directly into the text area to modify content.
- **Image Preview:** If `image` param is present, the image renders below the text area.
- **Original Text Access:**
  - The application preserves the initial text (from URL params or user's first input) in a read-only state.
  - Users can toggle a "View Original" display or click "Revert" to restore the editor to this initial state at any time.

### B. Persona Selection
- A sidebar or list displaying available personas fetched from `GET /personas/list`.
- Displays: `display_name`, `handle`, and `avatar_url`.
- User selects a persona to active "Voice" context.

### C. Actions

#### 1. Rewrite in Persona Voice
- **Trigger:** Button labeled "Rewrite as [Persona Name]".
- **Logic:**
  - Calls `POST /personas/{account_id}/chat`.
  - **Payload:**
    ```json
    {
      "message": "Rewrite the following social media post in your specific voice and style. strictly output only the rewritten text nothing else:\n\n[CURRENT_EDITOR_TEXT]",
      "stream": false,
      "include_debug": false
    }
    ```
  - **Output:** Replaces the content of the Post Editor with the `response` text from the API.

#### 2. Post to X
- **Trigger:** "Post to X" button (primary CTA).
- **Logic:** Opens a new browser tab with the intent URL:
  `https://x.com/intent/post?text=[ENCODED_EDITOR_TEXT]`
  *(Note: X Intent API does not support pre-filling images via URL, only text).*

## 4. Technical Specifications
- **Stack:** HTML5, CSS3, Vanilla JavaScript (or lightweight framework like Vue/React via CDN).
- **API Base URL:** `https://app.brightmind-community.com`
- **Headers:** `X-API-Key: [KEY]`, `Content-Type: application/json`

## 5. UI Wireframe (ASCII)

```text
+-----------------------------------------------------------------------+
|  [Logo] BrightMind Publisher                                [Reset]   |
+-----------------------------------------------------------------------+
|                                                                       |
|  +------------------------+      +--------------------------------+   |
|  |  PERSONAS              |      |  COMPOSER                      |   |
|  |                        |      |                                |   |
|  |  Select a voice:       |      |  +--------------------------+  |   |
|  |                        |      |  | Avatar                   |  |   |
|  |  [O] Eli Kiako         |      |  |                          |  |   |
|  |      @elikiako         |      |  | [ Editable Text Area...  |  |   |
|  |                        |      |  |   "Community is key..."  |  |   |
|  |  [ ] Tech Writer       |      |  |                          |  |   |
|  |      @tech_guru        |      |  |                          |  |   |
|  |                        |      |  | ]                        |  |   |
|  |  [ ] Design Lead       |      |  +--------------------------+  |   |
|  |      @ui_ux_pro        |      |                                |   |
|  |                        |      |  +--------------------------+  |   |
|  |                        |      |  | [ Image Preview ]        |  |   |
|  |                        |      |  | (if param provided)      |  |   |
|  |                        |      |  |                          |  |   |
|  |                        |      |  +--------------------------+  |   |
|  |                        |      |                                |   |
|  |                        |      |  [ View Original / Revert ]    |   |
|  |                        |      |                                |   |
|  |                        |      |   [ Rewrite w/ Persona ]       |   |
|  |                        |      |                                |   |
|  +------------------------+      |   (Primary Action)             |   |
|                                  |   [ POST TO X  -> ]            |   |
|                                  |                                |   |
|                                  +--------------------------------+   |
|                                                                       |
+-----------------------------------------------------------------------+

[ Modal Overlay - Hidden if Authenticated ]
+-------------------------------------------+
|  Enter API Key                            |
|                                           |
|  [__sk_prod_12345__________________]      |
|                                           |
|  [ Validate & Enter ]                     |
+-------------------------------------------+
```
