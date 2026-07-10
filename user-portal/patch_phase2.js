const fs = require('fs');
let content = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

// 1. Update CodeBlock and renderMarkdown
const codeBlockOld = `function CodeBlock({ language, code }) {
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
        <button className={\`copy-btn\${copied ? ' copied' : ''}\`} onClick={copy}>
          {copied ? '✓ Copied' : '⧉ Copy'}
        </button>
      </div>
      <pre><code className="block-code">{code}</code></pre>
    </div>
  );
}`;

const codeBlockNew = `function CodeBlock({ language, code, onOpenArtifact }) {
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
            <button onClick={() => onOpenArtifact({ language, code })} title="Open in Canvas">⛶ Canvas</button>
          )}
          <button className={\`copy-btn\${copied ? ' copied' : ''}\`} onClick={copy}>
            {copied ? '✓ Copied' : '⧉ Copy'}
          </button>
        </div>
      </div>
      <pre><code className="block-code">{code}</code></pre>
    </div>
  );
}`;
content = content.replace(codeBlockOld, codeBlockNew);
content = content.replace('function renderMarkdown(text) {', 'function renderMarkdown(text, onOpenArtifact) {');
content = content.replace('elements.push(<CodeBlock key={i} language={lang} code={codeLines.join(\'\\n\')} />);', 'elements.push(<CodeBlock key={i} language={lang} code={codeLines.join(\'\\n\')} onOpenArtifact={onOpenArtifact} />);');
content = content.replaceAll('renderMarkdown(msg.text)', 'renderMarkdown(msg.text, setActiveArtifact)');

// 2. Add new states inside ChatPage
const stateHooksRegex = /  const \[slashIndex, setSlashIndex\] = useState\(0\);/;
content = content.replace(stateHooksRegex, `  const [slashIndex, setSlashIndex] = useState(0);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useDeepSearch, setUseDeepSearch] = useState(false);
  const [useReasoning, setUseReasoning] = useState(false);
  const recognitionRef = useRef(null);`);

// 3. Add Voice API logic
const voiceLogic = `  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
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
    }
  }, []);
  
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };`;
content = content.replace('/* ── Shared chat link load ── */', voiceLogic + '\\n\\n  /* ── Shared chat link load ── */');

// 4. Update sendMessage payload to include toggles (though backend ignores them for now)
content = content.replace('      const payload = { message: inputText, attachments: attachedFiles };', '      const payload = { message: inputText, attachments: attachedFiles, deepSearch: useDeepSearch, reasoning: useReasoning };');

// 5. Wrap main-area with workspace and add ArtifactPane conditionally
const mainAreaStartRegex = /<main className="main-area">/;
content = content.replace(mainAreaStartRegex, `<div className="workspace">
        <main className={\`main-area \${activeArtifact ? 'with-artifact' : ''}\`}>`);

// 6. Inject ArtifactPane UI and Toggles / Mic
// Replace </main> with ArtifactPane and closing workspace div
const mainAreaEndRegex = /<\/main>/;
const artifactPaneHTML = `</main>
        
        {/* ─── Artifact Pane ───────────────────────────────────── */}
        {activeArtifact && (
          <aside className="artifact-pane">
            <div className="artifact-header">
              <div className="artifact-title">
                <span style={{color: '#ff7e67'}}>⛶</span> {activeArtifact.language === 'html' ? 'index.html' : 'snippet.' + (activeArtifact.language || 'txt')}
              </div>
              <div className="artifact-actions">
                <button onClick={() => { navigator.clipboard.writeText(activeArtifact.code); }}>⧉</button>
                <button onClick={() => setActiveArtifact(null)}>✕</button>
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
      </div>`;
content = content.replace(mainAreaEndRegex, artifactPaneHTML);

// 7. Add Voice Mic button inside input-wrapper
const inputWrapperStart = /<div className="input-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>/;
content = content.replace(inputWrapperStart, `<div className="input-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <button 
                  type="button" 
                  className={\`mic-btn \${isRecording ? 'mic-pulsing' : ''}\`} 
                  onClick={toggleRecording}
                  title={isRecording ? 'Stop recording' : 'Dictate with voice'}
                >
                  🎤
                </button>`);

// 8. Add Compute Toggles below textarea
const formEndRegex = /<\/form>/;
const computeTogglesHTML = `  <div className="compute-toggles-row">
                <button type="button" className={\`compute-toggle \${useDeepSearch ? 'active' : ''}\`} onClick={() => setUseDeepSearch(!useDeepSearch)}>
                  🌐 Deep Search
                </button>
                <button type="button" className={\`compute-toggle \${useReasoning ? 'active' : ''}\`} onClick={() => setUseReasoning(!useReasoning)}>
                  🧠 Reasoning
                </button>
              </div>
            </form>`;
content = content.replace(formEndRegex, computeTogglesHTML);

fs.writeFileSync('user-portal/pages/chat.js', content, 'utf8');
console.log('Successfully applied Phase 2 JS updates.');
