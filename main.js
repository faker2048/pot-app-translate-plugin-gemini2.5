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
                "responseSchema": {
                    "type": "object",
                    "properties": {
                        "translation": {
                            "type": "string",
                            "description": "The translated text"
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: { type: 'Json', payload: requestBody },    // ✅ 关键点
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status} - ${res.statusText}\n${text}`);
        }

        const result = await res.json();  // 等价于 curl 返回的 JSON


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
            return parsedResponse.translation || responseText;
        } catch (parseError) {
            return responseText;
        }

    } catch (error) {
        throw `[错误位置: API调用和响应处理] ${error.toString()}`;
    }
}