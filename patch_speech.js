const fs = require('fs');
let content = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const oldSpeech = `      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? prev + ' ' + transcript : transcript);
        setIsRecording(false);
      };
      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);`;

const newSpeech = `      try {
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

content = content.replace(oldSpeech, newSpeech);
fs.writeFileSync('user-portal/pages/chat.js', content, 'utf8');
