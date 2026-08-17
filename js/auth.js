// Authentication Manager
class AuthManager {
    constructor() {
        this.authScreen = document.getElementById('authScreen');
        this.mainApp = document.getElementById('mainApp');
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
        this.authMessage = document.getElementById('authMessage');
        
        this.initializeAuth();
        this.setupEventListeners();
    }

    initializeAuth() {
        // Check if user is already logged in
        const currentUser = storage.getCurrentUser();
        if (currentUser) {
            this.showMainApp(currentUser);
        } else {
            this.showAuthScreen();
        }
    }

    setupEventListeners() {
        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.handleLogin();
        });

        // Signup button
        document.getElementById('signupBtn').addEventListener('click', () => {
            this.handleSignup();
        });

        // Toggle between login and signup
        document.getElementById('showSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Enter key support
        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        document.getElementById('signupConfirmPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignup();
        });
    }

    handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showMessage('Please fill in all fields!', 'error');
            return;
        }

        const result = storage.loginUser(username, password);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                this.showMainApp(result.user);
            }, 1000);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    handleSignup() {
        const name = document.getElementById('signupName').value.trim();
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;

        // Validation
        if (!name || !username || !password || !confirmPassword) {
            this.showMessage('Please fill in all fields!', 'error');
            return;
        }

        if (username.length < 3) {
            this.showMessage('Username must be at least 3 characters!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters!', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match!', 'error');
            return;
        }

        const result = storage.registerUser(username, password, name);
        
        if (result.success) {
            this.showMessage(result.message, 'success');
            setTimeout(() => {
                this.showLoginForm();
                // Auto-fill username
                document.getElementById('loginUsername').value = username;
            }, 1500);
        } else {
            this.showMessage(result.message, 'error');
        }
    }

    handleLogout() {
        Modal.confirm({
            title: 'Log out',
            message: 'Are you sure you want to log out?',
            confirmText: 'Log out',
            onConfirm: () => {
                storage.logout();
                this.showAuthScreen();
                this.clearForms();
            }
        });
    }

    showLoginForm() {
        this.loginForm.classList.add('active');
        this.signupForm.classList.remove('active');
        this.clearMessage();
    }

    showSignupForm() {
        this.signupForm.classList.add('active');
        this.loginForm.classList.remove('active');
        this.clearMessage();
    }

    showAuthScreen() {
        this.authScreen.classList.remove('hidden');
        this.mainApp.classList.add('hidden');
    }

    showMainApp(user) {
        this.authScreen.classList.add('hidden');
        this.mainApp.classList.remove('hidden');
        
        // Update user name in header
        document.getElementById('userName').textContent = `Welcome, ${user.name}!`;
        
        // Load user's interview history
        this.loadUserHistory(user.username);
    }

    loadUserHistory(username) {
        const history = storage.getHistory(username);
        const historyContainer = document.getElementById('historyContainer');
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<p>No previous interviews. Start your first interview!</p>';
            return;
        }

        historyContainer.innerHTML = '';
        history.slice().reverse().forEach((session, index) => {
            const isLLM = session.feedbackSource === 'llm';
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-head">
                    <h4>#${history.length - index} · ${escapeHtml(session.role || 'General')}</h4>
                    <span class="source-badge ${isLLM ? 'llm' : 'offline'}">${isLLM ? '🤖 LLM scored' : '⚠️ Heuristic'}</span>
                </div>
                <p class="history-date">${new Date(session.timestamp).toLocaleString()}</p>
                <div class="history-stats">
                    <span><strong>${session.questionsAnswered || 0}</strong> questions</span>
                    <span><strong>${session.aiScore != null ? session.aiScore + '/10' : 'N/A'}</strong> score</span>
                    <span><strong>${session.avgPresence ?? session.avgConfidence ?? 0}%</strong> presence</span>
                    <span><strong>${session.totalFillers || 0}</strong> fillers</span>
                </div>
            `;
            historyContainer.appendChild(historyItem);
        });
    }

    showMessage(message, type) {
        this.authMessage.textContent = message;
        this.authMessage.className = `auth-message ${type}`;
        this.authMessage.style.display = 'block';
    }

    clearMessage() {
        this.authMessage.style.display = 'none';
        this.authMessage.textContent = '';
        this.authMessage.className = 'auth-message';
    }

    clearForms() {
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('signupName').value = '';
        document.getElementById('signupUsername').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupConfirmPassword').value = '';
    }
}

// Initialize auth when DOM is loaded
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});