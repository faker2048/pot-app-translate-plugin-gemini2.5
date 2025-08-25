async function translate(text, from, to, options) {
    let config, fetch;

    try {
        const { config: cfg, utils } = options;
        const { tauriFetch } = utils;
        config = cfg;
        fetch = tauriFetch;
    } catch (error) {
        throw `[错误位置: 解构options] ${error.toString()}`;
    }

    let apiKey, actualModel, actualEnableThinking, actualTemperature, actualMaxOutputTokens;

    try {
        apiKey = config.apiKey;
        actualModel = config.model || "gemini-2.5-flash-lite";
        actualEnableThinking = config.enableThinking || "false";
        actualTemperature = config.temperature || "0.3";
        actualMaxOutputTokens = config.maxOutputTokens || "1024";

        if (!apiKey || apiKey.trim() === '') {
            throw `API Key is required. 当前配置: ${JSON.stringify(config)}`;
        }
    } catch (error) {
        throw `[错误位置: 处理配置参数] ${error.toString()}`;
    }

    let fromLang, toLang;
    try {
        const getLanguageName = (code) => {
            const langMap = {
                'en': 'English',
                'zh': 'Chinese',
                'zh_cn': 'Chinese Simplified',
                'zh_tw': 'Chinese Traditional',
                'ja': 'Japanese',
                'ko': 'Korean',
                'fr': 'French',
                'es': 'Spanish',
                'de': 'German',
                'ru': 'Russian',
                'it': 'Italian',
                'pt': 'Portuguese',
                'ar': 'Arabic',
                'hi': 'Hindi',
                'th': 'Thai',
                'vi': 'Vietnamese',
                'tr': 'Turkish',
                'auto': 'auto-detect'
            };
            return langMap[code] || code;
        };

        fromLang = getLanguageName(from);
        toLang = getLanguageName(to);
    } catch (error) {
        throw `[错误位置: 处理语言代码] ${error.toString()}`;
    }

    let requestBody, url;
    try {
        const thinkingBudget = actualEnableThinking === "true" ? -1 : 0;

        requestBody = {
            "contents": [{
                "role": "user",
                "parts": [{
                    "text": `Translate the following text from ${fromLang} to ${toLang}:\n\n${text}`
                }]
            }],
            "generationConfig": {
                "thinkingConfig": {
                    "thinkingBudget": thinkingBudget
                },
                "temperature": parseFloat(actualTemperature),
                "maxOutputTokens": parseInt(actualMaxOutputTokens),
                "responseMimeType": "application/json",
                "responseSchema": to === 'en' ? {
                    "type": "object",
                    "properties": {
                        "concise expression": { "type": "string" },
                        "more natural expression": { "type": "string" },
                        "direct translation": { "type": "string" },
                        "reddit humble expression": { "type": "string" }
                    },
                    "required": ["concise expression", "more natural expression", "direct translation", "reddit humble expression"]
                } : {
                    "type": "object",
                    "properties": {
                        "translation": {
                            "type": "string"
                        },
                        "concise summary": {
                            "type": "string"
                        }
                    },
                    "required": ["translation"]
                }
            }
        };
    } catch (error) {
        throw `[错误位置: 构建请求体] ${error.toString()}`;
    }

    url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${apiKey}`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // 可留可去
            body: { type: 'Json', payload: requestBody },    // ✅ 关键点
        });

        if (!res.ok) {
            let detail = `HTTP ${res.status}${res.statusText ? ' - ' + res.statusText : ''}`;
            if (res.data) detail += `\nResponse: ${JSON.stringify(res.data)}`;
            throw new Error(`API请求失败: ${detail}`);
        }

        const result = res.data; // ✅ Tauri 在 data 字段里

        if (!result || !result.candidates || result.candidates.length === 0) {
            throw new Error(`API响应异常: ${JSON.stringify(result)}`);
        }

        const candidate = result.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error(`响应格式异常: ${JSON.stringify(candidate)}`);
        }

        const responseText = candidate.content.parts[0].text;
        if (!responseText) {
            throw new Error(`响应文本为空: ${JSON.stringify(candidate.content.parts[0])}`);
        }

        try {
            const parsedResponse = JSON.parse(responseText);
            if (to === 'en') {
                // Return all four expressions formatted with line breaks
                const expressions = [
                    `直译: ${parsedResponse['direct translation'] || 'N/A'}`,
                    `简洁表达: ${parsedResponse['concise expression'] || 'N/A'}`,
                    `自然表达: ${parsedResponse['more natural expression'] || 'N/A'}`,
                    `Reddit谦逊表达: ${parsedResponse['reddit humble expression'] || 'N/A'}`
                ];
                return expressions.join('\n\n');
            } else {
                const expressions = [
                    `${parsedResponse.translation || 'N/A'}`,
                    `简洁总结: ${parsedResponse['concise summary'] || 'N/A'}`
                ];
                return expressions.join('\n\n');
            }
        } catch (parseError) {
            return responseText;
        }

    } catch (error) {
        throw `[错误位置: API调用和响应处理] ${error.toString()}`;
    }
}