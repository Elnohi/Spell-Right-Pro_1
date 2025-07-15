# 🧠 SpellRightPro

SpellRightPro is a smart spelling trainer app that helps students, healthcare professionals, and language learners improve spelling and listening accuracy through voice-based and text-based spelling practice.

**Live Demo:**  
👉 [Visit App](https://yourusername.github.io/SpellRightPro)

---

## ✨ Features

### 🆓 Freemium Version (`index.html`)
- ✅ OET word exam mode (24 words)
- ✅ Text-to-speech support (American/British)
- ✅ Custom word list (one upload/day)
- ✅ Score summary
- ✅ Desktop sidebar AdSense placeholders
- 🔒 Upgrade button to Premium

### 💎 Premium Version (`premium.html`)
- ✅ All Freemium features
- ✅ Spelling Bee mode (voice spelling recognition)
- ✅ Custom exam mode with spoken words
- ✅ Full scoring summary
- ✅ Visual polish and improved layout
- ❌ No ads

---

## 🔐 Login (Firebase Authentication)

Users must log in to access the app.  
Login is anonymous and handled via Firebase.

**Login Page:** [`login.html`](login.html)

> 🔒 Redirects automatically after login.

---

## 🛠️ Folder Structure

SpellRightPro/
├── index.html # Freemium app
├── premium.html # Premium app
├── login.html # Login page
├── css/
│ └── styles.css # Shared styles
├── js/
│ ├── firebase-config.js
│ ├── oet_word_list.js
│ ├── exam-loader.js
│ ├── tts.js
│ ├── stt.js
│ └── spelling-check.js
├── assets/
│ └── logo.png
├── ads/
│ └── adsense-desktop.html

yaml
Copy
Edit

---

## 🚀 Deployment

This app runs entirely client-side (HTML + JS) and is perfect for GitHub Pages.

### To Deploy:
1. Push to your GitHub repository.
2. Go to **Settings → Pages**.
3. Set Source to `main` branch and `/ (root)`.
4. Visit: `https://yourusername.github.io/SpellRightPro`

---

## 📦 Requirements

- Firebase Project (Auth enabled for anonymous login)
- Google AdSense (optional)
- GitHub Pages (for deployment)

---

## 👩‍💻 Contributing

Pull requests and suggestions are welcome!  
Please open an issue to discuss before making major changes.

---

## 📄 License

This project is licensed by **Sami Elnohi**.  
All rights reserved © 2025.

