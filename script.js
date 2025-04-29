// DOM Elements
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const micButton = document.querySelector("#mic-button");
let recognition;

// Initialize Speech Recognition
const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            promptInput.value = transcript;
            handleFormSubmit(new Event('submit'));
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            const errorMsg = currentLanguage === 'en' ? 
                "Speech recognition error. Please try again." : 
                "ध्वनि पहचान में त्रुटि। कृपया पुनः प्रयास करें।";
            alert(errorMsg);
        };
    } else {
        const errorMsg = currentLanguage === 'en' ?
            "Speech Recognition is not supported in your browser." :
            "आपके ब्राउज़र में ध्वनि पहचान समर्थित नहीं है।";
        alert(errorMsg);
        if (micButton) micButton.disabled = true;
    }
};

// Text-to-Speech Function
const speakText = (text) => {
    if (!text) return;
    
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    
    // Clean the text (remove any follow-up questions after newlines)
    const cleanText = text.split('\n')[0];
    utterance.text = cleanText;
    utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
    
    // Wait for voices to be loaded
    const voices = synth.getVoices();
    if (voices.length > 0) {
        const desiredLang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
        const preferredVoice = voices.find(voice => voice.lang === desiredLang);
        utterance.voice = preferredVoice || voices.find(voice => voice.lang.includes(currentLanguage === 'hi' ? 'hi' : 'en')) || voices[0];
    }
    
    synth.speak(utterance);
};

// API Configuration
const API_KEY = "AIzaSyBIPlZ_d2Wn93DWdjZ4iSlAW_DiE8k7sPU";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Application State
let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };
let currentLanguage = "en"; // Default to English

// Language Content
const LANGUAGE_CONTENT = {
  en: {
    greeting: "Welcome! How can I assist you with voter registration today?",
    placeholder: "Ask me about voter registration...",
    processing: "Processing your request...",
    error: "Sorry, I couldn't process your request. Please try again."
  },
  hi: {
    greeting: "स्वागत है! मैं आपकी मतदाता पंजीकरण में कैसे सहायता कर सकता हूँ?",
    placeholder: "मुझसे मतदाता पंजीकरण के बारे में पूछें...",
    processing: "आपका अनुरोध प्रसंस्करण किया जा रहा है...",
    error: "क्षमा करें, मैं आपका अनुरोध संसाधित नहीं कर सका। कृपया पुनः प्रयास करें।"
  }
};

// Follow-up Questions
const FOLLOW_UP_QUESTIONS = {
    en: {
      documents: "Would you like to know where to submit these documents?",
      eligibility: "Should I explain the eligibility criteria in more detail?",
      status: "Do you want to check your registration status?",
      default: "Would you like to know about the registration process steps?"
    },
    hi: {
      documents: "क्या आप जानना चाहेंगे कि ये दस्तावेज़ कहाँ जमा करें?",
      eligibility: "क्या मैं पात्रता मानदंड के बारे में अधिक विवरण दूँ?",
      status: "क्या आप अपना पंजीकरण स्थिति जांचना चाहेंगे?",
      default: "क्या आप पंजीकरण प्रक्रिया के चरणों के बारे में जानना चाहेंगे?"
    }
};

// System Prompt
const SYSTEM_PROMPT = {
    en: `You are VoteAssist, a voter registration assistant for India. Rules:
    1. Provide only factual information
    2. Keep responses under 3 sentences
    3. For requirements/questions, list maximum 3 bullet points
    4. Focus on Indian voter registration`,
    hi: `आप वोटअसिस्ट हैं, भारत के लिए मतदाता पंजीकरण सहायक। नियम:
    1. केवल तथ्यात्मक जानकारी दें
    2. प्रतिक्रियाएँ 3 वाक्यों से अधिक नहीं
    3. आवश्यकताओं/प्रश्नों के लिए अधिकतम 3 बुलेट पॉइंट्स
    4. भारतीय मतदाता पंजीकरण पर ध्यान दें`
};

// Initialize theme
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// Helper Functions
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () => {
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
};

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  let charIndex = 0;
  typingInterval = setInterval(() => {
    if (charIndex < text.length) {
      textElement.textContent += text.charAt(charIndex++);
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
      // Speak after typing completes
      speakText(text);
    }
  }, 20);
};

