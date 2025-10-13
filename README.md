# Polycord

Polycord is a Discord-based social platform that helps language learners connect through user profiles instead of servers.

Traditional discovery platforms focus on finding large communities, but Polycord is all about individuals, helping users find friends, or study buddies who share their target languages and interests.

---

## 💡 Core Concept

Polycord shifts the focus from navigating and joining large communities to **discovering specific individuals** for high-quality, one-on-one or small-group language exchange.

---

## 🛠️ Features

* **User Profiles:** Showcase your languages, learning goals, and personal interests.
* **Matching System:** Find users with compatible language pairs (e.g., English $\leftrightarrow$ Japanese).
* **Discord Integration:** Seamlessly connect and initiate chat via your Discord account.
* **Discovery:** Search and filter partners based on proficiency, country, or shared hobbies.

---

## 💻 Project Status: Under Development

This project is currently in the initial development phase. All features listed above are pending implementation.

---

## 🧑‍💻 Development

### Setup

1.  **Clone the repository:**
    ```
    git clone https://github.com/chev0004/polycord
    ```
2.  **Install dependencies:**
    ```
    bun install
    ```
3.  **Configure environment variables:**
    Copy the example file and configure necessary API keys and settings.
    ```
    cp .env.example .env
    ```
4.  **Build and Run:**
    ```
    bun run build
    bun run start
    ```

### Scripts

| Script | Description |
| :--- | :--- |
| `bun run dev` | Starts the local development server. |
| `bun run build` | Creates an optimized production build. |
| `bun run start` | Starts the production-ready server. |
| `bun run format` | Runs code formatting across the project. |
| `bun run check` | Analyzes code for errors and quality issues. |
| `bun run fix:all` | Lints and fixes all auto-fixable code issues. |
| `bun run storybook` | Starts the Storybook development server. |
| `bun run build-storybook` | Builds the static Storybook documentation. |
| `bun run prepare` | Installs git hooks (run once after clone/install). |
