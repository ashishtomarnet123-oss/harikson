const fs = require('fs');
let content = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

const errorBoundary = `export default function ChatPage() {
  const [globalError, setGlobalError] = useState('');
  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      setGlobalError(msg + " at " + line + ":" + col + "\\n" + (err ? err.stack : ''));
    };
    window.addEventListener('unhandledrejection', (event) => {
      setGlobalError("Unhandled Promise Rejection: " + event.reason);
    });
  }, []);`;

content = content.replace('export default function ChatPage() {', errorBoundary);

const errorDisplay = `      {globalError && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'red', color: 'white', zIndex: 9999, padding: '20px', whiteSpace: 'pre-wrap' }}>
          <h1>CLIENT SIDE CRASH!</h1>
          {globalError}
        </div>
      )}
      <Head>`;

content = content.replace('<Head>', errorDisplay);

fs.writeFileSync('user-portal/pages/chat.js', content, 'utf8');