// Language Handling
const setLanguage = (lang) => {
    currentLanguage = lang;
    promptInput.placeholder = LANGUAGE_CONTENT[lang].placeholder;
    document.body.classList.add("chats-active");
    
    // Clear any existing chat history
    chatHistory.length = 0;
    
    // Add system prompt to chat history
    chatHistory.push({
      role: "user",
      parts: [{ text: SYSTEM_PROMPT.en }]
    });

    const welcomeMessage = LANGUAGE_CONTENT[lang].greeting;
    setTimeout(() => {
        const botMsgHTML = `<img class="avatar" src="gemini.svg" /> <p class="message-text">${welcomeMessage}</p>`;
        const botMsgDiv = createMessageElement(botMsgHTML, "bot-message");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        chatHistory.push({ 
          role: "model", 
          parts: [{ text: welcomeMessage }] 
        });
        speakText(welcomeMessage);
    }, 300);
};

// Event Listeners for Language Buttons
document.querySelectorAll('.language-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    setLanguage(e.target.dataset.lang);
  });
});

// API Communication
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();
    
    const messageWithContext = `[Language: ${currentLanguage}, Location: India] ${userData.message}`;
    
    chatHistory.push({
      role: "user",
      parts: [{ text: messageWithContext }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
    });

    try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [
              { role: "user", parts: [{ text: SYSTEM_PROMPT.en }] },
              ...chatHistory.filter(msg => msg.role === "model" || 
                (msg.role === "user" && !msg.parts[0].text.startsWith("System:")))
            ]
          }),
          signal: controller.signal,
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || LANGUAGE_CONTENT[currentLanguage].error);
        
        let responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        
        // Determine follow-up question
        const userMessage = userData.message.toLowerCase();
        let followUpKey = 'default';
        
        if (userMessage.includes('document') || userMessage.includes('proof') || userMessage.includes('id')) {
          followUpKey = 'documents';
        } else if (userMessage.includes('eligib') || userMessage.includes('qualif') || userMessage.includes('criteria')) {
          followUpKey = 'eligibility';
        } else if (userMessage.includes('status') || userMessage.includes('check') || userMessage.includes('verify')) {
          followUpKey = 'status';
        }
        
        const followUpQuestion = FOLLOW_UP_QUESTIONS[currentLanguage][followUpKey];
        
        // Format response
        if (userMessage.includes("what") || userMessage.includes("list") || userMessage.includes("require")) {
          const points = responseText.split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./))
            .slice(0, 3);
          
          responseText = points.length > 0 ? points.join('\n') : responseText;
        } else {
          const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
          responseText = sentences.length > 3 ? sentences.slice(0, 3).join('. ') + '.' : responseText;
        }
        
        responseText += `\n\n${followUpQuestion}`;
        
        typingEffect(responseText, textElement, botMsgDiv);
        
        chatHistory.push({ 
          role: "model", 
          parts: [{ text: responseText }] 
        });
        
    } catch (error) {
        textElement.textContent = error.name === "AbortError" ? 
          (currentLanguage === "en" ? "Response stopped." : "प्रतिक्रिया रोक दी गई।") : 
          error.message;
        textElement.style.color = "#d62939";
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
    }
};

// Form Submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;
  
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
  
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;
  
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();
  
  setTimeout(() => {
    const processingText = LANGUAGE_CONTENT[currentLanguage].processing;
    const botMsgHTML = `<img class="avatar" src="gemini.svg" /> <p class="message-text">${processingText}</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// File Input Handling
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

// Other Event Listeners
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  const loadingMsg = chatsContainer.querySelector(".bot-message.loading");
  if (loadingMsg) {
    loadingMsg.classList.remove("loading");
    loadingMsg.querySelector(".message-text").textContent = 
      currentLanguage === "en" ? "Response stopped." : "प्रतिक्रिया रोक दी गई।";
  }
  document.body.classList.remove("bot-responding");
});

themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

if (micButton) {
    micButton.addEventListener("click", () => {
        if (recognition) {
            recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
            recognition.start();
        }
    });
}

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Mobile controls handling
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || 
                    (wrapper.classList.contains("hide-controls") && 
                    (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

// Initialize on load
window.addEventListener('load', () => {
    initializeSpeechRecognition();
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = function() {};
    }
});
