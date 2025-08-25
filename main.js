// 简洁版：Tauri fetch + Gemini generateContent
export async function translate(text, from, to, options) {
    const { config, utils } = options || {};
    const { tauriFetch: fetch } = (utils || {});
    if (!fetch) throw new Error('fetch 未提供');
    if (!config?.apiKey) throw new Error('缺少 apiKey');

    const model = config.model || 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const lang = (code) => ({
        en: 'English', zh: 'Chinese', zh_cn: 'Chinese Simplified', zh_tw: 'Chinese Traditional',
        ja: 'Japanese', ko: 'Korean', fr: 'French', es: 'Spanish', de: 'German', ru: 'Russian',
        it: 'Italian', pt: 'Portuguese', ar: 'Arabic', hi: 'Hindi', th: 'Thai', vi: 'Vietnamese',
        tr: 'Turkish', auto: 'auto-detect'
    })[code] || code;

    const body = {
        contents: [{ role: 'user', parts: [{ text: `Translate the following text from ${lang(from)} to ${lang(to)}:\n\n${text}` }] }],
        generationConfig: {
            thinkingConfig: { thinkingBudget: config.enableThinking === 'true' ? -1 : 0 },
            temperature: Number(config.temperature ?? 0.3),
            maxOutputTokens: Number(config.maxOutputTokens ?? 1024),
            responseMimeType: 'application/json',
            responseSchema: to === 'en' ? {
                type: 'object',
                properties: {
                    "concise expression": { type: 'string' },
                    "more natural expression": { type: 'string' },
                    "direct translation": { type: 'string' },
                    "reddit humble expression": { type: 'string' }
                },
                required: ['concise expression', 'more natural expression', 'direct translation', 'reddit humble expression']
            } : {
                type: 'object',
                properties: { translation: { type: 'string', description: 'The translated text' } },
                required: ['translation']
            }
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { type: 'Json', payload: body }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}${res.statusText ? ` - ${res.statusText}` : ''}`);

    const result = res.data;
    const txt = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('空响应');

    try {
        const parsed = JSON.parse(txt);
        if (to === 'en') {
            // Return all four expressions formatted with line breaks
            const expressions = [
                `直译: ${parsed['direct translation'] || 'N/A'}`,
                `简译: ${parsed['concise expression'] || 'N/A'}`,
                `自然表达: ${parsed['more natural expression'] || 'N/A'}`,
                `Reddit谦逊表达: ${parsed['reddit humble expression'] || 'N/A'}`
            ];
            return expressions.join('\n');
        } else {
            return parsed.translation ?? txt;
        }
    } catch {
        return txt; // 若不是 JSON，就直接返回文本
    }
}
