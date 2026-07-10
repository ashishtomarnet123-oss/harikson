const fs = require('fs');
let content = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const anchor = "const router = useRouter();";

const injection = `const router = useRouter();

  // Voice dictation initialization
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        if (!recognitionRef.current) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) throw new Error("Speech recognition not supported");
          
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInputText(prev => prev ? prev + ' ' + transcript : transcript);
            setIsRecording(false);
          };
          recognitionRef.current.onerror = (e) => {
            console.error("Mic error:", e);
            setIsRecording(false);
          };
          recognitionRef.current.onend = () => setIsRecording(false);
        }
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Speech API Error:", err);
        alert("Voice dictation is not available in this browser or requires HTTPS.");
        setIsRecording(false);
      }
    }
  };`;

content = content.replace(anchor, injection);
fs.writeFileSync('user-portal/pages/chat.js', content, 'utf8');
