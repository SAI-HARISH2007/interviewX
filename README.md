# InterviewX - Advanced AI Interview Practice Platform

An advanced web-based interview practice platform featuring AI-powered feedback, real-time confidence tracking, voice interaction, and video analysis.

## 🌟 Features

### Core Features
- ✅ **User Authentication** - Secure login/signup system
- 🎥 **Video Interview** - Real-time webcam integration
- 🎤 **Voice Recognition** - Speech-to-text for answers
- 🔊 **AI Voice** - Questions spoken by AI interviewer
- 📊 **Real-Time Analytics** - Live confidence tracking with graphs
- 🤖 **AI Feedback** - Powered by Google Gemini API
- 📄 **Resume Upload** - (Future: AI-tailored questions)
- 📜 **Interview History** - Track your progress over time
- 💾 **Data Persistence** - User data saved in browser storage

### Advanced Features
- Real-time confidence level detection based on video analysis
- Filler word detection and counting
- Response time tracking
- AI-powered answer quality scoring
- Interactive charts and visualizations
- Session history and progress tracking

## 📁 Project Structure

```
InterviewX/
│
├── index.html              # Main HTML file
├── README.md               # This file
│
├── css/
│   ├── style.css          # Main application styles
│   ├── auth.css           # Authentication page styles
│   └── dashboard.css      # Dashboard enhancements
│
├── js/
│   ├── app.js             # Main application logic
│   ├── auth.js            # Authentication management
│   ├── camera.js          # Webcam & facial analysis
│   ├── speech.js          # Voice recognition & synthesis
│   ├── ai-analysis.js     # Gemini AI integration
│   ├── charts.js          # Real-time graph updates
│   └── storage.js         # Data persistence
│
└── data/
    └── questions.json     # Interview questions database
```

## 🚀 Quick Start

### 1. Download/Clone the Project
Download all files and maintain the folder structure shown above.

### 2. Set Up the Project
```bash
# Create the folder structure
mkdir InterviewX
cd InterviewX
mkdir css js data

# Copy all files to their respective folders
```

### 3. API Key Setup
The Gemini API key is already configured in `js/ai-analysis.js`. If you need to change it:

```javascript
// In js/ai-analysis.js
this.apiKey = 'YOUR_API_KEY_HERE';
```

### 4. Run the Application
Simply open `index.html` in a modern web browser:
- **Chrome** (Recommended)
- **Edge**
- **Firefox**
- **Safari** (Limited speech support)

### 5. Grant Permissions
When prompted, allow:
- 🎤 **Microphone access** - For voice recognition
- 📹 **Camera access** - For video confidence tracking

## 📖 How to Use

### First Time Setup
1. **Create an Account**
   - Click "Sign Up"
   - Enter your full name, username, and password
   - Click "Sign Up" button

2. **Login**
   - Use your username and password
   - Click "Login"

### Starting an Interview
1. Click "▶ Start Interview"
2. Allow camera and microphone access
3. The AI will ask you a question (voice + text)
4. Click "🎤 Start Speaking" to begin your answer
5. Speak your answer clearly
6. Click "🔴 Recording..." again to submit

### During the Interview
- **Watch your confidence level** - Updates in real-time based on video
- **Monitor filler words** - System detects "um", "uh", "like", etc.
- **Track response time** - See how long you take to answer
- **Real-time graph** - Visual representation of your confidence over time

### After Each Answer
- AI analyzes your response
- You receive:
  - AI Score (0-100)
  - Strengths identified
  - Areas for improvement
  - Specific suggestions

### Ending the Interview
- Click "⏹ Stop" to end the session
- View your session summary
- Check your interview history

## 💾 User Data Storage

### How Data is Stored
User credentials are stored in **localStorage** with simple encryption:

**Format:** `username~encrypted_password~full_name`

Example users.dat content:
```
# InterviewX User Database
# Format: username~password~name
john_doe~am9objEyMzQ=~John Doe
jane_smith~amFuZTEyMzQ=~Jane Smith
```

### Export/Import Users
The system automatically saves user data. You can:
- Download user data as `users.dat`
- Import previously saved `users.dat` files

### Security Note
⚠️ **This is a development/demo implementation**
- Passwords are Base64 encoded (NOT secure for production)
- Data stored in browser localStorage
- For production, use:
  - Backend server (Node.js/Python)
  - Proper encryption (bcrypt)
  - Database (MongoDB/PostgreSQL)
  - JWT authentication

## 🎯 Tips for Best Results

### Camera Setup
- ✅ Good lighting (face clearly visible)
- ✅ Stable position (less movement = higher confidence)
- ✅ Look at the camera (simulates eye contact)
- ✅ Neutral background

### Voice Setup
- ✅ Quiet environment
- ✅ Clear speech
- ✅ Normal pace (not too fast/slow)
- ✅ Avoid filler words (um, uh, like)

### Answer Quality
- ✅ Use STAR method (Situation, Task, Action, Result)
- ✅ Be specific with examples
- ✅ 50-150 words is optimal
- ✅ Take 5-10 seconds to think before answering

## 🔧 Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure no other app is using the camera
- Try refreshing the page
- Use Chrome or Edge for best support

### Voice Recognition Not Working
- Check microphone permissions
- Ensure microphone is connected
- Speak clearly and at normal volume
- Chrome has best speech recognition support

### AI Feedback Not Loading
- Check internet connection
- Verify API key is correct
- Check browser console for errors
- System will use fallback analysis if API fails

### No Sound for Questions
- Check system volume
- Enable sound in browser
- Some browsers block autoplay - click to enable

## 🌐 Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Camera | ✅ | ✅ | ✅ | ✅ |
| Voice Recognition | ✅ | ✅ | ⚠️ | ❌ |
| Voice Synthesis | ✅ | ✅ | ✅ | ✅ |
| Charts | ✅ | ✅ | ✅ | ✅ |

✅ Fully Supported | ⚠️ Partial Support | ❌ Not Supported

## 🔒 Privacy & Data

- All data stored locally in your browser
- No data sent to external servers (except Gemini AI for analysis)
- Clear browser data to reset everything
- User data exportable/importable

## 🚀 Future Enhancements

- [ ] Backend server with proper authentication
- [ ] Resume parsing and AI-tailored questions
- [ ] Video recording and playback
- [ ] Advanced facial emotion detection
- [ ] Peer comparison and leaderboards
- [ ] Industry-specific question sets
- [ ] Multi-language support
- [ ] Mobile app version

## 📝 License

This is a demo/educational project. Feel free to modify and enhance!

## 🤝 Support

For issues or questions:
1. Check browser console for errors
2. Verify all files are in correct folders
3. Ensure internet connection for AI features
4. Try in Chrome browser for best compatibility

## 👨‍💻 Development

Built with:
- Vanilla JavaScript (No frameworks!)
- Chart.js for visualizations
- Google Gemini AI for analysis
- Web Speech API for voice features
- MediaDevices API for camera

---

**Made with ❤️ for interview success!**

Start practicing and ace your next interview! 🎯