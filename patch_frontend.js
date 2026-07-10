const fs = require('fs');
let content = fs.readFileSync('user-portal/pages/chat.js', 'utf8');

// 1. Add loadingStatus to state
content = content.replace("const [loading, setLoading] = useState(false);", "const [loading, setLoading] = useState(false);\n  const [loadingStatus, setLoadingStatus] = useState('');");

// 2. Set loadingStatus in sendMessage
const sendMsgStart = `    setLoading(true);

    // Optimistically add user message`;
const sendMsgPatch = `    setLoading(true);
    
    // Determine loading status based on toggles and URLs
    if (useDeepSearch) {
      setLoadingStatus('🌐 Searching the web...');
    } else if (userText.match(/(https?:\\/\\/[^\\s]+)/g)) {
      setLoadingStatus('🕷️ Crawling websites...');
    } else {
      setLoadingStatus('');
    }

    // Optimistically add user message`;
content = content.replace(sendMsgStart, sendMsgPatch);

// 3. Clear loadingStatus when done (in finish logic)
// There are multiple places `setLoading(false)` is called, but the easiest is at the end of the `sendMessage` try block.
const finallyBlock = `      } catch (err) {
        console.error('Stream read error:', err);
        setError('Error reading stream: ' + err.message);
      } finally {
        setLoading(false);
      }`;
const finallyPatch = `      } catch (err) {
        console.error('Stream read error:', err);
        setError('Error reading stream: ' + err.message);
      } finally {
        setLoading(false);
        setLoadingStatus('');
      }`;
content = content.replace(finallyBlock, finallyPatch);

// Catch block for fetch error
const catchBlock = `    } catch (err) {
      console.error(err);
      if (err.name !== 'AbortError') setError(err.message);
      setLoading(false);
    }`;
const catchPatch = `    } catch (err) {
      console.error(err);
      if (err.name !== 'AbortError') setError(err.message);
      setLoading(false);
      setLoadingStatus('');
    }`;
content = content.replace(catchBlock, catchPatch);


// 4. Render loadingStatus in the thinking UI
const thinkingUI = `{/* Thinking indicator */}
            {loading && (
              <div className="thinking-row">
                <div className="thinking-avatar">⚡</div>
                <div className="thinking-dots">
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                </div>
              </div>
            )}`;
const thinkingUIPatch = `{/* Thinking indicator */}
            {loading && (
              <div className="thinking-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="thinking-avatar">⚡</div>
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
            )}`;
content = content.replace(thinkingUI, thinkingUIPatch);

fs.writeFileSync('user-portal/pages/chat.js', content, 'utf8');
console.log('Successfully patched chat.js frontend for Web Search UI');
