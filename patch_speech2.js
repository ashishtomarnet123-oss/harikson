const fs = require('fs');
let content = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

// The code I currently have:
const currentSpeech = `      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputText(prev => prev ? prev + ' ' + transcript : transcript);
          setIsRecording(false);
        };
        recognitionRef.current.onerror = () => setIsRecording(false);
        recognitionRef.current.onend = () => setIsRecording(false);
      } catch (e) {
        console.error("Speech recognition error:", e);
      }`;

const newSpeech = `      // We will lazily instantiate SpeechRecognition in toggleRecording instead of on mount.`;

content = content.replace(currentSpeech, newSpeech);

const currentToggle = `  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };`;

const newToggle = `  const toggleRecording = () => {
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

content = content.replace(currentToggle, newToggle);
fs.writeFileSync('user-portal/pages/chat.js', content, 'utf8');
