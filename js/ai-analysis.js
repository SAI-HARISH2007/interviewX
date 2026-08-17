// AI Analysis Manager - Gemini API integration with strict, rubric-based evaluation.
// Degrades gracefully to a local heuristic scorer when the API is unavailable.

class AIAnalyzer {
    constructor() {
        this.apiKey = InterviewXConfig.gemini.apiKey;
        this.apiEndpoint = InterviewXConfig.gemini.endpoint;
    }

    async analyzeAnswer(question, answer, context = {}) {
        if (!this.apiKey) {
            console.warn('No Gemini API key configured; using local analysis.');
            return this.getStrictFallbackAnalysis(answer, context);
        }

        try {
            const prompt = this.buildStrictPrompt(question, answer, context);

            const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: InterviewXConfig.gemini.temperature,
                        maxOutputTokens: InterviewXConfig.gemini.maxOutputTokens,
                    }
                })
            });

            if (!response.ok) {
                console.error('Gemini API error:', response.status);
                return this.getStrictFallbackAnalysis(answer, context);
            }

            const data = await response.json();
            const aiResponse = data.candidates[0].content.parts[0].text;

            return this.parseAIResponse(aiResponse, answer, context);
        } catch (error) {
            console.error('AI Analysis Error:', error);
            return this.getStrictFallbackAnalysis(answer, context);
        }
    }

    buildStrictPrompt(question, answer, context) {
        return `You are a STRICT and CRITICAL interview evaluator. Your job is to evaluate answers honestly and identify real weaknesses.

Interview Question: "${question}"

Candidate's Answer: "${answer}"

Performance Metrics:
- Response Time: ${context.responseTime || 0} seconds
- Word Count: ${context.wordCount || 0} words
- Filler Words Detected: ${context.fillerCount || 0}
- Visual Presence (subject in frame / stable camera): ${context.presenceLevel || 0}%

EVALUATION CRITERIA (Be STRICT):
1. RELEVANCE: Does the answer actually address the question? (30 points)
2. DEPTH: Specific examples, details, STAR method? (25 points)
3. CLARITY: Clear, structured, professional language? (20 points)
4. DELIVERY: Appropriate length, minimal fillers, good pacing? (15 points)
5. CONFIDENCE: Shows competence and self-assurance? (10 points)

SCORING GUIDELINES:
- 90-100: Exceptional answer with specific examples, perfect structure
- 70-89: Good answer with some examples but missing depth
- 50-69: Average answer, addresses question but lacks specifics
- 30-49: Weak answer, vague, too short/long, or off-topic
- 0-29: Poor answer, doesn't address question, gibberish, or inappropriate

IMPORTANT: If the answer is:
- Vague or generic without examples → Maximum 60 points
- Too short (under 30 words) → Maximum 50 points
- Off-topic or doesn't answer the question → Maximum 40 points
- Gibberish, random words, or makes no sense → Maximum 20 points
- Has 5+ filler words → Deduct 10 points

Provide evaluation in this EXACT format:
Score: [0-100]
Strengths:
- [specific strength 1]
- [specific strength 2 if any]
Weaknesses:
- [specific weakness 1]
- [specific weakness 2]
- [specific weakness 3 if any]
Suggestions:
[Specific actionable advice to improve]

Be honest and critical. Don't give high scores for mediocre answers.`;
    }

    parseAIResponse(response, answer, context) {
        // Extract score
        const scoreMatch = response.match(/Score[:\s]*(\d+)/i);
        let score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

        // Apply additional penalties based on actual metrics
        score = this.applyStrictPenalties(score, answer, context);

        // Extract strengths
        const strengthsMatch = response.match(/Strengths:(.*?)(?=Weaknesses|Suggestions|$)/is);
        const strengthsText = strengthsMatch ? strengthsMatch[1].trim() : '';
        const strengths = strengthsText.split('\n')
            .filter(s => s.trim() && s.includes('-'))
            .map(s => s.trim());

        // Extract weaknesses
        const weaknessesMatch = response.match(/Weaknesses:(.*?)(?=Suggestions|$)/is);
        const weaknessesText = weaknessesMatch ? weaknessesMatch[1].trim() : '';
        const improvements = weaknessesText.split('\n')
            .filter(s => s.trim() && s.includes('-'))
            .map(s => s.trim());

        // Extract suggestions
        const suggestionsMatch = response.match(/Suggestions:(.*?)$/is);
        const suggestions = suggestionsMatch ?
            suggestionsMatch[1].trim() :
            'Focus on providing specific examples using the STAR method.';

        return {
            score: clamp(score, 0, 100),
            strengths: strengths.length > 0 ? strengths : ['Attempted to answer the question'],
            improvements: improvements.length > 0 ? improvements : ['Needs more specific examples', 'Should provide more detail'],
            suggestions,
            fullResponse: response
        };
    }

    applyStrictPenalties(baseScore, answer, context) {
        let finalScore = baseScore;
        const wordCount = context.wordCount || 0;
        const fillerCount = context.fillerCount || 0;

        // Too short penalty
        if (wordCount < 20) {
            finalScore = Math.min(finalScore, 40);
        }

        // Too long penalty
        if (wordCount > 200) {
            finalScore -= 10;
        }

        // Filler words penalty (strict)
        if (fillerCount >= 5) {
            finalScore -= 15;
        } else if (fillerCount >= 3) {
            finalScore -= 10;
        }

        // Check for gibberish or random words
        if (this.isGibberishOrRandom(answer)) {
            finalScore = Math.min(finalScore, 25);
        }

        // Check for one-word or extremely vague answers
        if (this.isVagueOrMinimal(answer)) {
            finalScore = Math.min(finalScore, 35);
        }

        return clamp(finalScore, 0, 100);
    }

    isGibberishOrRandom(text) {
        const words = text.toLowerCase().trim().split(/\s+/);

        // Check for very short answers with random words
        if (words.length < 5) return true;

        // Check for repeated words (like "test test test")
        const uniqueWords = new Set(words);
        if (uniqueWords.size < words.length * 0.5) return true;

        // Check for lack of common interview words
        const interviewKeywords = ['experience', 'work', 'team', 'project', 'skill', 'learn', 'help', 'improve', 'challenge', 'achieve', 'because', 'when', 'where', 'what', 'how'];
        const hasKeywords = interviewKeywords.some(keyword => text.toLowerCase().includes(keyword));

        return !hasKeywords && words.length < 15;
    }

    isVagueOrMinimal(text) {
        const vagueWords = ['good', 'nice', 'fine', 'ok', 'okay', 'yes', 'no', 'maybe', 'sure', 'idk', 'dunno'];
        const words = text.toLowerCase().trim().split(/\s+/);

        // If answer is mostly vague words
        return words.length <= 5 && vagueWords.some(v => text.toLowerCase().includes(v));
    }

    getStrictFallbackAnalysis(answer, context) {
        // STRICT local analysis when the API is unavailable
        let score = 40;
        const wordCount = context.wordCount || 0;
        const fillerCount = context.fillerCount || 0;
        const responseTime = context.responseTime || 0;

        const strengths = [];
        const improvements = [];

        if (this.isGibberishOrRandom(answer)) {
            score = 15;
            improvements.push('Answer appears to be random words or gibberish');
            improvements.push('Must provide a coherent, relevant response');
            improvements.push('Answer must actually address the question asked');
        } else if (this.isVagueOrMinimal(answer)) {
            score = 25;
            improvements.push('Answer is too vague or minimal');
            improvements.push('Provide specific examples and details');
        } else {
            if (wordCount >= 40 && wordCount <= 150) {
                score += 20;
                strengths.push('Appropriate answer length');
            } else if (wordCount < 20) {
                score -= 15;
                improvements.push('Answer too short - provide more detail');
            } else if (wordCount > 200) {
                score -= 10;
                improvements.push('Answer too long - be more concise');
            }

            if (fillerCount === 0) {
                score += 15;
                strengths.push('No filler words detected');
            } else if (fillerCount < 3) {
                score += 5;
                strengths.push('Minimal filler words');
            } else if (fillerCount >= 5) {
                score -= 15;
                improvements.push(`Too many filler words (${fillerCount}) - practice speaking clearly`);
            } else {
                score -= 5;
                improvements.push(`Reduce filler words (detected ${fillerCount})`);
            }

            if (responseTime >= 5 && responseTime <= 45) {
                score += 10;
                strengths.push('Good response timing');
            } else if (responseTime < 5) {
                score -= 10;
                improvements.push('Too quick - take time to think');
            }
        }

        if (strengths.length === 0) {
            strengths.push('Attempted to answer');
        }

        if (improvements.length === 0) {
            improvements.push('Needs specific examples');
            improvements.push('Should use STAR method');
        }

        score = clamp(score, 0, 100);

        return {
            score,
            strengths,
            improvements,
            suggestions: score < 50 ?
                'CRITICAL: Your answer needs significant improvement. Provide relevant, detailed responses with specific examples. Use the STAR method: describe the Situation, Task, Action you took, and Result achieved.' :
                score < 70 ?
                'Your answer is average. Add more specific examples and details. Use the STAR method to structure your responses better.' :
                'Good effort! Continue adding specific examples and quantifiable results to make your answers even stronger.',
            fullResponse: `Strict fallback analysis - Score: ${score}/100`
        };
    }

    formatFeedback(analysis) {
        const scoreColor = analysis.score >= 70 ? '#28a745' : analysis.score >= 50 ? '#ffc107' : '#dc3545';
        const scoreLabel = analysis.score >= 80 ? 'Excellent' :
            analysis.score >= 70 ? 'Good' :
            analysis.score >= 50 ? 'Average' :
            analysis.score >= 30 ? 'Needs Work' : 'Poor - Requires Major Improvement';

        const strengths = analysis.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('');
        const improvements = analysis.improvements.map(i => `<li>${escapeHtml(i)}</li>`).join('');
        const suggestions = escapeHtml(analysis.suggestions).replace(/\n/g, '<br>');

        return `
            <div class="ai-feedback-section">
                <div class="ai-score">
                    <h4 style="color: ${scoreColor}">AI Score: ${analysis.score}/100</h4>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${analysis.score}%; background: ${scoreColor}"></div>
                    </div>
                    <p class="score-label" style="color: ${scoreColor}">${scoreLabel}</p>
                </div>
                ${analysis.strengths.length > 0 ? `
                <div class="strengths">
                    <h4>Strengths</h4>
                    <ul>${strengths}</ul>
                </div>` : ''}
                <div class="improvements">
                    <h4>Areas for Improvement</h4>
                    <ul>${improvements}</ul>
                </div>
                <div class="suggestions">
                    <h4>Suggestions</h4>
                    <p>${suggestions}</p>
                </div>
            </div>
        `;
    }
}

// Create global AI analyzer instance
const aiAnalyzer = new AIAnalyzer();
