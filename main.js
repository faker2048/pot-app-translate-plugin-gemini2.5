async function translate(text, from, to, options) {
    const { config, utils } = options;
    const { tauriFetch: fetch } = utils;
    
    // Get configuration values
    const {
        apiKey,
        model = "gemini-2.5-flash-lite",
        enableThinking = "false",
        temperature = "0.3",
        maxOutputTokens = "1024"
    } = config;
    
    if (!apiKey) {
        throw "API Key is required";
    }
    
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
    
    const fromLang = getLanguageName(from);
    const toLang = getLanguageName(to);
    
    // Set thinkingBudget based on enableThinking option
    const thinkingBudget = enableThinking === "true" ? -1 : 0;
    
    const requestBody = {
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
            "temperature": parseFloat(temperature),
            "maxOutputTokens": parseInt(maxOutputTokens),
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "object",
                "properties": {
                    "translation": {
                        "type": "string",
                        "description": "The translated text"
                    },
                    "alternative": {
                        "type": "string",
                        "description": "Alternative translation if available"
                    }
                },
                "required": ["translation"]
            }
        }
    };
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!res.ok) {
            throw `HTTP Error: ${res.status} - ${res.statusText}`;
        }
        
        const result = res.data;
        
        if (!result.candidates || result.candidates.length === 0) {
            throw "No translation candidates returned";
        }
        
        const candidate = result.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw "Invalid response structure";
        }
        
        const responseText = candidate.content.parts[0].text;
        
        try {
            const parsedResponse = JSON.parse(responseText);
            return parsedResponse.translation || responseText;
        } catch (parseError) {
            // If JSON parsing fails, return the raw text
            return responseText;
        }
        
    } catch (error) {
        throw `Translation failed: ${error.toString()}`;
    }
}
