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
        if (confirm('Are you sure you want to logout?')) {
            storage.logout();
            this.showAuthScreen();
            this.clearForms();
        }
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
        history.reverse().forEach((session, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <h4>Interview Session #${history.length - index}</h4>
                <p><strong>Date:</strong> ${new Date(session.timestamp).toLocaleString()}</p>
                <p><strong>Questions Answered:</strong> ${session.questionsAnswered || 0}</p>
                <p><strong>Average Confidence:</strong> ${session.avgConfidence || 0}%</p>
                <p><strong>AI Score:</strong> ${session.aiScore || 'N/A'}</p>
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