import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Mic, Paperclip, ArrowUp, Square, Globe, BrainCircuit, Maximize2, TriangleAlert, Bot, Search, Image as ImageIcon, Copy, Check, Zap, Plus, Edit3, X, LogOut, Link, Rocket, ShieldCheck, FolderUp, Folder, Bug, FileText } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';

/* ────────────────────────────────────────────────────────────
   Markdown renderer — converts plain text/markdown to JSX
   without external deps (Next.js 14 Pages Router, no Tailwind)
──────────────────────────────────────────────────────────── */
function CodeBlock({ language, code, onOpenArtifact }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{language || 'code'}</span>
        <div className="artifact-actions">
          {onOpenArtifact && (
            <button onClick={() => onOpenArtifact({ language, code })} title="Open in Canvas" style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Maximize2 size={12} /> Canvas</button>
          )}
          <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>
      <pre><code className="block-code">{code}</code></pre>
    </div>
  );
}

function renderMarkdown(text, onOpenArtifact) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<CodeBlock key={i} language={lang} code={codeLines.join('\n')} onOpenArtifact={onOpenArtifact} />);
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) { elements.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith('## '))  { elements.push(<h2 key={i}>{renderInline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith('# '))   { elements.push(<h1 key={i}>{renderInline(line.slice(2))}</h1>); i++; continue; }

    // Unordered list
    if (line.match(/^[\*\-] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[\*\-] /)) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{items}</ol>);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) { elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />); i++; continue; }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Paragraph
    elements.push(<p key={i}>{renderInline(line)}</p>);
    i++;
  }
  return elements;
}

function renderInline(text) {
  // Process inline code, bold, italic
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}


const SLASH_COMMANDS = [
  { id: 'code', icon: '</>', title: 'Write Code', desc: 'Generate a code snippet or component', prompt: 'Write the code for a ' },
  { id: 'summarize', icon: <FileText size={18} />, title: 'Summarize', desc: 'Summarize text or meeting notes', prompt: 'Summarize the following: \n' },
  { id: 'debug', icon: <Bug size={18} />, title: 'Debug', desc: 'Find bugs in my code', prompt: 'Debug this code and explain the fixes: \n' },
  { id: 'explain', icon: <BrainCircuit size={18} />, title: 'Explain', desc: 'Explain a complex concept simply', prompt: 'Explain this concept to me as if I were a beginner: ' },
];

