import React, { memo } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Zap,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Download,
  TriangleAlert,
  ArrowDown,
} from 'lucide-react';
import FileAttachmentCard from './FileAttachmentCard';
import MarkdownRenderer from './MarkdownRenderer';
import {
  parseUploadedFiles,
  extractUserVisibleText,
  maskModelName,
} from './chatUtils';

const ChatMessageItem = memo(function ChatMessageItem({
  msg,
  idx,
  isLast,
  loading,
  model,
  apiBase,
  editingMsgIdx,
  editDraftText,
  setEditDraftText,
  editTextareaRef,
  handleStartEdit,
  handleCancelEdit,
  handleSaveEdit,
  handleCopyUserMessage,
  copiedUserMsgIdx,
  handleCopyMessage,
  copiedMsgIdx,
  handleRegenerate,
  msgFeedback,
  handleFeedback,
  exportMessageAsPDF,
  exportingMsgIdx,
  downloadedMsgIdx,
  setSelectedImage,
  setIsImageViewerOpen,
  setSelectedPreviewFile,
  setSelectedCitationDoc,
  setSelectedCitationPage,
  setIsDocViewerOpen,
  setActiveArtifact,
}) {
  const isUser = msg.sender === 'user';

  const handlePreviewFile = (f) => {
    const isImg =
      f.isImage ||
      (f.type && f.type.startsWith('image/')) ||
      (f.mimeType && f.mimeType.startsWith('image/')) ||
      f.name?.match(/\.(png|jpe?g|webp|gif|svg)$/i);
    if (isImg) {
      setSelectedImage({ url: f.dataUrl || f.url || '', name: f.name });
      setIsImageViewerOpen(true);
    } else {
      setSelectedPreviewFile({
        name: f.name,
        title: f.name,
        content: f.content,
        extractedText: f.content,
        documentId: f.documentId,
        pages: f.pages || 1,
        size: f.size,
      });
      setSelectedCitationDoc(f.documentId || null);
      setSelectedCitationPage(1);
      setIsDocViewerOpen(true);
    }
  };

  const handleDownloadFile = (f) => {
    if (f.documentId) {
      window.open(`${apiBase}/api/documents/${f.documentId}/download`, '_blank');
    } else {
      const blob = new Blob([f.content || f.name], {
        type: f.type || 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isUser) {
    const isEditing = editingMsgIdx === idx;
    const uploadedFiles = parseUploadedFiles(msg.text || '');
    const cleanUserText =
      uploadedFiles.length > 0
        ? extractUserVisibleText(msg.text || '')
        : msg.text;

    if (isEditing) {
      return (
        <div className="message-row user user-editing-row">
          <div className="user-message-edit-container">
            {uploadedFiles.length > 0 && (
              <div
                className="user-message-attachments-group"
                style={{ marginBottom: '8px' }}
              >
                {uploadedFiles.map((file, fIdx) => (
                  <FileAttachmentCard
                    key={fIdx}
                    file={file}
                    onPreview={handlePreviewFile}
                  />
                ))}
              </div>
            )}
            <textarea
              ref={editTextareaRef}
              className="user-message-edit-textarea"
              value={editDraftText}
              onChange={(e) => {
                setEditDraftText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 320) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit(idx);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelEdit();
                }
              }}
              placeholder="Edit your message..."
              rows={1}
              aria-label="Edit message text"
            />
            <div className="user-message-edit-actions">
              <button
                type="button"
                className="edit-action-btn edit-cancel-btn"
                onClick={handleCancelEdit}
                aria-label="Cancel editing"
              >
                Cancel
              </button>
              <button
                type="button"
                className="edit-action-btn edit-send-btn"
                onClick={() => handleSaveEdit(idx)}
                disabled={!editDraftText.trim() || loading}
                aria-label="Send edited message"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="message-row user">
        <div className="user-message-container">
          {uploadedFiles.length > 0 && (
            <div className="user-message-attachments-group">
              {uploadedFiles.map((file, fIdx) => (
                <FileAttachmentCard
                  key={fIdx}
                  file={file}
                  onPreview={handlePreviewFile}
                  onDownload={handleDownloadFile}
                />
              ))}
            </div>
          )}
          {cleanUserText ? (
            <div className="message-bubble-user">{cleanUserText}</div>
          ) : null}
          <div className="user-message-actions">
            <button
              type="button"
              className="user-msg-action-btn"
              onClick={() => handleCopyUserMessage(msg.text, idx)}
              title={copiedUserMsgIdx === idx ? 'Copied!' : 'Copy message'}
              aria-label="Copy message"
            >
              {copiedUserMsgIdx === idx ? (
                <>
                  <Check size={14} className="copied-icon" />
                  <span className="action-tooltip">Copied</span>
                </>
              ) : (
                <Copy size={14} />
              )}
            </button>
            <button
              type="button"
              className="user-msg-action-btn"
              onClick={() => handleStartEdit(idx, msg.text)}
              title="Edit message"
              aria-label="Edit message"
              disabled={loading}
            >
              <Edit3 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!msg.text) return null;
  const isStreamingThis = loading && isLast;

  return (
    <div className="message-row assistant">
      <div className="message-bubble-assistant">
        <div className="assistant-avatar">
          <Zap size={16} color="white" />
        </div>
        <div className="assistant-content">
          <MarkdownRenderer
            content={msg.text}
            onOpenArtifact={setActiveArtifact}
            onCitationClick={({ documentId, page }) => {
              setSelectedCitationDoc(documentId);
              setSelectedCitationPage(page || 1);
              setIsDocViewerOpen(true);
            }}
          />
          {isStreamingThis && <span className="streaming-cursor" />}

          <div className="assistant-message-actions">
            <button
              type="button"
              className="msg-action-btn"
              onClick={() => handleCopyMessage(msg.text, idx)}
              title={copiedMsgIdx === idx ? 'Copied!' : 'Copy response'}
              aria-label="Copy response"
            >
              {copiedMsgIdx === idx ? (
                <Check size={14} className="copied-icon" />
              ) : (
                <Copy size={14} />
              )}
              {copiedMsgIdx === idx && (
                <span className="action-tooltip">Copied</span>
              )}
            </button>
            <button
              type="button"
              className="msg-action-btn"
              onClick={() => handleRegenerate(idx)}
              title="Regenerate response"
              aria-label="Regenerate response"
              disabled={loading}
            >
              <RotateCw
                size={14}
                className={loading && isStreamingThis ? 'animate-spin' : ''}
              />
            </button>
            <button
              type="button"
              className={`msg-action-btn ${msgFeedback[idx] === 'up' ? 'active-feedback-up' : ''}`}
              onClick={() => handleFeedback(idx, 'up')}
              title="Good response"
              aria-label="Good response"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              type="button"
              className={`msg-action-btn ${msgFeedback[idx] === 'down' ? 'active-feedback-down' : ''}`}
              onClick={() => handleFeedback(idx, 'down')}
              title="Poor response"
              aria-label="Poor response"
            >
              <ThumbsDown size={14} />
            </button>
            <button
              type="button"
              className="msg-action-btn"
              onClick={() => exportMessageAsPDF(msg.text, idx)}
              title={
                downloadedMsgIdx === idx
                  ? 'PDF Downloaded!'
                  : 'Export message as PDF'
              }
              aria-label="Export message as PDF"
              disabled={exportingMsgIdx === idx}
            >
              {exportingMsgIdx === idx ? (
                <Loader2 size={14} className="animate-spin" />
              ) : downloadedMsgIdx === idx ? (
                <Check size={14} className="copied-icon" />
              ) : (
                <Download size={14} />
              )}
              {downloadedMsgIdx === idx && (
                <span className="action-tooltip">PDF Downloaded</span>
              )}
            </button>
            <span className="msg-model-badge">{maskModelName(model)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

function ChatMessageList({
  messages,
  loading,
  loadingStatus,
  error,
  setError,
  model,
  apiBase,
  messagesScrollRef,
  chatEndRef,
  handleMessagesScroll,
  showScrollBottom,
  scrollToBottom,
  editingMsgIdx,
  editDraftText,
  setEditDraftText,
  editTextareaRef,
  handleStartEdit,
  handleCancelEdit,
  handleSaveEdit,
  handleCopyUserMessage,
  copiedUserMsgIdx,
  handleCopyMessage,
  copiedMsgIdx,
  handleRegenerate,
  msgFeedback,
  handleFeedback,
  exportMessageAsPDF,
  exportingMsgIdx,
  downloadedMsgIdx,
  setSelectedImage,
  setIsImageViewerOpen,
  setSelectedPreviewFile,
  setSelectedCitationDoc,
  setSelectedCitationPage,
  setIsDocViewerOpen,
  setActiveArtifact,
}) {
  return (
    <div
      className="messages-scroll-column"
      ref={messagesScrollRef}
      onScroll={handleMessagesScroll}
    >
      {messages.map((msg, idx) => (
        <ChatMessageItem
          key={msg.id || idx}
          msg={msg}
          idx={idx}
          isLast={idx === messages.length - 1}
          loading={loading}
          model={model}
          apiBase={apiBase}
          editingMsgIdx={editingMsgIdx}
          editDraftText={editDraftText}
          setEditDraftText={setEditDraftText}
          editTextareaRef={editTextareaRef}
          handleStartEdit={handleStartEdit}
          handleCancelEdit={handleCancelEdit}
          handleSaveEdit={handleSaveEdit}
          handleCopyUserMessage={handleCopyUserMessage}
          copiedUserMsgIdx={copiedUserMsgIdx}
          handleCopyMessage={handleCopyMessage}
          copiedMsgIdx={copiedMsgIdx}
          handleRegenerate={handleRegenerate}
          msgFeedback={msgFeedback}
          handleFeedback={handleFeedback}
          exportMessageAsPDF={exportMessageAsPDF}
          exportingMsgIdx={exportingMsgIdx}
          downloadedMsgIdx={downloadedMsgIdx}
          setSelectedImage={setSelectedImage}
          setIsImageViewerOpen={setIsImageViewerOpen}
          setSelectedPreviewFile={setSelectedPreviewFile}
          setSelectedCitationDoc={setSelectedCitationDoc}
          setSelectedCitationPage={setSelectedCitationPage}
          setIsDocViewerOpen={setIsDocViewerOpen}
          setActiveArtifact={setActiveArtifact}
        />
      ))}

      {/* Thinking indicator */}
      {loading &&
        (!messages.length ||
          messages[messages.length - 1]?.sender !== 'bot' ||
          !messages[messages.length - 1]?.text) && (
          <div
            className="thinking-row"
            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div className="thinking-avatar">
              <Zap size={16} color="white" />
            </div>
            <div className="thinking-dots">
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
            {loadingStatus && (
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                {loadingStatus}
              </span>
            )}
          </div>
        )}

      {/* Error banner */}
      {error && (
        <div
          className="error-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TriangleAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (setError) setError(null);
              handleRegenerate(messages.length);
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <RotateCw size={13} />
            <span>Regenerate</span>
          </button>
        </div>
      )}

      {showScrollBottom && (
        <button
          type="button"
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={16} />
        </button>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}

export default memo(ChatMessageList);

