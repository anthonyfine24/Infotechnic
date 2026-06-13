// ========== Infotechnik AI - GEMINI API KEY ==========
// IMPORTANT: Replace this with your actual Gemini API key
const GEMINI_API_KEY = "API KEY HERE";  // <-- PASTE YOUR API KEY HERE

// ========== Infotechnik AI Workflow Engine ==========
const chatContainer = document.getElementById('chatMessages');
const userInputField = document.getElementById('userInput');
const sendButton = document.getElementById('sendBtn');

// Workflow State
let currentStep = 'start';
let collectedData = {};
let isAiTyping = false;
let pendingUserMessage = null;

// Auto-resize textarea
function autoResizeTextarea() {
  userInputField.style.height = 'auto';
  userInputField.style.height = Math.min(userInputField.scrollHeight, 120) + 'px';
}
userInputField.addEventListener('input', autoResizeTextarea);

function scrollToBottom() {
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

function formatGeminiResponse(text) {
  if (!text) return '';

  // First, convert markdown headers to proper HTML
  let formatted = text;

  // Convert markdown headers (## Header) to HTML headers
  formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Convert bold text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert italic text
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Convert unordered lists (items starting with - or *)
  formatted = formatted.replace(/^[\-\*] (.*$)/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Convert ordered lists (items starting with numbers)
  formatted = formatted.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

  // Convert line breaks to proper spacing
  formatted = formatted.replace(/\n\n/g, '</p><p>');
  formatted = formatted.replace(/\n/g, '<br>');

  // Wrap in paragraph tags
  if (!formatted.startsWith('<')) {
    formatted = '<p>' + formatted + '</p>';
  }

  // Clean up any double HTML tags
  formatted = formatted.replace(/<\/p><p>/g, '</p>\n\n<p>');

  // Add spacing for readability
  formatted = formatted.replace(/<\/h1>/g, '</h1>\n');
  formatted = formatted.replace(/<\/h2>/g, '</h2>\n');
  formatted = formatted.replace(/<\/h3>/g, '</h3>\n');
  formatted = formatted.replace(/<\/ul>/g, '</ul>\n');
  formatted = formatted.replace(/<\/li>/g, '</li>\n');

  return formatted;
}

function appendMessage(content, sender, isHtml = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('message-avatar');
  if (sender === 'user') {
    avatarDiv.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  } else {
    avatarDiv.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');

  // Checks if content is HTML or plain text
  if (isHtml) {
    // If it's already HTML, set it directly
    contentDiv.innerHTML = content;
  } else {
    // For plain text, create a paragraph
    const p = document.createElement('p');
    p.textContent = content;
    contentDiv.appendChild(p);
  }

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

function appendFormattedResponse(content, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);

  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('message-avatar');
  if (sender === 'user') {
    avatarDiv.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  } else {
    avatarDiv.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');

  // Format the response for clean display using the new formatter function
  const formattedContent = formatGeminiResponse(content);
  contentDiv.innerHTML = formattedContent;

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

function showTypingIndicator() {
  if (document.getElementById('aiTypingIndicator')) return;
  const typingDiv = document.createElement('div');
  typingDiv.classList.add('message', 'ai');
  typingDiv.id = 'aiTypingIndicator';
  const avatar = document.createElement('div');
  avatar.classList.add('message-avatar');
  avatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const typingContent = document.createElement('div');
  typingContent.classList.add('typing-indicator');
  typingContent.innerHTML = `<span></span><span></span><span></span>`;
  typingDiv.appendChild(avatar);
  typingDiv.appendChild(typingContent);
  chatContainer.appendChild(typingDiv);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById('aiTypingIndicator');
  if (indicator) indicator.remove();
}

// ========== Gemini API Integration ==========
async function sendToGemini(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error('Please configure your Gemini API key in the script. Get a free key from https://aistudio.google.com/app/apikey');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;


  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `You are Infotechnik AI, an expert IT infrastructure consultant. Your role is to provide detailed, actionable, and professional IT solutions based on the user's requirements. 

IMPORTANT FORMATTING INSTRUCTIONS:
- Use markdown formatting for better readability
- Use ## for main section headers (like "Executive Summary", "Detailed Analysis", etc.)
- Use ### for subsection headers
- Use bullet points (starting with - or *) for lists
- Use numbers for ordered lists
- Use **bold** for emphasis on important terms
- Separate sections with blank lines
- Keep paragraphs concise and well-structured

User's request:
${prompt}

Please provide a comprehensive response including:
1. Executive Summary
2. Detailed Analysis
3. Recommended Solutions
4. Implementation Roadmap
5. Risk Assessment
6. Cost Considerations
7. Next Steps`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    let responseText = null;

    if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        responseText = candidate.content.parts[0].text;
      }
    }

    if (!responseText && data.candidates && data.candidates[0] && data.candidates[0].output) {
      responseText = data.candidates[0].output;
    }

    if (!responseText && data.text) {
      responseText = data.text;
    }

    if (!responseText) {
      throw new Error('Could not extract response text from Gemini API');
    }

    return responseText;

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// ========== Generate Comprehensive Prompt ==========
function generateComprehensivePrompt() {
  let prompt = `# Infotechnik AI INFRASTRUCTURE CONSULTATION REQUEST

## Engagement Overview
- **Consultation Type:** ${collectedData.serviceType || 'Not specified'} (Design or Support)
- **Environment:** ${collectedData.environment || 'Not specified'}

## User's Specific Request
**Brief Description of Needs:**
${collectedData.userDescription || 'Not provided'}

## Detailed Requirements

`;

  if (collectedData.physicalDesign) {
    prompt += `### Physical Network Design Requirements\n`;
    prompt += `- Number of users to support: ${collectedData.physicalDesign.numUsers || 'Not specified'}\n`;
    prompt += `- Number of departments/divisions: ${collectedData.physicalDesign.numDivisions || 'Not specified'}\n`;
    prompt += `- Guest network required: ${collectedData.physicalDesign.guestNetwork || 'Not specified'}\n`;
    prompt += `- Redundancy links count: ${collectedData.physicalDesign.redundancyLinks || 'Not specified'}\n`;
    prompt += `- Remote/VPN connection required: ${collectedData.physicalDesign.remoteConnection || 'Not specified'}\n`;
    prompt += `- Wireless coverage area: ${collectedData.physicalDesign.wirelessArea || 'Not specified'} sqft\n`;
    prompt += `- Specific hardware capabilities: ${collectedData.physicalDesign.hardwareCapabilities || 'Not specified'}\n\n`;
  }

  if (collectedData.physicalSupport) {
    prompt += `### Physical Network Support Requirements\n`;
    prompt += `- Number of people using network: ${collectedData.physicalSupport.numPeople || 'Not specified'}\n`;
    prompt += `- Number of workgroups: ${collectedData.physicalSupport.numWorkgroups || 'Not specified'}\n`;
    prompt += `- Total routers in network: ${collectedData.physicalSupport.numRouters || 'Not specified'}\n`;
    prompt += `- Total switches in network: ${collectedData.physicalSupport.numSwitches || 'Not specified'}\n`;
    prompt += `- Assistance type needed: ${collectedData.physicalSupport.assistanceType || 'Not specified'}\n\n`;
  }

  if (collectedData.virtualDesign) {
    prompt += `### Virtual/Cloud Design Requirements\n`;
    prompt += `- Cloud service type: ${collectedData.virtualDesign.cloudService || 'Not specified'}\n`;
    prompt += `- Workload pattern: ${collectedData.virtualDesign.workload || 'Not specified'}\n`;
    prompt += `- Desired control level: ${collectedData.virtualDesign.control || 'Not specified'}\n`;
    prompt += `- Provider preference: ${collectedData.virtualDesign.providerPreference || 'Not specified'}\n\n`;
  }

  prompt += `## Budget Constraints\n`;
  prompt += `- Estimated budget: ${collectedData.budget || 'Not specified'}\n\n`;

  prompt += `## Request\n`;
  prompt += `Based on ALL the information provided above, please provide:\n`;
  prompt += `1. A comprehensive analysis of the optimal infrastructure solution\n`;
  prompt += `2. Detailed recommendations for hardware, software, and services\n`;
  prompt += `3. Implementation strategy with phases and timeline\n`;
  prompt += `4. Estimated costs breakdown within the specified budget\n`;
  prompt += `5. Risk assessment and mitigation strategies\n`;
  prompt += `6. Best practices and security considerations\n`;
  prompt += `7. Scalability recommendations for future growth\n\n`;
  prompt += `Please be specific, actionable, and tailored to the exact requirements provided.`;

  return prompt;
}

// ========== Workflow Steps ==========

async function processUserInput(input) {
  const lowerInput = input.toLowerCase().trim();

  switch(currentStep) {
    case 'start':
      if (lowerInput === 'start' || input === '1' || lowerInput.includes('start')) {
        appendMessage("Great! Let's begin the consultation.", 'ai');
        currentStep = 'engagement_type';
        await askEngagementType();
      } else {
        appendMessage("Please type 'start' to begin the IT consultation process.", 'ai');
      }
      break;

    case 'engagement_type':
      if (lowerInput.includes('design')) {
        collectedData.serviceType = 'Design';
        currentStep = 'environment_type';
        await askEnvironmentType();
      } else if (lowerInput.includes('support')) {
        collectedData.serviceType = 'Support';
        currentStep = 'environment_type';
        await askEnvironmentType();
      } else {
        appendMessage("Please choose either 'Design' or 'Support'.", 'ai');
      }
      break;

    case 'environment_type':
      if (lowerInput.includes('physical')) {
        collectedData.environment = 'Physical';
        if (collectedData.serviceType === 'Design') {
          currentStep = 'physical_design';
          await askPhysicalDesignQuestions();
        } else {
          currentStep = 'physical_support';
          await askPhysicalSupportQuestions();
        }
      } else if (lowerInput.includes('virtual') || lowerInput.includes('cloud')) {
        collectedData.environment = 'Virtual';
        currentStep = 'virtual_design';
        await askVirtualDesignQuestions();
      } else {
        appendMessage("Please choose 'Physical' or 'Virtual/Cloud'.", 'ai');
      }
      break;

    case 'physical_design':
      await handlePhysicalDesign(input);
      break;

    case 'physical_support':
      await handlePhysicalSupport(input);
      break;

    case 'virtual_design':
      await handleVirtualDesign(input);
      break;

    case 'budget':
      collectedData.budget = input;
      currentStep = 'description';
      appendMessage("Thank you. Please provide a brief description of what you want to achieve with this IT infrastructure:", 'ai');
      break;

    case 'description':
      collectedData.userDescription = input;
      currentStep = 'generate_prompt';
      await generateAndSendPrompt();
      break;

    case 'end':
      if (lowerInput.includes('yes') || lowerInput.includes('accept')) {
        appendMessage("Thank you for using Infotechnik AI! Type 'start' to begin a new consultation.", 'ai');
        resetWorkflow();
      } else if (lowerInput.includes('try again') || lowerInput.includes('rebuild')) {
        appendMessage("Let's rebuild based on your previous inputs. What would you like to adjust?", 'ai');
        currentStep = 'engagement_type';
        await askEngagementType();
      } else {
        appendMessage("Please type 'accept' to finalize or 'try again' to rebuild your configuration.", 'ai');
      }
      break;
  }
}

async function askEngagementType() {
  appendMessage("Do you require a Design or Support consultation?", 'ai');
}

async function askEnvironmentType() {
  appendMessage("Will this be a Physical (on-premise network) or Virtual/Cloud environment?", 'ai');
}

async function askPhysicalDesignQuestions() {
  collectedData.physicalDesign = {};
  collectedData.physicalDesign.questionIndex = 0;
  collectedData.physicalDesign.questions = [
    { key: 'numUsers', text: "How many users do you intend to support? (Enter # of hosts)" },
    { key: 'numDivisions', text: "How many departments/divisions/sections? (Enter # of divisions)" },
    { key: 'guestNetwork', text: "Will a guest network be needed? (Yes/No)" },
    { key: 'redundancyLinks', text: "How many redundancy links exist/will connect to the network? (Enter # of links)" },
    { key: 'remoteConnection', text: "Will off-site/remote connection be required? (VPN, IPsec, SSL, etc.) (Yes/No)" },
    { key: 'wirelessArea', text: "What is the approximate area in sqft that needs to be covered for wireless connection? (Enter # of sqft)" },
    { key: 'hardwareCapabilities', text: "Do you need specific hardware capabilities? (Yes/No) If yes, please specify after answering." }
  ];
  askNextPhysicalDesignQuestion();
}

function askNextPhysicalDesignQuestion() {
  const q = collectedData.physicalDesign.questions[collectedData.physicalDesign.questionIndex];
  if (q) {
    appendMessage(q.text, 'ai');
  } else {
    currentStep = 'budget';
    appendMessage("Great! Now, what is your estimated budget for this project?", 'ai');
  }
}

async function handlePhysicalDesign(input) {
  const q = collectedData.physicalDesign.questions[collectedData.physicalDesign.questionIndex];
  if (q) {
    collectedData.physicalDesign[q.key] = input;
    collectedData.physicalDesign.questionIndex++;
    askNextPhysicalDesignQuestion();
  }
}

async function askPhysicalSupportQuestions() {
  collectedData.physicalSupport = {};
  collectedData.physicalSupport.questionIndex = 0;
  collectedData.physicalSupport.questions = [
    { key: 'numPeople', text: "How many people are using the network? (enter #)" },
    { key: 'numWorkgroups', text: "How many workgroups are on the network? (enter #)" },
    { key: 'numRouters', text: "What is the total number of routers in the network? (enter #)" },
    { key: 'numSwitches', text: "What is the total number of switches in the network? (enter #)" },
    { key: 'assistanceType', text: "Are you looking for assistance with: Network security and routing, Software support, or Workgroup guidance? (enter specific type)" }
  ];
  askNextPhysicalSupportQuestion();
}

function askNextPhysicalSupportQuestion() {
  const q = collectedData.physicalSupport.questions[collectedData.physicalSupport.questionIndex];
  if (q) {
    appendMessage(q.text, 'ai');
  } else {
    currentStep = 'budget';
    appendMessage("Thank you. What is your estimated budget for this support project?", 'ai');
  }
}

async function handlePhysicalSupport(input) {
  const q = collectedData.physicalSupport.questions[collectedData.physicalSupport.questionIndex];
  if (q) {
    collectedData.physicalSupport[q.key] = input;
    collectedData.physicalSupport.questionIndex++;
    askNextPhysicalSupportQuestion();
  }
}

async function askVirtualDesignQuestions() {
  collectedData.virtualDesign = {};
  collectedData.virtualDesign.questionIndex = 0;
  collectedData.virtualDesign.questions = [
    { key: 'cloudService', text: "What type of cloud service do you need? (Virtual Machine, Containers, Serverless, Managed Database, Storage, Networking, Not Sure)" },
    { key: 'workload', text: "How does the workload run? (Always running, Runs on Demand, Event Driven, Batch/Scheduled, Not Sure)" },
    { key: 'control', text: "How much control do you want? (Full Control, Balanced, Minimal Control, Not Sure)" },
    { key: 'providerPreference', text: "Do you have a preference for a provider? (Yes/No, if yes please specify)" }
  ];
  askNextVirtualDesignQuestion();
}

function askNextVirtualDesignQuestion() {
  const q = collectedData.virtualDesign.questions[collectedData.virtualDesign.questionIndex];
  if (q) {
    appendMessage(q.text, 'ai');
  } else {
    applyVirtualDefaults();
    currentStep = 'budget';
    appendMessage("Based on your responses, I've applied recommended defaults where 'Not Sure' was selected. What is your estimated budget for this cloud solution?", 'ai');
  }
}

function applyVirtualDefaults() {
  const defaults = "Fully managed services, Auto-scaling, Pay-as-you-go, General purpose compute";
  if (collectedData.virtualDesign.cloudService?.toLowerCase().includes('not sure')) {
    collectedData.virtualDesign.cloudService = defaults;
  }
  if (collectedData.virtualDesign.workload?.toLowerCase().includes('not sure')) {
    collectedData.virtualDesign.workload = defaults;
  }
  if (collectedData.virtualDesign.control?.toLowerCase().includes('not sure')) {
    collectedData.virtualDesign.control = defaults;
  }
}

async function handleVirtualDesign(input) {
  const q = collectedData.virtualDesign.questions[collectedData.virtualDesign.questionIndex];
  if (q) {
    collectedData.virtualDesign[q.key] = input;
    collectedData.virtualDesign.questionIndex++;
    askNextVirtualDesignQuestion();
  }
}

async function generateAndSendPrompt() {
  const comprehensivePrompt = generateComprehensivePrompt();

  appendMessage("Sending to Google Gemini AI for comprehensive analysis...", 'ai');
  showTypingIndicator();

  try {
    const aiResponse = await sendToGemini(comprehensivePrompt);
    removeTypingIndicator();

    appendFormattedResponse(`Infotechnik AI Response (Powered by Gemini)\n\n${aiResponse}`, 'ai');

    currentStep = 'end';
    appendMessage("Do you accept this output or would you like to try again building off of the previous inputs?\n\nType 'accept' to finalize or 'try again' to rebuild your configuration.", 'ai');

  } catch (error) {
    removeTypingIndicator();
    appendMessage(`Gemini API Error: ${error.message}\n\nPlease check your API key and try again. You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).`, 'ai');
    currentStep = 'end';
  }
}

function resetWorkflow() {
  currentStep = 'start';
  collectedData = {};
}

async function sendUserMessageToAI(messageText) {
  if (!messageText.trim()) return false;
  if (isAiTyping) {
    pendingUserMessage = messageText;
    return false;
  }

  appendMessage(messageText, 'user');
  userInputField.value = '';
  autoResizeTextarea();
  userInputField.focus();

  isAiTyping = true;
  showTypingIndicator();
  await new Promise(r => setTimeout(r, 500));
  removeTypingIndicator();

  await processUserInput(messageText);

  isAiTyping = false;

  if (pendingUserMessage) {
    const queued = pendingUserMessage;
    pendingUserMessage = null;
    await sendUserMessageToAI(queued);
  }
  return true;
}

function handleSend() {
  const rawText = userInputField.value.trim();
  if (rawText === "") return;
  sendUserMessageToAI(rawText);
}

sendButton.addEventListener('click', handleSend);
userInputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

function init() {
  if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
    appendMessage("Type 'start' to begin the consultation.", 'ai');
  } else {
    appendMessage("Infotechnik AI (Gemini Powered)\n\n**API Key Not Configured**\n\nPlease open the script file and replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key.\n\nYou can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n\nOnce configured, refresh the page and type **'start'** to begin the consultation.", 'ai');
  }
  userInputField.focus();
}

init();