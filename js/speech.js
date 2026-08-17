// Speech Manager - Handles voice recognition and synthesis.

class SpeechManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.transcript = '';         // final (committed) results
        this.interimTranscript = '';  // live partial results for display only

        this.initSpeechRecognition();
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        let silenceTimer = null;

        this.recognition.onstart = () => {
            this.isListening = true;
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript + ' ';
                }
            }

            if (finalTranscript) {
                this.transcript += finalTranscript;

                // Reset the silence timer on new speech so the answer is not
                // submitted while the user is still talking.
                if (silenceTimer) clearTimeout(silenceTimer);

                silenceTimer = setTimeout(() => {
                    if (this.transcript.trim().length >= InterviewXConfig.interview.minAnswerLength && this.isListening) {
                        this.stopListening();
                        if (window.app && window.app.isInterviewActive) {
                            window.app.submitAnswer();
                        }
                    }
                }, InterviewXConfig.timing.silenceAutoSubmitMs);
            }

            this.interimTranscript = interimTranscript;
            this.updateTranscriptDisplay();
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (silenceTimer) clearTimeout(silenceTimer);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            if (silenceTimer) clearTimeout(silenceTimer);
        };
    }

    startListening() {
        if (!this.recognition || this.isListening) return false;

        try {
            this.transcript = '';
            this.interimTranscript = '';
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            return false;
        }
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return false;

        try {
            this.recognition.stop();
            return true;
        } catch (error) {
            console.error('Failed to stop speech recognition:', error);
            return false;
        }
    }

    // Final transcript only (used for analysis).
    getTranscript() {
        return this.transcript.trim();
    }

    // Combined final + interim length, so a user who is mid-sentence is not
    // treated as having said nothing.
    hasSpeech() {
        return (this.transcript + ' ' + this.interimTranscript).trim().length > 0;
    }

    clearTranscript() {
        this.transcript = '';
        this.interimTranscript = '';
        this.updateTranscriptDisplay();
    }

    updateTranscriptDisplay() {
        const transcriptDisplay = document.getElementById('transcriptDisplay');
        if (!transcriptDisplay) return;

        const combined = (this.transcript + ' ' + this.interimTranscript).trim();
        transcriptDisplay.textContent = combined || 'Your answer will appear here...';
    }

    // Count filler words/phrases (single words and multi-word phrases).
    countFillerWords() {
        const text = ' ' + this.transcript.toLowerCase() + ' ';
        let count = 0;

        InterviewXConfig.fillerWords.forEach(filler => {
            const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const matches = text.match(new RegExp(`\\b${escaped}\\b`, 'g'));
            count += matches ? matches.length : 0;
        });

        return count;
    }

    getWordCount() {
        return this.transcript.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    speakQuestion(text) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject('Speech synthesis not supported');
                return;
            }

            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            const voices = this.synthesis.getVoices();
            const preferredVoice = voices.find(voice =>
                voice.lang.startsWith('en') &&
                (voice.name.includes('Male') || voice.name.includes('Google'))
            ) || voices.find(voice => voice.lang.startsWith('en'));

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.rate = 0.9;
            utterance.pitch = 0.8;
            utterance.volume = 1.0;

            utterance.onstart = () => {
                this.isSpeaking = true;
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                resolve();
            };

            utterance.onerror = (event) => {
                this.isSpeaking = false;
                reject(event.error);
            };

            this.synthesis.speak(utterance);
        });
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }

    static isSupported() {
        const hasRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        const hasSynthesis = 'speechSynthesis' in window;
        return {
            recognition: hasRecognition,
            synthesis: hasSynthesis,
            full: hasRecognition && hasSynthesis
        };
    }
}

// Create global speech instance
const speechManager = new SpeechManager();