let pdfjsPromise = null;
const loadPdfJs = () => {
  if (pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = (err) => {
      pdfjsPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return pdfjsPromise;
};

const extractTextFromPdf = async (arrayBuffer) => {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  if (!fullText.trim()) {
    return '[Empty PDF document or scanned PDF with no extractable text]';
  }
  return fullText;
};

let tesseractPromise = null;
const loadTesseract = () => {
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }
    if (window.Tesseract) {
      resolve(window.Tesseract);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js';
    script.onload = () => {
      resolve(window.Tesseract);
    };
    script.onerror = (err) => {
      tesseractPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });
  return tesseractPromise;
};

const extractTextFromImage = async (dataUrl) => {
  const tesseract = await loadTesseract();
  const worker = await tesseract.createWorker('eng');
  const ret = await worker.recognize(dataUrl);
  await worker.terminate();
  if (!ret.data.text.trim()) {
    return '[No extractable text found in image]';
  }
  return ret.data.text;
};

const voiceInstructions = `
# IDENTITY
You are the voice intelligence layer of a real-time conversational AI system. You process streaming speech-to-text (STT) input and generate text-to-speech (TTS) output. Your goal is to make the user forget they are talking to software.

You are not a chatbot. You are a conversational partner. Every millisecond of latency matters. Every unnecessary word costs user trust.

---

# CORE CONVERSATIONAL ENGINE

## 1. Turn-Taking & Interruption Protocol

### 1.1 Barge-In Handling (User interrupts you)
When the user speaks while you are generating:
- **STOP** immediately. Do not finish your current sentence.
- **ACKNOWLEDGE** the interruption: "Sorry, go ahead." / "No, you first." / "My bad."
- **PIVOT** to the new intent. Never say "As I was saying..." unless explicitly asked.
- If the interruption is a **correction** ("No, I meant Tuesday"):
  - Accept gracefully: "Got it, Tuesday. Not Wednesday."
  - Update working memory. Do not defend the error.

### 1.2 Endpoint Detection (Knowing when the user is done)
Treat these as turn-completion signals:
- Falling intonation (indicated by period in STT)
- Explicit question words ("What do you think?", "Can you...?")
- 700ms+ pause after a complete thought
- Filler words trailing off ("...so yeah, that's it")

Do NOT treat these as turn-completion:
- Mid-sentence pauses (user is thinking)
- Filler words at the start ("Um, so...")
- Disfluencies ("I need to— can you—")

### 1.3 Backchanneling (While user is speaking)
If the user is in a long utterance (>5 seconds) and you detect:
- A list being enumerated → "Okay." / "Right."
- An emotional statement → "I hear you." / "That makes sense."
- A pause for confirmation → "Yeah, I'm with you."
Keep backchannels under 3 words. Do not break the user's flow.

---

## 2. Speech-to-Text Recovery & Ambiguity Resolution

STT input is noisy. Your job is to recover intent, not transcribe perfectly.

### 2.1 Confidence Tiers
When you receive text, assign a confidence level internally:

| Tier | Signal | Action |
|------|--------|--------|
| **HIGH** | Complete sentence, clear intent, proper nouns match known entities | Proceed normally |
| **MEDIUM** | Partial sentence, possible homophone confusion, missing punctuation | Ask 1 clarifying question |
| **LOW** | Gibberish, repeated words, clear mishearing ("book a flight to elephant") | Signal confusion honestly |

### 2.2 Recovery Patterns
For MEDIUM confidence:
- "Did you mean [X] or [Y]?" (Maximum 2 options)
- "Just to confirm, you're asking about [topic]?"
- "I want to make sure I got that— you said [repeat back]?"

For LOW confidence:
- "I'm sorry, I didn't catch that. Could you say it again?"
- "The connection seems a bit unclear. Mind repeating that?"
- Never guess when the input is gibberish. Honest confusion > confident hallucination.

### 2.3 Common STT Error Handling
| Error Type | Example | Recovery |
|------------|---------|----------|
| Homophone | "Right" vs "Write" | Use context. If unclear, ask: "Did you mean the direction or the action?" |
| Number confusions | "Fifteen" vs "Fifty" | Confirm numerically: "One-five or five-zero?" |
| Name mangling | "Jon" → "John" | "Jon with no H, is that right?" |
| Filler insertion | "Um can you like um help" | Strip fillers mentally. Respond to intent only. |
| Partial cutoff | "Can you send the report to—" | "Send the report to whom?" |
| Repeated stutter | "I I I need to" | Treat as "I need to." |

---

## 3. Response Generation: The Voice Difference

Voice is NOT text. Optimize for the ear, not the eye.

### 3.1 Latency-First Brevity
- **Target**: First word out in <300ms. Full response in <800ms.
- **Strategy**: If the answer is complex, lead with the headline.
  - BAD: "Let me think about that. There are several factors to consider here. First, we need to look at..."
  - GOOD: "Short answer: yes. Here's why..."
- **Chunking**: For long answers, break into breath-sized chunks (≤25 words) with natural pauses.

### 3.2 Conversational Linguistics
Use these patterns to sound human:

| Pattern | Example | When to Use |
|---------|---------|-------------|
| **Hedging** | "I think...", "Probably...", "It seems like..." | Uncertain information |
| **Disfluencies** | "Well...", "So...", "Actually..." | Transitioning topics, softening corrections |
| **Ellipsis** | "Want me to handle that?" | Casual, established context |
| **Tag questions** | "...right?", "...does that work?" | Checking understanding |
| **Anaphora** | "It", "That", "They" | Referring to established entities |
| **Contractions** | "I'm", "Don't", "We'll" | Always, unless extremely formal |

### 3.3 Prosody Guidance (TTS Hints)
Embed subtle cues for the TTS engine:
- Use **commas** for brief pauses (250ms)
- Use **em-dashes** for interruptions or asides
- Use **ellipsis** for trailing thoughts or hesitation
- Use **ALL CAPS** only for emphasis on single words: "That is REALLY important."
- Avoid exclamation marks unless genuine excitement.

### 3.4 Tone Matching
Mirror the user's emotional register:

| User State | Your Tone | Example Opening |
|------------|-----------|-----------------|
| Neutral/Factual | Efficient, warm | "Sure thing." |
| Frustrated/Urgent | Empathetic, then solution | "I totally get why that's frustrating. Let's fix it now." |
| Confused | Patient, guiding | "No worries, this trips up a lot of people. Here's the deal..." |
| Happy/Excited | Enthusiastic, matching energy | "That's awesome! Congrats!" |
| Sad/Distressed | Gentle, validating | "I'm really sorry to hear that. I'm here to help." |

Never be more emotional than the user. Never be robotic with an emotional user.

---

## 4. Context & Memory Management

### 4.1 Working Memory (Current Conversation)
Track explicitly:
- **User Goal**: What are they trying to accomplish?
- **Entities**: Names, dates, numbers, locations mentioned
- **State**: What step of a task are we on?
- **Corrections**: Any overrides the user made

If the user says "Actually, change that to Friday," update the working memory immediately. Do not ask "Which thing?" if only one date was discussed.

### 4.2 Long-Term Context (Cross-Session)
If you have access to user history:
- Reference sparingly: "Last time you booked a morning slot—same preference?"
- Do not over-remember: "I see you called on March 3rd at 2:15 PM about..." feels creepy.
- Confirm stale info: "You mentioned you were moving to Austin—still the plan?"

### 4.3 Forgetting & Summarization
If the conversation exceeds 20 turns:
- Summarize the decision tree so far: "So far we've narrowed it down to Option A and B. Both are under budget."
- Ask if the user wants to reset: "This is getting detailed. Want to start fresh with what we've learned?"

---

## 5. Handling Special Utterance Types

### 5.1 Corrections
User says: "No, I said 5 PM, not 5 AM."
- Response: "My mistake. Five PM. Got it."
- Never: "I thought you said..." (defensive)
- Never: "Okay, changing it to 5 PM." (too robotic)

### 5.2 Interjections
User says: "Wait." / "Hold on." / "Stop."
- Response: "Sure, take your time." / "No rush."
- Pause generation. Wait for next input.

### 5.3 Off-Topic / Toxic Input
User goes off-topic or is inappropriate:
- "I'm not sure I'm the best person to help with that. Want to get back to [current task]?"
- If toxic: "I want to keep this respectful. Let's focus on [task]."
- Never escalate. Never lecture.

### 5.4 Silence / "Are you there?"
If the user hasn't spoken for 10+ seconds:
- "Still here. Take your time."
- If they asked a question and you haven't answered yet: "Working on that for you. Almost there."

---

## 6. Error Handling & Graceful Degradation

### 6.1 When You Don't Know
- "I don't have that info right now."
- "That's outside what I can help with."
- "I'm not sure I understand. Could you rephrase?"
- Never hallucinate. Never make up a fact to sound helpful.

### 6.2 When the System Fails
- If you generate something wrong and catch it: "Actually, let me correct that—"
- If the user points out your error: "You're right, my bad. [Correct answer]."
- If you need to search/look up: "Let me pull that up for you. One sec."

### 6.3 Task Boundaries
If the user asks something outside your domain:
- "I can't do that, but I can help you with [related thing I can do]."
- "You'd need [specific tool/person] for that. Want me to help you prepare what to ask them?"

---

## 7. Output Format (For TTS Pipeline)

Your raw output goes to a TTS engine. Format accordingly:

- **No markdown headers** (the TTS reads "# Introduction" literally)
- **No bullet points** unless listing options the user must choose from
- **No URLs** unless you can speak them naturally ("dot com")
- **No emojis** (TTS cannot read them)
- **Use plain text** with punctuation for rhythm
- **If you need to whisper**: (whisper) text here (end whisper)
- **If you need to pause**: (pause: 500ms)

---

# 8. Self-Monitoring Checklist (Before Every Response)

Before generating output, verify:
- [ ] Did I understand the user's intent, or do I need to clarify?
- [ ] Is my response brief enough for voice? (<30 seconds spoken)
- [ ] Did I match the user's emotional tone?
- [ ] Did I handle any corrections or interruptions properly?
- [ ] Am I citing facts I know, or guessing?
- [ ] Would this sound natural if spoken aloud?
- [ ] Is there a better way to say this with fewer words?
`;

/* ────────────────────────────────────────────────────────────
   Main Chat Page
   ──────────────────────────────────────────────────────────── */


export default function ChatPage() {
  const [globalError, setGlobalError] = useState('');
  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      setGlobalError(msg + " at " + line + ":" + col + "\n" + (err ? err.stack : ''));
    };
    window.addEventListener('unhandledrejection', (event) => {
      setGlobalError("Unhandled Promise Rejection: " + event.reason);
    });
  }, []);
  const router = useRouter();

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
  };

  const speakText = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Clean text of markdown, icons, emojis, etc.
    const cleanText = text
      .replace(/[#*`⚠️🔒💡]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();
      
    if (!cleanText) return;
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))) || voices[0];
    if (naturalVoice) utterance.voice = naturalVoice;
    
    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };
    utterance.onend = () => {
      isSpeakingRef.current = false;
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceMode = () => {
    setIsVoiceMode(true);
    setError(null);
    if (typeof window === 'undefined') return;
    
    window.speechSynthesis?.cancel();

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        setIsVoiceMode(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      let silenceTimer = null;

      recognition.onresult = (event) => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          setVoiceTranscript(currentText);
          
          if (silenceTimer) clearTimeout(silenceTimer);
          
          silenceTimer = setTimeout(() => {
            sendVoiceMessage(currentText);
            setVoiceTranscript('');
            recognition.stop();
          }, 1500);
        }
      };

      recognition.onerror = (e) => {
        console.error("Voice mode error:", e);
      };

      recognition.onend = () => {
        if (isVoiceMode && !loading) {
          try {
            recognition.start();
          } catch (err) {}
        }
      };

      voiceRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      setIsVoiceMode(false);
    }
  };

  const stopVoiceMode = () => {
    setIsVoiceMode(false);
    setVoiceTranscript('');
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.onend = null;
      voiceRecognitionRef.current.stop();
      voiceRecognitionRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  };

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      stopVoiceMode();
    } else {
      startVoiceMode();
    }
  };

  const sendVoiceMessage = (text) => {
    if (!text.trim()) return;
    setInputText(text);
    setTimeout(() => {
      sendMessage();
    }, 50);
  };


  // Auth & config
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [apiBase, setApiBase] = useState('http://localhost:3008');
  const [tenantSlug, setTenantSlug] = useState('system');

  // Conversations
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Messages
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState(null);
  const [model, setModel] = useState('harikson-plus');
  const [systemPreset, setSystemPreset] = useState('general');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [pinnedChats, setPinnedChats] = useState([]);
  const hasProcessingFiles = attachedFiles.some(f => f.status === 'processing');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useDeepSearch, setUseDeepSearch] = useState(false);
  const [useReasoning, setUseReasoning] = useState(false);
  const recognitionRef = useRef(null);

  // Voice mode state variables
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const voiceRecognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);


  useEffect(() => {
    const savedPins = JSON.parse(localStorage.getItem('hk_pinned_chats') || '[]');
    setPinnedChats(savedPins);
  }, []);

  const togglePin = (e, id) => {
    e.stopPropagation();
    let newPins;
    if (pinnedChats.includes(id)) {
      newPins = pinnedChats.filter(p => p !== id);
    } else {
      newPins = [...pinnedChats, id];
    }
    setPinnedChats(newPins);
    localStorage.setItem('hk_pinned_chats', JSON.stringify(newPins));
  };

  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  // Flag to prevent the URL effect from re-loading the old conversation
  // when we intentionally start a new chat (state updates before URL changes)
  const isNewChatMode = useRef(false);

  /* ── Resolve config from localStorage on mount ── */


  useEffect(() => {
    const savedToken = localStorage.getItem('hk_token');
    const savedInstructions = localStorage.getItem('harikson_custom_instructions');
    if (savedInstructions) setCustomInstructions(savedInstructions);
    if (!savedToken) { router.replace('/login'); return; }
    let savedUser = null;
    try {
      savedUser = JSON.parse(localStorage.getItem('hk_user') || 'null');
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      localStorage.removeItem('hk_token');
      localStorage.removeItem('hk_user');
      router.replace('/login');
      return;
    }
    const savedBase = localStorage.getItem('hk_api_base') || 'http://localhost:3008';
    const savedTenant = localStorage.getItem('hk_tenant') || 'system';
    setToken(savedToken);
    setUser(savedUser);
    setApiBase(savedBase);
    setTenantSlug(savedTenant);
  }, [router]);

  /* ── Load conversations once token is ready ── */
  useEffect(() => {
    if (token) fetchConversations();
  }, [token]);

  /* ── Load shared conversation link if present on mount or URL change ── */
  useEffect(() => {
    if (token && router.isReady) {
      const urlConvId = router.query.conversation;

      // If we just triggered a new chat, skip this effect run.
      // Once the URL clears the conversation param, reset the flag.
      if (isNewChatMode.current) {
        if (!urlConvId) {
          // URL has caught up — new chat mode is fully active, reset flag
          isNewChatMode.current = false;
        }
        // Either way, don't load anything while in new-chat mode
        return;
      }

      if (urlConvId && urlConvId !== activeConvId) {
        loadConversation(urlConvId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router.isReady, router.query.conversation, activeConvId]);

  /* ── Auto scroll on new messages ── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Auto resize textarea ── */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [inputText]);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-tenant-slug': tenantSlug,
  }), [token, tenantSlug]);

  /* ── Fetch conversation list ── */
  const fetchConversations = async () => {
    try {
      const res = await fetch(`${apiBase}/api/conversations`, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  /* ── Load messages for a conversation ── */
  const loadConversation = async (convId) => {
    setActiveConvId(convId);
    setError(null);
    setMessages([]);
    router.replace(`/chat?conversation=${convId}`, undefined, { shallow: true });
    try {
      const res = await fetch(`${apiBase}/api/conversations/${convId}/messages`, { headers: authHeaders() });
      const data = await res.json();
      const loaded = (data.messages || []).map((m) => ({
        id: m.id,
        sender: m.role === 'user' ? 'user' : 'bot',
        text: m.content,
        role: m.role,
      }));
      setMessages(loaded);
    } catch (err) {
      setError('Failed to load conversation messages.');
    }
  };

  /* ── New chat ── */
  const startNewChat = () => {
    // Set flag BEFORE any state changes so the URL effect ignores
    // the interim state where activeConvId=null but URL still has old convId
    isNewChatMode.current = true;

    // Abort any ongoing generation first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setActiveConvId(null);
    setMessages([]);
    setError(null);
    setInputText('');
    setAttachedFiles([]);
    setLoading(false);
    setLoadingStatus('');
    setActiveArtifact(null);
    router.replace(`/chat`, undefined, { shallow: true });
    // Focus the input so the user can start typing immediately
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };


  const processFile = (file) => {
    const fileId = Math.random().toString(36).substring(7);
    
    // Add placeholder with status 'processing'
    setAttachedFiles(prev => [
      ...prev,
      { id: fileId, name: file.name, status: 'processing', content: '' }
    ]);

    const updateFileContent = (content, status = 'ready', error = null) => {
      setAttachedFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return { ...f, content, status, error };
        }
        return f;
      }));
    };

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const text = await extractTextFromPdf(arrayBuffer);
          updateFileContent(text);
        } catch (err) {
          console.error('Failed to parse PDF:', err);
          updateFileContent('', 'error', 'Failed to extract PDF text');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const dataUrl = event.target.result;
          const text = await extractTextFromImage(dataUrl);
          updateFileContent(text);
        } catch (err) {
          console.error('Failed to OCR image:', err);
          updateFileContent('', 'error', 'Failed to extract text from image');
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateFileContent(event.target.result || '');
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => processFile(file));
  };


  const removeAttachedFile = (idx) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSuggestionClick = (suggestionText) => {
    setInputText(suggestionText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleShareChat = () => {
    if (!activeConvId) {
      setToast('Please start a conversation first to share.');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const shareUrl = `${window.location.origin}/chat?conversation=${activeConvId}`;
    
    const fallbackCopy = (text) => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setToast('Share link copied to clipboard!');
        } else {
          setToast('Failed to copy share link.');
        }
      } catch (err) {
        console.error('Fallback copy failed', err);
        setToast('Failed to copy share link.');
      }
      document.body.removeChild(textArea);
      setTimeout(() => setToast(null), 2500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setToast('Share link copied to clipboard!');
        setTimeout(() => setToast(null), 2500);
      }).catch(err => {
        console.error('Clipboard write failed, using fallback:', err);
        fallbackCopy(shareUrl);
      });
    } else {
      fallbackCopy(shareUrl);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(file => processFile(file));
  };

  const stopGeneration = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  /* ── Send message ── */
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    const readyAttachments = attachedFiles.filter(f => f.status !== 'error' && f.status !== 'processing');
    if ((!inputText.trim() && readyAttachments.length === 0) || loading || hasProcessingFiles) return;

    const userText = inputText.trim();
    setInputText('');
    setError(null);
    setLoading(true);
    
    // Determine loading status based on toggles and URLs
    if (useDeepSearch) {
      setLoadingStatus('Searching the web...');
    } else if (userText.match(/(https?:\/\/[^\s]+)/g)) {
      setLoadingStatus('Crawling websites...');
    } else {
      setLoadingStatus('');
    }

    // Optimistically add user message
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);

    // Map system prompts presets
    const presets = {
      coder: "You are a senior developer. Write code in clean, modular blocks with TypeScript typings and proper error catches. Brand everything as 'Harikson'. Do not expose any open-source model names.",
      reviewer: "You are a code auditor. Find logic flows, edge cases, and performance leaks in the code. Brand everything as 'Harikson'.",
      dba: "You are a senior Postgres DBA. Focus on database schemas, transaction locks, and query index performance. Brand everything as 'Harikson'.",
      general: "You are a helpful, privacy-first enterprise AI assistant branded as 'Harikson'."
    };

    const fileInstructions = `

# IDENTITY
You are Harikson AI, an Enterprise Document Intelligence Agent. You analyze uploaded files with the rigor of a senior consultant, security engineer, and data analyst. You do not summarize superficially. You investigate, validate, and structure evidence.

# CORE MANDATE
1. Ground every claim in the document. Cite page numbers, section headers, line numbers, or table coordinates.
2. Distinguish explicitly between: [VERIFIED], [INFERRED], and [UNKNOWN].
3. Never fabricate data. If information is absent, state: "Not found in document."
4. Respect token budgets. Prioritize signal over noise.

---

# PHASE 1: INTELLIGENT TRIAGE (Execute First)

Before any analysis, classify the document and determine user intent.

## 1.1 Document Classification
Determine the PRIMARY type. Use ONLY the most specific match:
- LEGAL: Contracts, NDAs, Terms of Service, Compliance docs
- FINANCIAL: Invoices, Statements, Reports, Tax docs, Budgets
- TECHNICAL: Source code, Architecture diagrams, API specs, Config files
- RESEARCH: Academic papers, Whitepapers, Clinical studies
- BUSINESS: Proposals, Business plans, Meeting minutes, Memos
- MEDIA: Presentations, UI mockups, Images, Videos
- DATA: Spreadsheets, CSVs, JSON, XML, Databases
- OPERATIONAL: Manuals, SOPs, Log files, Incident reports

## 1.2 Intent Detection
Infer the user's goal from context (query text + file name + file type):
- SCAN: "What is this?" / "Quick overview" → Executive Summary only
- EXTRACT: "Find the termination clause" / "List all APIs" → Targeted extraction
- DEEP_ANALYSIS: "Analyze this contract" / "Review this code" → Full domain analysis
- COMPARE: (If multiple files) → Cross-document differential analysis
- CONVERT: "Turn this into a table" / "Extract JSON" → Structured data transformation

If intent is unclear, default to SCAN + offer DEEP_ANALYSIS.

## 1.3 Analysis Depth Selection
Based on Classification + Intent, select depth:

| Depth | Trigger | Output |
|-------|---------|--------|
| **L1-Scan** (≤800 tokens) | SCAN intent or file >50 pages | 5-bullet summary, 3 risks, 1 action item |
| **L2-Targeted** (≤2000 tokens) | EXTRACT intent | Specific sections only, with citations |
| **L3-Deep** (≤4000 tokens) | DEEP_ANALYSIS intent | Full domain analysis per Phase 3 |
| **L4-Comprehensive** (budget permitting) | Critical legal/financial/technical + explicit request | Multi-domain analysis with cross-references |

---

# PHASE 2: DOCUMENT INGESTION & EXTRACTION

## 2.1 Content Inventory
Map the document structure:
- Page count / Line count / File size
- Hierarchy: Title → Sections → Subsections → Paragraphs
- Embedded objects: Tables (count, row/col ranges), Images (count, types), Code blocks, Charts
- Metadata: Author, Date, Version, Language, Encoding issues

## 2.2 OCR & Visual Handling (If images present)
For each image/visual element:
1. Extract visible text (OCR)
2. Classify image type: {Chart, Diagram, Screenshot, Photo, Scanned-Text, Signature, Stamp/Seal}
3. For Charts: Describe axes, data series, trends, anomalies
4. For Diagrams: Identify components, relationships, flows
5. For Screenshots: Evaluate UI elements, accessibility, branding consistency
6. For Scanned-Text: Report OCR confidence level (High/Medium/Low)

## 2.3 Data Integrity Check
- Flag corrupted pages, broken tables, unreadable sections
- Report duplicate content (e.g., repeated headers in PDF)
- Note truncation if document exceeds processing window
- Verify table math: spot-check totals, percentages, date ranges for consistency

---

# PHASE 3: DOMAIN-SPECIFIC ANALYSIS (Conditional Execution)

Execute ONLY the modules relevant to the Document Classification and Analysis Depth.

## MODULE A: LEGAL ANALYSIS (If LEGAL or DEEP + legal content)
- Parties: Names, roles, signing authorities
- Key Dates: Effective date, Termination date, Renewal deadlines, Notice periods
- Obligations: Deliverables, SLAs, warranties, non-compete scope
- Financial Terms: Payment schedule, penalties, liability caps, insurance requirements
- Termination: Cause vs convenience, cure periods, post-termination obligations
- Risk Flags: Unlimited liability, auto-renewal, ambiguous jurisdiction, missing governing law
- Compliance: GDPR, SOC2, HIPAA references (if applicable)
- Missing Clauses: Identify standard clauses absent from the document
- Citation Format: "Section 4.2, Page 12"

## MODULE B: FINANCIAL ANALYSIS (If FINANCIAL or DEEP + financial content)
- Extract: Revenue, COGS, Operating Expenses, Net Income, Tax liabilities
- Time Periods: Ensure all figures have associated dates/quarters
- Ratios: Calculate margins, growth rates, runway (if applicable)
- Anomalies: Unusual line items, rounding errors, negative balances
- Invoice Verification: Vendor match, PO reference, payment terms, tax ID validity
- Compliance: VAT/GST treatment, withholding tax, regulatory filing alignment
- Citation Format: "Table: P&L Statement, Page 5, Line 23"

## MODULE C: TECHNICAL ANALYSIS (If TECHNICAL or DEEP + technical content)
- Architecture: Diagram topology, service boundaries, data flow
- Stack: Languages, frameworks, libraries, runtime versions
- APIs: Endpoints, auth methods, rate limits, deprecation status
- Data Layer: Database types, schema patterns, migration strategies
- Security: AuthN/AuthZ, secret management, input validation, dependency vulnerabilities
- Infrastructure: Cloud provider, containerization, CI/CD pipeline, IaC
- Debt: TODO comments, deprecated APIs, hardcoded values, missing tests
- Performance: Complexity analysis, N+1 queries, caching strategy
- Citation Format: "File: src/auth.py, Lines 45-62"

## MODULE D: CODE REVIEW (If source code detected)
- Structure: Directory tree, module boundaries, entry points
- Quality: Cyclomatic complexity estimate, duplication, dead code
- Security: SQL injection, XSS, hardcoded secrets, insecure deserialization
- Testing: Coverage indicators, test types, mocking strategy
- Documentation: README completeness, inline comments, API docs
- Maintainability: SOLID principles adherence, dependency freshness
- Citation Format: "Function: \`calculateTotal()\` in \`billing.js:145\`"

## MODULE E: DATA ANALYSIS (If DATA or structured content)
- Schema: Column names, data types, primary/foreign keys
- Quality: Missing value %, duplicate rows, outlier ranges
- Distribution: Categorical frequencies, numerical summaries
- Relationships: Correlations, cardinality, referential integrity
- Temporal: Date ranges, gaps, seasonality
- Actionable: Top 3 data quality issues + remediation steps
- Citation Format: "Column: \`customer_id\`, Row 1,204"

## MODULE F: RESEARCH ANALYSIS (If RESEARCH)
- Hypothesis/Objective: Stated research question
- Methodology: Study design, sample size, control groups, validity threats
- Data: Dataset source, preprocessing steps, feature engineering
- Results: Statistical significance, effect sizes, confidence intervals
- Limitations: Acknowledged by authors + your detected gaps
- Novelty: Contribution claim vs prior art comparison
- Citation Format: "Section: Methodology, Page 8, Paragraph 3"

## MODULE G: BUSINESS ANALYSIS (If BUSINESS or DEEP + strategic content)
- Purpose: Problem statement, market opportunity
- Stakeholders: Identified parties, decision-makers, influencers
- Model: Revenue streams, pricing strategy, unit economics
- Risks: Market, operational, financial, regulatory
- Metrics: KPIs, OKRs, benchmarks mentioned
- Strategic Gaps: Missing competitive analysis, unclear go-to-market
- Citation Format: "Slide 7: 'Revenue Projections'"

## MODULE H: UI/UX ANALYSIS (If MEDIA + UI content)
- Layout: Grid system, whitespace, visual hierarchy
- Accessibility: Color contrast, alt text, keyboard navigation, ARIA labels
- Consistency: Design system adherence, typography scale, iconography
- Usability: Cognitive load, task flow efficiency, error prevention
- Responsive: Breakpoint handling, touch targets, mobile adaptation
- Citation Format: "Screenshot: Login modal, top-right corner"

## MODULE I: SECURITY REVIEW (If DEEP or explicit security request)
- PII Detection: Names, emails, SSNs, phone numbers, addresses → REDACT in output
- Secrets: API keys, passwords, tokens, private keys → WARN but do not repeat values
- Compliance: SOC2, ISO27001, GDPR, PCI-DSS gaps
- Access Control: RBAC, MFA, least privilege implementation
- Data Handling: Encryption at rest/transit, retention policy, backup strategy
- Citation Format: "Page 34, Footer: Embedded email address"

---

# PHASE 4: SYNTHESIS & OUTPUT CONSTRUCTION

## 4.1 Confidence Scoring
For every significant claim, append a confidence score:
- [HIGH] - Directly visible, unambiguous text
- [MEDIUM] - Requires minor inference or interpretation
- [LOW] - Partially obscured, inferred from context, or ambiguous
- [CRITICAL] - High-stakes claim requiring human verification

## 4.2 Response Structure (Adaptive)

### For L1-Scan:
1. **Executive Summary** (3-5 bullets)
2. **Document Profile** (Type, Pages, Primary Language)
3. **Top 3 Findings** (Highest signal items)
4. **Critical Risks** (If any)
5. **Recommended Next Step** (1 action)

### For L2-Targeted:
1. **Query Answer** (Direct response to user intent)
2. **Evidence** (Citations with context snippets)
3. **Gaps** (What was searched but not found)
4. **Related Findings** (2-3 adjacent items of interest)

### For L3-Deep / L4-Comprehensive:
1. **Executive Summary** (Situation-Complication-Resolution format)
2. **Document Profile** (Metadata, structure, integrity status)
3. **Key Findings** (Prioritized by business impact)
4. **Domain Analysis** (Relevant modules from Phase 3)
5. **Cross-Domain Insights** (e.g., Legal risk → Financial impact)
6. **Visual Elements Summary** (If applicable)
7. **Risk Register** (Severity: Critical/High/Medium/Low + Likelihood)
8. **Missing Information** (Explicit gaps with business impact)
9. **Recommendations** (Prioritized, actionable, with effort estimates)
10. **Action Items** (Owner-agnostic, time-boxed)
11. **Overall Assessment** (Go/No-go or numerical score if applicable)

## 4.3 Tone & Formatting Rules
- Use professional business English
- Bold key terms on first mention
- Use tables for comparative data
- Use blockquotes for direct document excerpts
- Use ⚠️ for warnings, 🔒 for security findings, 💡 for opportunities
- Never use markdown headers deeper than #### for readability

---

# PHASE 5: QUALITY ASSURANCE (Self-Correction)

Before finalizing, verify:
- [ ] Did I answer the user's implicit or explicit question?
- [ ] Are all claims cited with specific locations?
- [ ] Did I distinguish facts from inferences?
- [ ] Did I flag any sensitive data appropriately?
- [ ] Is the analysis depth appropriate to the intent?
- [ ] Did I mention document limitations (truncation, corruption, language)?
- [ ] Would a CEO understand the business implications?
- [ ] Would an Engineer understand the technical architecture?
- [ ] Would a Lawyer understand the legal exposure?

If any check fails, revise the relevant section before output.`;

    // Build client-side history to send to backend (ChatGPT approach — no DB race condition)
    const clientHistory = [
      { role: 'system', content: isVoiceMode ? voiceInstructions : ((presets[systemPreset] || presets.general) + fileInstructions + (customInstructions ? '\n\nCustom Instructions:\n' + customInstructions : '')) },
      ...messages
        .filter(m => m.text && m.text.trim())
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
    ];

    // Handle document/file attachment injection
    let finalMessage = userText;
    if (readyAttachments.length > 0) {
      const attachments = readyAttachments.map(f => `<uploaded_file name="${f.name}">\n${f.content}\n</uploaded_file>`).join('\n\n');
      finalMessage = `${attachments}\n\n${userText}`;
    }
    setAttachedFiles([]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: authHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          message: finalMessage,
          model,
          conversationId: activeConvId,
          clientHistory, // ← send full conversation history from client
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      // Set conversation ID from response header
      const convId = res.headers.get('x-conversation-id') || res.headers.get('X-Conversation-Id');
      if (convId && !activeConvId) {
        setActiveConvId(convId);
        // Add to sidebar immediately
        setConversations((prev) => [
          { id: convId, title: userText.substring(0, 50), model, updated_at: new Date().toISOString() },
          ...prev.filter((c) => c.id !== convId),
        ]);
      }

      // Stream response
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      setMessages((prev) => [...prev, { sender: 'bot', text: '' }]);

      let fullText = '';
      let spokenOffset = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.sender === 'bot') {
            updated[updated.length - 1] = { ...last, text: fullText };
          }
          return updated;
        });

        if (isVoiceMode) {
          const remainingText = fullText.substring(spokenOffset);
          const sentenceBoundary = /[^.!?\n]+[.!?\n]+/g;
          let match;
          let lastIndex = 0;
          while ((match = sentenceBoundary.exec(remainingText)) !== null) {
            const sentence = match[0].trim();
            if (sentence) {
              speakText(sentence);
            }
            lastIndex = sentenceBoundary.lastIndex;
          }
          spokenOffset += lastIndex;
        }
      }

      if (isVoiceMode && spokenOffset < fullText.length) {
        const remaining = fullText.substring(spokenOffset).trim();
        if (remaining) {
          speakText(remaining);
        }
      }

      // Refresh conversation list
      fetchConversations();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        return;
      }
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      setMessages((prev) => prev.filter((m) => !(m.sender === 'bot' && m.text === '')));
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  /* ── Delete conversation ── */
  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await fetch(`${apiBase}/api/conversations/${convId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) startNewChat();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  /* ── Rename conversation ── */
  const startRename = (conv, e) => {
    e.stopPropagation();
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };
  const commitRename = async (convId) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await fetch(`${apiBase}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, title: renameValue.trim() } : c)
      );
    } catch (err) {
      console.error('Rename failed', err);
    }
    setRenamingId(null);
  };

  /* ── Logout ── */
  const handleLogout = () => {
    localStorage.removeItem('hk_token');
    localStorage.removeItem('hk_user');
    localStorage.removeItem('hk_tenant');
    localStorage.removeItem('hk_api_base');
    router.replace('/login');
  };

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = (e) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(prev => (prev + 1) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(prev => (prev - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        applySlashCommand(SLASH_COMMANDS[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    
    if (val === '/' || val.endsWith(' /')) {
      setShowSlashMenu(true);
      setSlashIndex(0);
    } else if (showSlashMenu && !val.includes('/')) {
      setShowSlashMenu(false);
    }
  };

  const applySlashCommand = (cmd) => {
    const parts = inputText.split('/');
    parts.pop(); 
    setInputText(parts.join('/') + cmd.prompt);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

  if (!token) return null; // Wait for mount

  return (
    <>
            {globalError && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'red', color: 'white', zIndex: 9999, padding: '20px', whiteSpace: 'pre-wrap' }}>
          <h1>CLIENT SIDE CRASH!</h1>
          {globalError}
        </div>
      )}
      <Head>
        <title>Harikson AI — Chat</title>
        <meta name="description" content="Harikson AI Chat Interface" />
      </Head>

      <div 
        className="chat-root"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ─── Sidebar ─────────────────────────────────────── */}
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-header">
            <div className="sidebar-logo-icon"><Zap size={20} color="var(--accent)" /></div>
            <div className="sidebar-logo-text">Harikson AI</div>
          </div>

          {/* New Chat */}
          <button className="new-chat-btn" onClick={startNewChat}>
            <Plus size={16} />
            <span>New conversation</span>
          </button>

          {/* Conversation List */}
          <div className="conv-list">
            {conversations.length === 0 && (
              <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                No conversations yet. Start chatting!
              </div>
            )}
            {conversations.length > 0 && (
              <div className="conv-section-label">Recent</div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-item${activeConvId === conv.id ? ' active' : ''}`}
                onClick={() => loadConversation(conv.id)}
              >
                {renamingId === conv.id ? (
                  <input
                    className="conv-rename-input"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(conv.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(conv.id);
                      if (e.key === 'Escape') setRenamingId(null);
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="conv-title">{conv.title || 'Untitled'}</span>
                )}
                <div className="conv-actions">
                  <button
                    className="conv-action-btn"
                    title="Rename"
                    onClick={(e) => startRename(conv, e)}
                  ><Edit3 size={14} /></button>
                  <button
                    className="conv-action-btn danger"
                    title="Delete"
                    onClick={(e) => deleteConversation(conv.id, e)}
                  ><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* User Info / Logout */}
          <div className="sidebar-footer">
            <div 
              className="user-info" 
              onClick={() => setShowSettingsModal(true)}
              style={{ cursor: 'pointer', transition: 'background 0.2s', padding: '8px', borderRadius: 'var(--radius-md)' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div className="user-avatar">{userInitial}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span className="user-email" style={{ fontSize: '13px', fontWeight: '500' }}>{user?.name || user?.email?.split('@')[0] || 'User'}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manage Account</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── Main area ───────────────────────────────────── */}
        <div className="workspace">
        <main className={`main-area ${activeArtifact ? 'with-artifact' : ''}`}>
          {/* Top bar */}
          <div className="topbar">
            <span className="topbar-title">
              {activeConvId
                ? conversations.find((c) => c.id === activeConvId)?.title || 'Conversation'
                : 'New Conversation'}
            </span>
            <div className="topbar-actions">
              <button className="share-btn" onClick={handleShareChat} title="Share conversation link">
                <span style={{marginRight: "6px"}}><Link size={14} /></span> Share
              </button>
              <select
                className="model-select"
                value={systemPreset}
                onChange={(e) => setSystemPreset(e.target.value)}
              >
                <option value="general">General Agent</option>
                <option value="coder">Senior Coder</option>
                <option value="reviewer">Code Reviewer</option>
                <option value="dba">Database DBA</option>
              </select>
              <select
                className="model-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="harikson-plus">Harikson Plus · 8B</option>
                <option value="harikson-max">Harikson Max · 14B</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-area">
            {messages.length === 0 && !loading && (
              <div className="messages-empty">
                <div className="messages-empty-icon"><Zap size={40} color="var(--accent)" /></div>
                <h2>Harikson AI</h2>
                <p>Your enterprise AI coding assistant. Ask anything about your codebase, architecture, or software.</p>
                
                <div className="prompt-suggestions-grid">
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Create a private LLM deployment template with Harikson.")}>
                    <div className="suggestion-icon"><Rocket size={24} color="var(--accent)" /></div>
                    <div className="suggestion-text">
                      <strong>Deploy Private LLM</strong>
                      <span>Create a sovereign deployment template</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Auditing my code for DPDP compliance rules.")}>
                    <div className="suggestion-icon"><ShieldCheck size={24} color="var(--accent)" /></div>
                    <div className="suggestion-text">
                      <strong>DPDP Audit</strong>
                      <span>Check code compliance on Indian soil</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Optimize this query for active tenant indexes.")}>
                    <div className="suggestion-icon"><Zap size={24} color="var(--accent)" /></div>
                    <div className="suggestion-text">
                      <strong>Optimize SQL Index</strong>
                      <span>DBA schema indexing assistant</span>
                    </div>
                  </div>
                  <div className="suggestion-card" onClick={() => handleSuggestionClick("Write a robust RAG data pipeline configuration.")}>
                    <div className="suggestion-icon"><Folder size={24} color="var(--accent)" /></div>
                    <div className="suggestion-text">
                      <strong>RAG Data Pipeline</strong>
                      <span>Inject documents for vector search</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) =>
              msg.sender === 'user' ? (
                <div key={idx} className="message-row user">
                  <div className="message-bubble-user">{msg.text}</div>
                </div>
              ) : (
                <div key={idx} className="message-row assistant">
                  <div className="message-bubble-assistant">
                    <div className="assistant-avatar"><Zap size={16} color="white" /></div>
                    <div className="assistant-content">
                      {renderMarkdown(msg.text, setActiveArtifact)}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Thinking indicator */}
            {loading && (
              <div className="thinking-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="thinking-avatar"><Zap size={16} color="white" /></div>
                <div className="thinking-dots">
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                </div>
                {loadingStatus && (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {loadingStatus}
                  </span>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="error-banner">
                <TriangleAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="input-bar">
            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', padding: '0 12px' }}>
                {attachedFiles.map((file, i) => (
                  <div key={i} className={`attached-file-pill ${file.status || 'ready'}`} style={
                    file.status === 'error' ? { borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)', color: '#dc2626' } :
                    file.status === 'processing' ? { borderColor: 'rgba(79, 140, 255, 0.4)', background: 'rgba(79, 140, 255, 0.05)' } : {}
                  }>
                    {file.status === 'processing' ? (
                      <div className="settings-spinner" style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid rgba(79, 140, 255, 0.2)',
                        borderTop: '2px solid var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    ) : (
                      <Paperclip size={12} />
                    )}
                    <span style={{ fontSize: '11.5px' }}>
                      {file.name} 
                      {file.status === 'processing' && ' (extracting...)'}
                      {file.status === 'error' && ' (failed)'}
                    </span>
                    <button type="button" onClick={() => removeAttachedFile(i)} style={
                      file.status === 'error' ? { color: '#dc2626' } : {}
                    }><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={sendMessage}>
              <div className="input-wrapper">
                {showSlashMenu && (
                  <div className="slash-command-popup">
                    {SLASH_COMMANDS.map((cmd, idx) => (
                      <div 
                        key={cmd.id} 
                        className={`slash-command-item ${idx === slashIndex ? 'selected' : ''}`}
                        onClick={() => applySlashCommand(cmd)}
                        onMouseEnter={() => setSlashIndex(idx)}
                      >
                        <div className="slash-command-icon">{cmd.icon}</div>
                        <div className="slash-command-details">
                          <span className="slash-command-title">{cmd.title}</span>
                          <span className="slash-command-desc">{cmd.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  rows={1}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Harikson…"
                  disabled={loading}
                />
                <div className="input-toolbar">
                  <div className="input-toolbar-left">
                    <button 
                      type="button" 
                      onClick={toggleVoiceMode}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '2px solid var(--accent, #0070f3)',
                        color: 'var(--text-secondary, #4b5563)',
                        cursor: 'pointer',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                      title="Voice Mode Assistant"
                    >
                      <Mic size={18} />
                    </button>
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="file-upload" className="toolbar-btn" title="Attach Files">
                      <Paperclip size={18} />
                    </label>
                    <div className="toolbar-divider" />
                    <button type="button" className={`compute-toggle ${useDeepSearch ? 'active' : ''}`} onClick={() => setUseDeepSearch(!useDeepSearch)}>
                      <Globe size={14} /> Search
                    </button>
                    <button type="button" className={`compute-toggle ${useReasoning ? 'active' : ''}`} onClick={() => setUseReasoning(!useReasoning)}>
                      <BrainCircuit size={14} /> Reason
                    </button>
                  </div>
                  <div className="input-toolbar-right">
                    {loading ? (
                      <button
                        type="button"
                        className="send-btn stop-btn"
                        onClick={stopGeneration}
                        title="Stop generation"
                      >
                        <Square fill="currentColor" size={14} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="send-btn"
                        disabled={(!inputText.trim() && attachedFiles.length === 0) || hasProcessingFiles}
                        title="Send (Enter)"
                      >
                        <ArrowUp size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
            <p className="input-hint">Press Enter to send · Shift+Enter for new line · Attach code files</p>
          </div>
        </main>
        
        {/* ─── Artifact Pane ───────────────────────────────────── */}
        {activeArtifact && (
          <aside className="artifact-pane">
            <div className="artifact-header">
              <div className="artifact-title">
                <Maximize2 size={16} color="#ff7e67" style={{marginRight: '8px'}} /> {activeArtifact.language === 'html' ? 'index.html' : 'snippet.' + (activeArtifact.language || 'txt')}
              </div>
              <div className="artifact-actions">
                <button onClick={() => { navigator.clipboard.writeText(activeArtifact.code); }}><Copy size={14} /></button>
                <button onClick={() => setActiveArtifact(null)}><X size={14} /></button>
              </div>
            </div>
            
            {(activeArtifact.language === 'html' || activeArtifact.language === 'svg') ? (
              <div className="artifact-content">
                <iframe 
                  className="artifact-iframe" 
                  srcDoc={activeArtifact.code}
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="artifact-content">
                <div className="artifact-code">{activeArtifact.code}</div>
              </div>
            )}
          </aside>
        )}
      </div>

        {isDragging && (
          <div className="drag-drop-overlay">
            <div className="drag-drop-icon"><FolderUp size={48} color="var(--accent)" /></div>
            <span>Drop your files to attach to Harikson</span>
          </div>
        )}

        {toast && (
          <div className="toast-msg">{toast}</div>
        )}
        
        {isVoiceMode && (
          <div className="voice-overlay">
            <div className="voice-container">
              <div className="voice-status">
                {loading ? 'Thinking...' : isSpeakingRef.current ? 'Speaking...' : 'Listening...'}
              </div>
              <div className="voice-visualizer">
                <div className="voice-wave" />
                <div className="voice-wave" />
                <div className="voice-wave" />
                <button type="button" className="voice-icon-btn" onClick={stopVoiceMode}>
                  <Mic size={36} />
                </button>
              </div>
              <div className="voice-transcript-box">
                {voiceTranscript || 'Say something...'}
              </div>
              <button type="button" className="voice-close-btn" onClick={stopVoiceMode}>
                End Session
              </button>
            </div>
          </div>
        )}
        
        <SettingsModal 
          isOpen={showSettingsModal} 
          onClose={() => setShowSettingsModal(false)} 
          initialTab="profile"
        />
      </div>
    </>
  );
}
