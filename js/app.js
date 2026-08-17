// Main Application Manager
class InterviewApp {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.isInterviewActive = false;
        this.questionStartTime = null;
        this.currentSession = {
            questionsAnswered: 0,
            totalConfidence: 0,
            totalFillers: 0,
            aiScores: []
        };
        
        this.initializeApp();
    }

    async initializeApp() {
        await this.loadQuestions();
        this.setupEventListeners();
        console.log('InterviewX initialized successfully');
    }

    async loadQuestions() {
        try {
            const response = await fetch('data/questions.json');
            const data = await response.json();
            this.questions = data.questions;
        } catch (error) {
            console.error('Error loading questions:', error);
            // Fallback questions
            this.questions = [
                {
                    question: "Tell me about yourself and your professional background.",
                    category: "General",
                    tips: "Keep it concise and relevant to the role."
                },
                {
                    question: "What are your greatest strengths?",
                    category: "Self-Assessment",
                    tips: "Provide specific examples."
                },
                {
                    question: "Describe a challenging situation you faced and how you handled it.",
                    category: "Behavioral",
                    tips: "Use the STAR method."
                }
            ];
        }
    }

    setupEventListeners() {
        // Interview controls
        document.getElementById('startInterviewBtn').addEventListener('click', () => {
            this.startInterview();
        });

        document.getElementById('stopInterviewBtn').addEventListener('click', () => {
            this.stopInterview();
        });

        // Microphone control
        document.getElementById('micBtn').addEventListener('click', () => {
            this.toggleMicrophone();
        });

        // Resume upload
        document.getElementById('uploadResumeBtn').addEventListener('click', () => {
            document.getElementById('resumeInput').click();
        });

        document.getElementById('resumeInput').addEventListener('change', (e) => {
            this.handleResumeUpload(e);
        });
    }

    async startInterview() {
        // Start camera
        const cameraResult = await cameraManager.startCamera();
        if (!cameraResult.success) {
            alert(cameraResult.message);
            return;
        }

        // Reset session data
        this.currentQuestionIndex = 0;
        this.currentSession = {
            questionsAnswered: 0,
            totalConfidence: 0,
            totalFillers: 0,
            aiScores: []
        };
        chartsManager.clearData();

        // Update UI
        this.isInterviewActive = true;
        document.getElementById('startInterviewBtn').classList.add('hidden');
        document.getElementById('stopInterviewBtn').classList.remove('hidden');
        document.getElementById('micBtn').style.display = 'none'; // Hide mic button

        // Start real-time confidence tracking
        this.startConfidenceTracking();

        // Ask first question
        setTimeout(() => {
            this.askNextQuestion();
        }, 1000);
    }

    stopInterview() {
        this.isInterviewActive = false;
        
        // Stop camera and speech
        cameraManager.stopCamera();
        speechManager.stopListening();
        speechManager.stopSpeaking();
        
        // Stop confidence tracking
        this.stopConfidenceTracking();

        // Update UI
        document.getElementById('startInterviewBtn').classList.remove('hidden');
        document.getElementById('stopInterviewBtn').classList.add('hidden');
        document.getElementById('micBtn').disabled = true;
        document.getElementById('micBtn').textContent = '🎤 Start Speaking';
        document.getElementById('micBtn').classList.remove('recording');

        // Save session to history
        this.saveSession();

        // Show summary
        this.showSessionSummary();
    }

    async askNextQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.stopInterview();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        
        // Update question display
        document.getElementById('currentQuestion').textContent = question.question;
        document.querySelector('.question-display').classList.add('new-question');
        setTimeout(() => {
            document.querySelector('.question-display').classList.remove('new-question');
        }, 600);

        // Speak the question
        try {
            await speechManager.speakQuestion(question.question);
        } catch (error) {
            console.error('Speech error:', error);
        }

        // Start timer
        this.questionStartTime = Date.now();
        this.startQuestionTimer();

        // Automatically start listening after question is spoken
        setTimeout(() => {
            this.startAutoListening();
        }, 1000);
    }

    startAutoListening() {
        speechManager.startListening();
        document.getElementById('transcriptDisplay').style.border = '2px solid #28a745';
        document.getElementById('transcriptDisplay').style.background = '#f0fff4';
        
        // Auto-submit after silence detection (30 seconds max)
        this.autoSubmitTimeout = setTimeout(() => {
            if (speechManager.getTranscript().length > 10) {
                this.submitAnswer();
            } else {
                alert('Please provide an answer to continue.');
                this.startAutoListening();
            }
        }, 30000); // 30 seconds to answer
    }

    toggleMicrophone() {
        const micBtn = document.getElementById('micBtn');
        
        if (speechManager.isListening) {
            // Stop listening and submit answer
            speechManager.stopListening();
            micBtn.textContent = '🎤 Start Speaking';
            micBtn.classList.remove('recording');
            
            // Process the answer
            this.submitAnswer();
        } else {
            // Start listening
            speechManager.startListening();
            micBtn.textContent = '🔴 Recording...';
            micBtn.classList.add('recording');
        }
    }

    async submitAnswer() {
        // Clear auto-submit timeout
        if (this.autoSubmitTimeout) {
            clearTimeout(this.autoSubmitTimeout);
        }

        const answer = speechManager.getTranscript();
        
        if (!answer || answer.length < 10) {
            alert('Please provide a more detailed answer!');
            speechManager.clearTranscript();
            this.startAutoListening(); // Restart listening
            return;
        }

        // Stop listening
        speechManager.stopListening();
        document.getElementById('transcriptDisplay').style.border = '2px solid #ddd';
        document.getElementById('transcriptDisplay').style.background = 'white';

        // Calculate response time
        const responseTime = this.questionStartTime ? 
            (Date.now() - this.questionStartTime) / 1000 : 0;

        // Get metrics
        const wordCount = speechManager.getWordCount();
        const fillerCount = speechManager.countFillerWords();
        const confidenceLevel = cameraManager.getConfidenceLevel();

        // Update stats
        this.updateStats(responseTime, wordCount, fillerCount);

        // Show loading
        this.showLoading();

        // Analyze with AI
        try {
            const analysis = await aiAnalyzer.analyzeAnswer(
                this.questions[this.currentQuestionIndex].question,
                answer,
                {
                    responseTime,
                    wordCount,
                    fillerCount,
                    confidenceLevel
                }
            );

            // Update AI feedback
            this.displayAIFeedback(analysis);

            // Update session data
            this.currentSession.questionsAnswered++;
            this.currentSession.totalConfidence += confidenceLevel;
            this.currentSession.totalFillers += fillerCount;
            this.currentSession.aiScores.push(analysis.score);

        } catch (error) {
            console.error('AI analysis error:', error);
        } finally {
            this.hideLoading();
        }

        // Clear transcript
        speechManager.clearTranscript();

        // Move to next question after delay
        setTimeout(() => {
            this.currentQuestionIndex++;
            this.askNextQuestion();
        }, 3000);
    }

    updateStats(responseTime, wordCount, fillerCount) {
        document.getElementById('responseTime').textContent = Math.round(responseTime) + 's';
        document.getElementById('wordCount').textContent = wordCount;
        document.getElementById('fillerWords').textContent = fillerCount;
    }

    displayAIFeedback(analysis) {
        const feedbackElement = document.getElementById('aiFeedback');
        feedbackElement.innerHTML = aiAnalyzer.formatFeedback(analysis);
        feedbackElement.classList.add('updating');
        
        // Update AI score
        document.getElementById('aiScore').textContent = analysis.score;

        setTimeout(() => {
            feedbackElement.classList.remove('updating');
        }, 500);
    }

    startQuestionTimer() {
        this.timerInterval = setInterval(() => {
            if (this.questionStartTime) {
                const elapsed = Math.floor((Date.now() - this.questionStartTime) / 1000);
                document.getElementById('questionTimer').textContent = `Time: ${elapsed}s`;
            }
        }, 1000);
    }

    stopQuestionTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    startConfidenceTracking() {
        this.confidenceInterval = setInterval(() => {
            if (this.isInterviewActive) {
                const confidence = cameraManager.getConfidenceLevel();
                chartsManager.addDataPoint(confidence);
            }
        }, 2000); // Update every 2 seconds
    }

    stopConfidenceTracking() {
        if (this.confidenceInterval) {
            clearInterval(this.confidenceInterval);
            this.confidenceInterval = null;
        }
        this.stopQuestionTimer();
    }

    async handleResumeUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check file type
        const validTypes = ['application/pdf', 'text/plain', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
            alert('Please upload a PDF, TXT, or Word document');
            return;
        }

        this.showLoading('Analyzing your resume...');

        try {
            let resumeText = '';
            
            // Handle text files
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                resumeText = await this.readTextFile(file);
            } 
            // Handle PDF files
            else if (file.type === 'application/pdf') {
                // For PDF, we'll extract text using a simple method
                // In production, use pdf.js library
                resumeText = await this.extractPDFText(file);
            }
            // Handle Word files
            else if (file.name.endsWith('.docx')) {
                alert('For DOCX files, please copy-paste your resume text or convert to PDF/TXT first.');
                this.hideLoading();
                return;
            }

            if (!resumeText || resumeText.length < 100) {
                alert('Unable to extract text from resume. Please use a text-based PDF or TXT file.');
                this.hideLoading();
                return;
            }

            // Analyze the resume with AI
            const analysis = await aiAnalyzer.analyzeResume(resumeText);
            
            // Show results in a modal/alert
            this.displayResumeAnalysis(analysis);

        } catch (error) {
            console.error('Resume upload error:', error);
            alert('Error processing resume. Please try a different format.');
        } finally {
            this.hideLoading();
            // Reset file input
            event.target.value = '';
        }
    }

    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async extractPDFText(file) {
        // Simple PDF text extraction (works for text-based PDFs)
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const text = new TextDecoder().decode(typedArray);
                    
                    // Extract readable text from PDF (very basic extraction)
                    // Remove PDF binary markers and extract text content
                    let cleanText = text.replace(/[^\x20-\x7E\n]/g, ' ');
                    cleanText = cleanText.replace(/\s+/g, ' ').trim();
                    
                    if (cleanText.length < 100) {
                        reject(new Error('Could not extract text from PDF'));
                    } else {
                        resolve(cleanText);
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    displayResumeAnalysis(analysis) {
        // Create a modal to show resume analysis
        const modal = document.createElement('div');
        modal.className = 'resume-modal';
        modal.innerHTML = `
            <div class="resume-modal-content">
                <div class="resume-modal-header">
                    <h2>📄 Resume Analysis Results</h2>
                    <button class="close-modal" onclick="this.closest('.resume-modal').remove()">✕</button>
                </div>
                <div class="resume-modal-body">
                    ${analysis}
                </div>
                <div class="resume-modal-footer">
                    <button class="btn primary" onclick="this.closest('.resume-modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    saveSession() {
        const currentUser = storage.getCurrentUser();
        if (!currentUser) return;

        const avgConfidence = this.currentSession.questionsAnswered > 0 ?
            Math.round(this.currentSession.totalConfidence / this.currentSession.questionsAnswered) : 0;

        const avgAIScore = this.currentSession.aiScores.length > 0 ?
            Math.round(this.currentSession.aiScores.reduce((a, b) => a + b, 0) / this.currentSession.aiScores.length) : 0;

        storage.saveHistory(currentUser.username, {
            questionsAnswered: this.currentSession.questionsAnswered,
            avgConfidence: avgConfidence,
            totalFillers: this.currentSession.totalFillers,
            aiScore: avgAIScore
        });

        // Reload history
        authManager.loadUserHistory(currentUser.username);
    }

    showSessionSummary() {
        const avgConfidence = this.currentSession.questionsAnswered > 0 ?
            Math.round(this.currentSession.totalConfidence / this.currentSession.questionsAnswered) : 0;

        const avgAIScore = this.currentSession.aiScores.length > 0 ?
            Math.round(this.currentSession.aiScores.reduce((a, b) => a + b, 0) / this.currentSession.aiScores.length) : 0;

        const message = `
Interview Complete! 🎉

Questions Answered: ${this.currentSession.questionsAnswered}
Average Confidence: ${avgConfidence}%
Total Filler Words: ${this.currentSession.totalFillers}
Average AI Score: ${avgAIScore}/100

${avgAIScore >= 80 ? 'Excellent performance! 🌟' : 
  avgAIScore >= 60 ? 'Good job! Keep practicing! 💪' : 
  'Keep practicing to improve! 📚'}
        `;

        alert(message);
    }

    showLoading(message = 'Processing with AI...') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Check speech support
    const speechSupport = SpeechManager.isSupported();
    if (!speechSupport.full) {
        console.warn('Speech features may not be fully supported');
    }

    // Initialize the application
    app = new InterviewApp();
});