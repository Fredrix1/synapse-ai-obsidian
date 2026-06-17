<div align="center">

<img src="eye.png" alt="Synapse AI" width="160">

<h1>Synapse AI</h1>

<b>Your AI second brain inside Obsidian — chat with your notes, bring your own key, keep your data private.</b>

![Version](https://img.shields.io/badge/version-0.5.0_beta-7C3AED?style=flat-square)
![Obsidian](https://img.shields.io/badge/Obsidian-plugin-7C3AED?style=flat-square&logo=obsidian&logoColor=white)
![License](https://img.shields.io/badge/license-AGPL--3.0-orange?style=flat-square)

[Report a bug](https://github.com/Fredrix1/synapse-ai-obsidian/issues) · [Request a feature](https://github.com/Fredrix1/synapse-ai-obsidian/issues) · 🇬🇧 English · [🇷🇺 Русский](./README.ru.md)

</div>

---

**Synapse AI** turns your vault into a knowledge base you can talk to. Ask questions, pull notes in as context, and save the best answers back as permanent notes — powered by the model *you* choose (Gemini, OpenRouter, or any OpenAI‑compatible API, including local Ollama / LM Studio) with your own key.

> ⚠️ **Beta.** Core chat works and is in daily use. Semantic search (embeddings), agents and a local privacy layer are on the roadmap.

---

## Features

- **💬 Chat in a side panel** — streaming responses, stop mid‑stream, regenerate, edit your messages.
- **🔌 Bring your own model** — Gemini, OpenRouter, or any OpenAI‑compatible endpoint (custom `baseURL`, incl. local Ollama / LM Studio). Add several and switch on the fly.
- **📎 Vault‑aware context** — pull notes into the prompt via `[[wikilinks]]`, the active note (toggle), or automatic keyword search.
- **💾 Save reply as a note** — turn any answer (or a selected fragment) into a permanent, linkable note with frontmatter. Right‑click a message for the full menu.
- **🗂 Chat autosave** — conversations saved as plain `.md` in your vault (configurable, optional).
- **🌐 Proxy support** — route requests through your own proxy/VPS (for geo‑blocked regions)
- **🌍 Localization** — English & Russian UI.
- **🔒 You stay in control** — your notes and key go only to the AI provider you pick (or your own proxy). No middle‑man server, no analytics.

## Getting Started

**Install** — download `manifest.json`, `main.js`, `styles.css` from the latest [Release](https://github.com/Fredrix1/synapse-ai-obsidian/releases) into `<vault>/.obsidian/plugins/synapse-ai/`, reload Obsidian, enable **Synapse AI** in *Community plugins*. Or via [BRAT](https://github.com/TfTHacker/obsidian42-brat): *Add beta plugin* → `Fredrix1/synapse-ai-obsidian`.

**Setup**

1. **Settings → Synapse AI → API Keys** — add a key (OpenRouter / Gemini).
2. **Models → Add model** — pick a provider (or a custom OpenAI‑compatible `baseURL`, e.g. local Ollama) and the model id; set your **Default Chat Model**.
3. *(Optional)* **Proxy URL** for geo‑blocked regions; **System Prompt**, chat folder, default tag, language.

Open the chat via the command palette → **“Synapse: Open Chat”**. Type a question (Enter to send), add context with `[[Note name]]`, and right‑click a reply → **Save as note**.

## License

[AGPL‑3.0](./LICENSE) · by [Fredrix](https://github.com/Fredrix1) · issues & ideas welcome on [GitHub](https://github.com/Fredrix1/synapse-ai-obsidian/issues).
