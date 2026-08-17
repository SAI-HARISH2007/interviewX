// Storage Manager - Handles user data persistence in localStorage.
//
// NOTE: This is browser-local storage only. It is not a secure authentication
// system: data is per-device, survives only as long as the browser cache, and
// passwords are only Base64-encoded. Any production deployment needs a real
// backend with proper credential handling.

class StorageManager {
    constructor() {
        this.USERS_KEY = 'interviewx_users';
        this.CURRENT_USER_KEY = 'interviewx_current_user';
        this.HISTORY_KEY = 'interviewx_history';
        this.initStorage();
    }

    initStorage() {
        if (!this.getUsers()) {
            this.setUsers([]);
        }
    }

    _readJSON(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Storage read failed for "${key}":`, error);
            return null;
        }
    }

    _writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Storage write failed for "${key}":`, error);
        }
    }

    // Base64-encoding is NOT encryption. It obfuscates at best and is kept only
    // for this demo's data format compatibility.
    encodePassword(password) {
        return btoa(password);
    }

    decodePassword(encoded) {
        try {
            return atob(encoded);
        } catch (error) {
            return null;
        }
    }

    getUsers() {
        return this._readJSON(this.USERS_KEY) || [];
    }

    setUsers(users) {
        this._writeJSON(this.USERS_KEY, users);
    }

    registerUser(username, password, name) {
        const users = this.getUsers();

        if (users.find(u => u.username === username)) {
            return { success: false, message: 'Username already exists!' };
        }

        users.push({
            username: username,
            password: this.encodePassword(password),
            name: name,
            createdAt: new Date().toISOString(),
            lastLogin: null
        });
        this.setUsers(users);

        return { success: true, message: 'Account created successfully!' };
    }

    loginUser(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            return { success: false, message: 'User not found!' };
        }

        const decoded = this.decodePassword(user.password);
        if (decoded !== password) {
            return { success: false, message: 'Incorrect password!' };
        }

        user.lastLogin = new Date().toISOString();
        this.setUsers(users);
        this.setCurrentUser(user);

        return { success: true, message: 'Login successful!', user: user };
    }

    getCurrentUser() {
        return this._readJSON(this.CURRENT_USER_KEY);
    }

    setCurrentUser(user) {
        this._writeJSON(this.CURRENT_USER_KEY, user);
    }

    logout() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
    }

    getHistory(username) {
        const allHistory = this._readJSON(this.HISTORY_KEY) || {};
        return allHistory[username] || [];
    }

    saveHistory(username, sessionData) {
        const allHistory = this._readJSON(this.HISTORY_KEY) || {};

        if (!allHistory[username]) {
            allHistory[username] = [];
        }

        allHistory[username].push({
            ...sessionData,
            timestamp: new Date().toISOString()
        });

        const limit = InterviewXConfig.interview.historyLimit;
        if (allHistory[username].length > limit) {
            allHistory[username] = allHistory[username].slice(-limit);
        }

        this._writeJSON(this.HISTORY_KEY, allHistory);
    }
}

// Create global storage instance
const storage = new StorageManager();
