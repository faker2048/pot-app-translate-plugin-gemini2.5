async function translate(text, from, to, options) {
    try {
        const { config, utils } = options;
        const { tauriFetch: fetch } = utils;
    } catch (error) {
        throw `[错误位置: 解构options] ${error.toString()}`;
    }

    let actualModel, actualEnableThinking, actualTemperature, actualMaxOutputTokens, apiKey;
    
    try {
        // Get configuration values with proper defaults
        const {
            apiKey: configApiKey,
            model,
            enableThinking,
            temperature,
            maxOutputTokens
        } = config;
        
        apiKey = configApiKey;
        actualModel = model || "gemini-2.5-flash-lite";
        actualEnableThinking = enableThinking || "false";
        actualTemperature = temperature || "0.3";
        actualMaxOutputTokens = maxOutputTokens || "1024";
    } catch (error) {
        throw `[错误位置: 处理配置参数] ${error.toString()}`;
    }

    try {
        if (!apiKey) {
            throw "API Key is required";
        }
    } catch (error) {
        throw `[错误位置: 检查API Key] ${error.toString()}`;
    }

    let fromLang, toLang;
    try {
        // Convert language codes to full names for better translation
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

    let thinkingBudget;
    try {
        // Set thinkingBudget based on enableThinking option
        thinkingBudget = actualEnableThinking === "true" ? -1 : 0;
    } catch (error) {
        throw `[错误位置: 设置思考预算] ${error.toString()}`;
    }

    let requestBody;
    try {
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
                        "concise expression": {
                            "type": "string"
                        },
                        "more natural expression": {
                            "type": "string"
                        },
                        "direct translation": {
                            "type": "string"
                        },
                        "reddit humble expression": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "more natural expression",
                        "direct translation",
                        "reddit humble expression"
                    ]
                }
            }
        };
    } catch (error) {
        throw `[错误位置: 构建请求体] ${error.toString()}`;
    }

    let url;
    try {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:streamGenerateContent?key=${apiKey}`;
    } catch (error) {
        throw `[错误位置: 构建URL] ${error.toString()}`;
    }

    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: requestBody
        });
    } catch (error) {
        throw `[错误位置: 发送API请求] ${error.toString()}`;
    }

    try {
        if (!res.ok) {
            let errorDetail = `HTTP ${res.status} - ${res.statusText}`;
            if (res.data) {
                try {
                    errorDetail += `\nResponse: ${JSON.stringify(res.data, null, 2)}`;
                } catch (e) {
                    errorDetail += `\nResponse: ${res.data}`;
                }
            }
            throw `API请求失败: ${errorDetail}`;
        }
    } catch (error) {
        throw `[错误位置: 检查HTTP响应状态] ${error.toString()}`;
    }

    let result;
    try {
        result = res.data;
        if (!result) {
            throw "API返回空响应";
        }
    } catch (error) {
        throw `[错误位置: 获取响应数据] ${error.toString()}`;
    }

    try {
        if (!result.candidates) {
            throw `API响应格式错误: 缺少candidates字段\n完整响应: ${JSON.stringify(result, null, 2)}`;
        }
    } catch (error) {
        throw `[错误位置: 检查candidates字段] ${error.toString()}`;
    }

    try {
        if (result.candidates.length === 0) {
            let errorMsg = "API未返回翻译候选";
            if (result.promptFeedback) {
                errorMsg += `\n提示反馈: ${JSON.stringify(result.promptFeedback, null, 2)}`;
            }
            if (result.usageMetadata) {
                errorMsg += `\n使用统计: ${JSON.stringify(result.usageMetadata, null, 2)}`;
            }
            throw errorMsg;
        }
    } catch (error) {
        throw `[错误位置: 检查candidates数量] ${error.toString()}`;
    }

    let candidate;
    try {
        candidate = result.candidates[0];
    } catch (error) {
        throw `[错误位置: 获取第一个候选项] ${error.toString()}`;
    }

    try {
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            throw `翻译被中断: ${candidate.finishReason}\n候选项: ${JSON.stringify(candidate, null, 2)}`;
        }
    } catch (error) {
        throw `[错误位置: 检查完成原因] ${error.toString()}`;
    }

    try {
        if (!candidate.content) {
            throw `候选项缺少content字段\n候选项: ${JSON.stringify(candidate, null, 2)}`;
        }
    } catch (error) {
        throw `[错误位置: 检查候选项content] ${error.toString()}`;
    }

    try {
        if (!candidate.content.parts || candidate.content.parts.length === 0) {
            throw `候选项content缺少parts字段\n候选项content: ${JSON.stringify(candidate.content, null, 2)}`;
        }
    } catch (error) {
        throw `[错误位置: 检查content.parts] ${error.toString()}`;
    }

    let responseText;
    try {
        responseText = candidate.content.parts[0].text;
        if (!responseText) {
            throw `响应文本为空\n完整part: ${JSON.stringify(candidate.content.parts[0], null, 2)}`;
        }
    } catch (error) {
        throw `[错误位置: 获取响应文本] ${error.toString()}`;
    }

    try {
        const parsedResponse = JSON.parse(responseText);
        
        // 尝试不同的字段名
        const translation = parsedResponse.translation || 
                         parsedResponse["direct translation"] || 
                         parsedResponse["more natural expression"] || 
                         parsedResponse["reddit humble expression"] ||
                         parsedResponse["concise expression"];
        
        if (translation) {
            return translation;
        } else {
            return responseText;
        }
    } catch (parseError) {
        try {
            // If JSON parsing fails, return the raw text
            return responseText;
        } catch (error) {
            throw `[错误位置: 处理JSON解析失败后返回原始文本] ${error.toString()}`;
        }
    }
}