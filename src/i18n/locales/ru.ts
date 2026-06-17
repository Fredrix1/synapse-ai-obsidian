export default {
    settings: {
        tabs: {
            basic: "Основные",
            model: "Модели"
        },
        headings: {
            general: "Общие настройки",
            saving: "Сохранение чатов",
            developer: "Для разработчиков",
            configuredModels: "Настройка моделей",
            context: "Управление контекстом"
        },
        apiKeys: {
            name: "API Keys",
            desc: "Укажите ключи доступа для различных ИИ-провайдеров (OpenRouter, Gemini и др.). Эти ключи хранятся локально и безопасно.",
            btn: "Set Keys"
        },
        defaultModel: {
            name: "Default Chat Model",
            desc: "Какая нейросеть будет отвечать в новых чатах. Вы можете добавить больше моделей в табе «Модель»."
        },
        language: {
            name: "Language",
            desc: "Выберите язык интерфейса плагина. Для полного применения изменений переоткройте окно настроек."
        },
        autoAddActiveNote: {
            name: "Auto-add active note",
            desc: "Если включено, Синапс будет автоматически читать заметку, которая сейчас открыта у вас на экране, и использовать её как контекст для ответов."
        },
        systemPrompt: {
            name: "System Prompt",
            desc: "Глобальная инструкция для нейросети (работает как 'характер' ИИ). \n\n 💡 Гайд: Напишите здесь, как ИИ должен себя вести. Например: 'Ты — строгий редактор. Отвечай кратко, исправляй грамматику и не используй эмодзи.'",
            placeholder: "Например: Отвечай только кодом, никаких объяснений..."
        },
        autosaveChat: {
            name: "Autosave chat",
            desc: "Автоматически сохранять все диалоги с ИИ в виде обычных .md заметок в вашем хранилище (Vault)."
        },
        autosaveChatPath: {
            name: "Chat folder",
            desc: "Укажите путь к папке (например: 'Chats/AI'). Если оставить пустым, чаты будут сохраняться в корневую папку хранилища.",
            placeholder: "По умолчанию (в корень)"
        },
        savedNotesPath: {
            name: "Saved replies folder",
            desc: "Куда «Сохранить как заметку» кладёт ответы AI. Видимая папка хранилища (например, 'Synapse/Saved').",
            placeholder: "Synapse/Saved"
        },
        defaultTag: {
            name: "Default tag",
            desc: "Этот тег будет добавляться в свойства (frontmatter) каждого сохраненного чата для удобного поиска.",
            placeholder: "ai-conversations"
        },
        debugMode: {
            name: "Debug mode",
            desc: "Включает расширенное логирование в консоль разработчика (Ctrl+Shift+I). Полезно для поиска ошибок при подключении локальных моделей."
        },
        brandedChat: {
            name: "Branded Chat UI (Experimental)",
            desc: "Включает альтернативный, визуально обогащенный интерфейс чата с уникальным стилем Synapse."
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
            desc: "Сколько предыдущих сообщений нейросеть будет 'помнить' в текущем диалоге.\n\n⚠️ Гайд: 1 'поворот' = ваше сообщение + ответ ИИ. Большее значение делает ИИ умнее в длинных беседах, но тратит больше токенов."
        },
        proxyUrl: {
            name: "Proxy URL",
            desc: "Глобальный прокси для запросов к API (например, для обхода блокировок).\n\n💡 Гайд: Плагин будет отправлять запросы на этот адрес, а ваш сервер (например NGINX) перенаправит их провайдеру. Оставьте пустым, если используете локальный ИИ или в вашей стране не заблокирован.",
            placeholder: "https://your-domain.duckdns.org/secret-path/"
        },
        modals: {
            providerKeys: {
                title: "Настройки API Провайдеров",
                subtitle: "Настройте ИИ-провайдеров, добавив их API ключи.",
                text: "Для кастомных моделей используйте кнопку «Add Model» во вкладке «Модели».",
                addModel: "Add Model",
                modelName: "Model",
                modelDesc: "Добавьте выбранную модель в ваш список. После добавления проверьте таб «Модель».",
                selectModel: "Выберите модель",
                addBtn: "Add",
                loading: "Загрузка моделей",
                errorFormat: "Ошибка загрузки. Проверьте ваш API ключ.",
                getOrKey: "Получить ключ OpenRouter",
                getGeminiKey: "Получить ключ Gemini"
            },
            customModel: {
                titleEdit: "Настройки модели",
                titleAdd: "Добавить кастомную модель",
                subtitle: "Добавьте новую модель в вашу коллекцию.",
                name: "Model name",
                namePlaceholder: "Введите ID модели (например: Qwen3.5-Flash)",
                displayName: "Display name",
                displayPlaceholder: "Красивое имя для меню (опционально)",
                provider: "Provider",
                baseUrl: "Base URL",
                baseUrlDesc: "Оставьте пустым, если не используете прокси.",
                apiKey: "API Key",
                cors: "CORS",
                curlBtn: "CURL",
                testBtn: "Test",
                addBtn: "Add model",
                closeBtn: "Close",
                notices: {
                    nameRequired: "Имя модели обязательно",
                    apiRequired: "API Key обязателен",
                    curlCopied: "CURL скопирован. Внимание: содержит реальный API ключ!",
                    success: "Проверка модели прошла успешно!",
                    corsWarning: "Подключение успешно, но требует включения CORS. Пожалуйста, поставьте галочку CORS.",
                    testFailed: "Ошибка проверки: "
                }
            }
        }
    },
    chat: {
        title: "Synapse Chat",
        inputPlaceholder: "Спросите о заметках • [[]] для контекста",
        fallbackModel: "Модель",
        kebabMenu: {
            prompts: "Быстрые подсказки",
            titleBar: "Заголовок чата",
            settings: "Настройки"
        },
        emptyState: {
            greeting: "Чем могу помочь?",
            prompts: {
                0: { title: "Найти заметки по теме", desc: "Быстрый поиск по вашей базе" },
                1: { title: "Объяснить документ", desc: "Краткое содержание и анализ" },
                2: { title: "Создать сводку", desc: "Сжатый пересказ выбранных файлов" },
                3: { title: "Задать вопрос", desc: "Ответы на любые вопросы" }
            }
        },
        actions: {
            regenerate: "Регенерировать",
            copy: "Копировать",
            copied: "Скопировано в буфер обмена",
            delete: "Удалить",
            edit: "Редактировать",
            cancel: "Отменить",
            send: "Отправить",
            save: "Сохранить как заметку",
            saveSelection: "Сохранить выделенное как заметку",
            copyMarkdown: "Копировать как Markdown"
        },
        status: {
            thinking: "Думаю",
            emptyResponse: "Сервер не вернул никакого текста (пустой ответ). Скорее всего, прокси или ключ не работают.",
            error: "Произошла ошибка, попробуй позже",
            noPrevMessage: "Нет предыдущего сообщения для регенерации",
            corruptedContext: "Контекст поврежден, регенерация невозможна",
            aborted: "Остановлено пользователем.",
            saved: "Сохранено в хранилище",
            saveFailed: "Не удалось сохранить заметку",
            saveEmpty: "Нечего сохранять"
        },
        context: {
            activeNote: "Активная заметка",
            relevantNotes: "Релевантные заметки"
        },
        savedNote: {
            questionLabel: "Вопрос"
        },
        autosave: {
            emptyHistory: "_История пока пустая._"
        }
    }
}
