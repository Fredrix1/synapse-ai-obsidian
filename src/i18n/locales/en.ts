export default {
    settings: {
        tabs: {
            basic: "Basic",
            model: "Models"
        },
        headings: {
            general: "General Settings",
            saving: "Saving Conversations",
            developer: "Developer",
            configuredModels: "Model Configuration",
            context: "Context Management"
        },
        apiKeys: {
            name: "API Keys",
            desc: "Configure API keys for different AI providers (OpenRouter, Gemini, etc.). Keys are stored locally and securely.",
            btn: "Set Keys"
        },
        defaultModel: {
            name: "Default Chat Model",
            desc: "Which AI model will respond in new chats. You can add more models in the 'Model' tab."
        },
        language: {
            name: "Language",
            desc: "Select the plugin interface language. Reopen the settings window to fully apply changes."
        },
        autoAddActiveNote: {
            name: "Auto-add active note",
            desc: "If enabled, Synapse will automatically read the note currently open on your screen and use it as context for its answers."
        },
        systemPrompt: {
            name: "System Prompt",
            desc: "A global instruction for the neural network (acts as the AI's 'persona').\n\n💡 Guide: Write how the AI should behave here. For example: 'You are a strict editor. Answer briefly, fix grammar, and do not use emojis.'",
            placeholder: "Example: Answer only with code, no explanations..."
        },
        autosaveChat: {
            name: "Autosave chat",
            desc: "Automatically save all AI conversations as regular .md notes in your vault."
        },
        autosaveChatPath: {
            name: "Chat folder",
            desc: "Specify the folder path (e.g., 'Chats/AI'). If left blank, chats will be saved in the vault root.",
            placeholder: "Hidden (default root)"
        },
        savedNotesPath: {
            name: "Saved replies folder",
            desc: "Where 'Save as note' stores AI replies. Visible vault folder (e.g., 'Synapse/Saved').",
            placeholder: "Synapse/Saved"
        },
        defaultTag: {
            name: "Default tag",
            desc: "This tag will be added to the frontmatter of every saved chat for easy searching.",
            placeholder: "ai-conversations"
        },
        debugMode: {
            name: "Debug mode",
            desc: "Enables advanced logging to the developer console (Ctrl+Shift+I). Useful for troubleshooting local model connections."
        },
        brandedChat: {
            name: "Branded Chat UI (Experimental)",
            desc: "Enables an alternative, visually enriched chat interface with a unique Synapse style."
        },
        models: {
            addBtn: "Add model",
            tableModel: "Model",
            tableProvider: "Provider",
            tableBaseUrl: "Base URL",
            tableActions: "Actions"
        },
        conversationTurns: {
            name: "Conversation turns",
            desc: "How many previous messages the AI will 'remember' in the current dialogue.\n\n⚠️ Guide: 1 'turn' = your message + AI response. A higher value makes the AI smarter in long conversations but consumes more tokens."
        },
        proxyUrl: {
            name: "Proxy URL",
            desc: "Global proxy for API requests (e.g., to bypass geo-blocks).\n\n💡 Guide: The plugin will send requests to this address, and your server (e.g. NGINX) will forward them to the provider. Leave blank if you are using a local AI or if the provider is not blocked in your country.",
            placeholder: "https://your-domain.duckdns.org/secret-path/"
        },
        modals: {
            providerKeys: {
                title: "AI Provider Settings",
                subtitle: "Configure your AI providers by adding their API keys.",
                text: "For custom endpoints, use the Add Model button in the Model tab.",
                addModel: "Add Model",
                modelName: "Model",
                modelDesc: "Add the selected model to your models list. After adding, check the Model Tab.",
                selectModel: "Select Model",
                addBtn: "Add",
                loading: "Loading models",
                errorFormat: "Error loading models. Check your key.",
                getOrKey: "Get OpenRouter Key",
                getGeminiKey: "Get Gemini Key"
            },
            customModel: {
                titleEdit: "Model Settings",
                titleAdd: "Add Custom Chat Model",
                subtitle: "Add a new model to your collection.",
                name: "Model name",
                namePlaceholder: "Enter model name (e.g. Qwen3.5-Flash)",
                displayName: "Display name",
                displayPlaceholder: "Custom model name (optional)",
                provider: "Provider",
                baseUrl: "Base URL",
                baseUrlDesc: "Leave it blank, unless you are using a proxy.",
                apiKey: "API Key",
                cors: "CORS",
                curlBtn: "CURL",
                testBtn: "Test",
                addBtn: "Add model",
                closeBtn: "Close",
                notices: {
                    nameRequired: "Model name is required",
                    apiRequired: "API Key is required",
                    curlCopied: "Copied curl command. Warning: contains real API key!",
                    success: "Model verification successful!",
                    corsWarning: "Connection successful, but requires CORS to be enabled. Please enable CORS for this model once you add it above.",
                    testFailed: "Synapse test failed: "
                }
            }
        }
    },
    chat: {
        title: "Synapse Chat",
        inputPlaceholder: "Ask about your notes • [[]] for context",
        fallbackModel: "Model",
        kebabMenu: {
            prompts: "Suggested Prompts",
            titleBar: "Title Bar",
            settings: "Settings"
        },
        emptyState: {
            greeting: "How can I help you?",
            prompts: {
                0: { title: "Find related notes", desc: "Quick search across your vault" },
                1: { title: "Explain document", desc: "Summary and analysis" },
                2: { title: "Create summary", desc: "Concise overview of selected files" },
                3: { title: "Ask a question", desc: "Answers to any questions" }
            }
        },
        actions: {
            regenerate: "Regenerate",
            copy: "Copy",
            copied: "Copied to clipboard",
            delete: "Delete",
            edit: "Edit",
            cancel: "Cancel",
            send: "Send",
            save: "Save as note",
            saveSelection: "Save selection as note",
            copyMarkdown: "Copy as Markdown"
        },
        status: {
            thinking: "Thinking",
            emptyResponse: "Server returned no text (empty response). Proxy or API key might be invalid.",
            error: "An error occurred, try again later",
            noPrevMessage: "No previous message to regenerate",
            corruptedContext: "Context is corrupted, regeneration is impossible",
            aborted: "Stopped by user.",
            saved: "Saved to vault",
            saveFailed: "Failed to save note",
            saveEmpty: "Nothing to save"
        },
        context: {
            activeNote: "Active note",
            relevantNotes: "Relevant notes"
        },
        savedNote: {
            questionLabel: "Question"
        },
        autosave: {
            emptyHistory: "_History is empty._"
        }
    }
}
