// Loading messages for officer search
const loadingMessages = [
  "Searching companies...",
  "Checking directors' information...",
  "We're almost there...",
  "Just a few more moments...",
  "Processing company records...",
  "Analyzing officer data...",
  "Nearly finished...",
  "Finalizing results..."
];

let messageIndex = 0;
let messageInterval = null;

function startLoadingMessages() {
  messageIndex = 0;
  const loadingMessage = document.getElementById('loadingMessage');
  
  // Update message every 3 seconds
  messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % loadingMessages.length;
    if (loadingMessage) {
      loadingMessage.textContent = loadingMessages[messageIndex];
    }
  }, 3000);
}

function stopLoadingMessages() {
  if (messageInterval) {
    clearInterval(messageInterval);
    messageInterval = null;
  }
}