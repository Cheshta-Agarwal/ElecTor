// DOM Elements (unchanged)
const chatContainer = document.querySelector(".chat-container");
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");

// API Setup (unchanged)
const API_KEY = "AIzaSyBIPlZ_d2Wn93DWdjZ4iSlAW_DiE8k7sPU";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// India-Specific Conversation History
let conversationHistory = [
    {
        role: "user",
        parts: [{
            text: `You are VoterBot, an AI assistant for Indian voter registration. Follow this protocol:
            
            1. **Greeting**: "नमस्ते! I can help you with voter registration in India. Let's check your eligibility first."
            
            2. **Eligibility Checklist**:
               - "Are you an Indian citizen?"
               - "Will you be 18+ by January 1st of next year?"
               - "Is your current residential address in India?"
            
            3. **Document Guidance**:
               - "You'll need: Voter ID Form 6, proof of address (Aadhaar/utility bill), and age proof"
               - State-specific requirements if known (e.g., local residency duration)
            
            4. **Process Options**:
               - Online (NVSP portal) / Offline (BLO/ERO office)
               - "Deadline: Typically 1 week before revision date"
            
            5. **FAQs**:
               - "To check status: https://electoralsearch.eci.gov.in/"
               - "For NRI voters: Special form 6A required"
               - "EPIC card delivery takes 2-4 weeks"
            
            6. **Tone**:
               - Official but helpful in both English/Hindi
               - "For official confirmation, contact your local Electoral Registration Officer"
            
            Start by greeting in Hindi/English and asking the first eligibility question.`
        }]
    },
    {
        role: "model",
        parts: [{
            text: `नमस्ते! भारतीय मतदाता पंजीकरण सहायक 🌸\n\nLet's check your eligibility:\n\n1. क्या आप भारतीय नागरिक हैं? (Are you an Indian citizen?)\n2. क्या आपकी आयु अगले वर्ष की 1 जनवरी तक 18+ हो जाएगी? (Will you be 18+ by next January 1st?)\n3. क्या आप भारत में निवास करते हैं? (Do you reside in India?)\n\nYou can reply with yes/no to each.`
        }]
    }
];

let isBotResponding = false;
let controller, typingInterval;

// Function to create message elements
const createMessageElement = (content, isUser) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = isUser ? "user-message" : "bot-message";
    messageDiv.innerHTML = `<p>${content}</p>`;
    return messageDiv;
};

// Scroll to the bottom of the chat
const scrollToBottom = () => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

// Simulate typing effect
const typingEffect = (text, element) => {
    element.textContent = "";
    let i = 0;
    typingInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            isBotResponding = false;
        }
    }, 20);
};

// Generate API response
const generateVoterResponse = async (userMessage) => {
    isBotResponding = true;
    controller = new AbortController();
    
    // Add user message to history
    conversationHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    try {
        // Create loading message
        const loadingMsg = createMessageElement("Checking voter information...", false);
        chatMessages.appendChild(loadingMsg);
        scrollToBottom();

        // API call
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: conversationHistory }),
            signal: controller.signal
        });

        if (!response.ok) throw new Error(await response.text());
        
        const data = await response.json();
        const botResponse = data.candidates[0].content.parts[0].text;

        // Remove loading and show actual response
        chatMessages.removeChild(loadingMsg);
        const botMessage = createMessageElement("", false);
        chatMessages.appendChild(botMessage);
        typingEffect(botResponse, botMessage.querySelector("p"));

        // Add to conversation history
        conversationHistory.push({
            role: "model",
            parts: [{ text: botResponse }]
        });

    } catch (error) {
        console.error("API Error:", error);
        const errorMsg = createMessageElement(
            "⚠️ Please visit [vote.gov](https://www.vote.gov) for official registration help.", 
            false
        );
        chatMessages.appendChild(errorMsg);
        isBotResponding = false;
    }
};

// Handle user input
const handleUserInput = () => {
    const message = userInput.value.trim();
    if (!message || isBotResponding) return;

    // Add user message to UI
    const userMsg = createMessageElement(message, true);
    chatMessages.appendChild(userMsg);
    userInput.value = "";
    scrollToBottom();

    // Generate bot response
    generateVoterResponse(message);
};

// Event Listeners
sendButton.addEventListener("click", handleUserInput);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserInput();
});

// Initial UI setup
window.addEventListener("DOMContentLoaded", () => {
    // Display the first bot message from conversationHistory
    const initialMsg = createMessageElement(
        conversationHistory[1].parts[0].text, 
        false
    );
    chatMessages.appendChild(initialMsg);
});
