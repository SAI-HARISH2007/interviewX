// Camera Manager - Handles webcam access and a lightweight "visual presence"
// estimate. Presence is derived from simple frame analysis (subject visible in
// the frame + scene stability). It is NOT facial, emotion, or confidence
// recognition — labels and copy reflect that honestly.

class CameraManager {
    constructor() {
        this.videoElement = document.getElementById('videoElement');
        this.canvas = document.getElementById('videoCanvas');
        this.cameraStatus = document.getElementById('cameraStatus');
        this.stream = null;
        this.isActive = false;
        this.presenceLevel = 0;
        this.analysisInterval = null;
        this.lastBrightness = 0;
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            this.videoElement.srcObject = this.stream;
            this.isActive = true;
            this.cameraStatus.textContent = '📹 Camera Active';
            this.cameraStatus.classList.add('active');

            this.startPresenceAnalysis();

            return { success: true, message: 'Camera started successfully!' };
        } catch (error) {
            console.error('Camera error:', error);
            this.cameraStatus.textContent = '❌ Camera Error';
            return { success: false, message: 'Camera access failed. Please check browser permissions.' };
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
            this.stream = null;
            this.isActive = false;
            this.cameraStatus.textContent = 'Camera Off';
            this.cameraStatus.classList.remove('active');

            this.stopPresenceAnalysis();
        }
    }

    startPresenceAnalysis() {
        // Analyze every 500ms
        this.analysisInterval = setInterval(() => {
            if (this.isActive) {
                this.analyzePresence();
            }
        }, InterviewXConfig.timing.presenceAnalysisMs);
    }

    stopPresenceAnalysis() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
    }

    analyzePresence() {
        const canvas = this.canvas;
        const ctx = canvas.getContext('2d');

        // Set canvas size to match video
        canvas.width = this.videoElement.videoWidth || 640;
        canvas.height = this.videoElement.videoHeight || 480;

        // Draw current video frame to canvas
        ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Sample the center region (where the subject usually is)
            let totalBrightness = 0;
            let pixelCount = 0;

            const centerX = Math.floor(canvas.width * 0.3);
            const centerY = Math.floor(canvas.height * 0.2);
            const width = Math.floor(canvas.width * 0.4);
            const height = Math.floor(canvas.height * 0.6);

            for (let y = centerY; y < centerY + height; y += 5) {
                for (let x = centerX; x < centerX + width; x += 5) {
                    const i = (y * canvas.width + x) * 4;
                    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
                    pixelCount++;
                }
            }

            const avgBrightness = totalBrightness / pixelCount;

            // Frame-to-frame brightness delta approximates scene stability
            const brightnessDiff = Math.abs(avgBrightness - this.lastBrightness);
            this.lastBrightness = avgBrightness;

            // Presence score (0-100): subject visibly in frame + stable scene
            let presence = 50;

            if (avgBrightness > 50 && avgBrightness < 200) {
                presence += 25;
            }

            if (brightnessDiff < 10) {
                presence += 15;
            } else if (brightnessDiff > 30) {
                presence -= 15;
            }

            if (avgBrightness > 60) {
                presence += 10;
            }

            this.presenceLevel = clamp(presence, 0, 100);
            this.updatePresenceUI();
        } catch (error) {
            // If canvas operations fail, keep the last value
            console.error('Presence analysis error:', error);
        }
    }

    updatePresenceUI() {
        const bar = document.getElementById('presenceBar');
        const text = document.getElementById('presenceText');

        bar.style.width = this.presenceLevel + '%';

        bar.className = 'presence-bar';
        if (this.presenceLevel < 40) {
            bar.classList.add('low');
        } else if (this.presenceLevel < 70) {
            bar.classList.add('medium');
        } else {
            bar.classList.add('high');
        }

        text.textContent = Math.round(this.presenceLevel) + '% Presence';
    }

    getPresenceLevel() {
        return this.presenceLevel;
    }
}

// Create global camera instance
const cameraManager = new CameraManager();
