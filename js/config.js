// Centralized configuration for InterviewX.
// Loaded first so every other module can reference InterviewXConfig.

const InterviewXConfig = {
    // The LLM lives behind our own server (see server.js) so no API key is
    // ever shipped to the browser.
    api: {
        base: '',            // same origin as the page when served by server.js
        questionsPath: '/api/questions',
        feedbackPath: '/api/feedback',
        healthPath: '/api/health'
    },

    timing: {
        presenceAnalysisMs: 500,
        chartUpdateMs: 2000,
        silenceAutoSubmitMs: 3000,
        questionStartDelayMs: 1000,
        nextQuestionDelayMs: 3000,
        maxAnswerTimeMs: 30000
    },

    interview: {
        historyLimit: 20,
        minAnswerLength: 10,
        maxChartPoints: 50
    },

    fillerWords: ['um', 'uh', 'like', 'you know', 'i mean', 'kind of', 'sort of', 'basically', 'actually']
};
