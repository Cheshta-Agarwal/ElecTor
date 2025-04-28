// DOM Elements
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

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
      parts: [{ text: `System: ${SYSTEM_PROMPT.en}` }] // Keep system prompt in English
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
    
    // Prepare message with context
    const messageWithContext = `[Language: ${currentLanguage}, Location: India] ${userData.message}`;
    
    // Add to chat history
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
              { role: "user", parts: [{ text: SYSTEM_PROMPT.en }] }, // System prompt
              ...chatHistory.filter(msg => msg.role === "model" || 
                (msg.role === "user" && !msg.parts[0].text.startsWith("System:")))
            ]
          }),
          signal: controller.signal,
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || LANGUAGE_CONTENT[currentLanguage].error);
        
        // Process response to make it concise
        let responseText = data.candidates[0].content.parts[0].text;
        
        // Check if this is an assertion that needs bullet points
        const needsBulletPoints = userData.message.toLowerCase().includes("what") || 
                                 userData.message.toLowerCase().includes("list") ||
                                 userData.message.toLowerCase().includes("require");
        
        if (needsBulletPoints) {
          // Extract first 3 points if available
          const points = responseText.split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./))
            .slice(0, 3);
          
          if (points.length > 0) {
            responseText = points.join('\n');
          } else {
            // If no bullet points found, limit to 3 sentences
            const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
            if (sentences.length > 3) {
              responseText = sentences.slice(0, 3).join('. ') + '.';
            }
          }
        } else {
          // For normal responses, limit to 3 sentences
          const sentences = responseText.split(/[.!?]+/).filter(s => s.trim().length > 0);
          if (sentences.length > 3) {
            responseText = sentences.slice(0, 3).join('. ') + '.';
          }
        }
        
        // Add confirmation
        responseText += currentLanguage === 'en' ? 
          "\n\nDid this help?" : 
          "\n\nक्या यह मददगार था?";
        
        typingEffect(responseText, textElement, botMsgDiv);
        
        // Add to history
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

    const SYSTEM_PROMPT = {
        en: `You are VoteAssist, a voter registration assistant for India. Follow these rules:
        1. Provide only factual information
        2. Keep responses under 3 sentences
        3. For requirements/questions, list maximum 3 bullet points
        4. Always confirm if the answer helped`,
        hi: `आप वोटअसिस्ट हैं, भारत के लिए मतदाता पंजीकरण सहायक। नियम:
        1. केवल तथ्यात्मक जानकारी दें
        2. प्रतिक्रियाएँ 3 वाक्यों से अधिक नहीं
        3. आवश्यकताओं/प्रश्नों के लिए अधिकतम 3 बुलेट पॉइंट्स
        4. हमेशा पुष्टि करें कि क्या उत्तर सहायक था`
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
  
  // User message display
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;
  
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();
  
  // Bot response
  setTimeout(() => {
    const processingText = LANGUAGE_CONTENT[currentLanguage].processing;
    const botMsgHTML = `<img class="avatar" src="gemini.svg" /> <p class="message-text">${processingText}</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// Existing Event Listeners (keep these the same)
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
