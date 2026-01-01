import React, { memo } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { parseMarkdown, copyToClipboard } from '../../utils/helpers';

/**
 * @typedef {Object} ChatMessageProps
 * @property {'user'|'assistant'} role
 * @property {string} content
 * @property {Array} [sources]
 * @property {boolean} [isStreaming]
 */

/**
 * Chat message component
 * @param {ChatMessageProps} props
 */
function ChatMessage({ role, content, sources, isStreaming }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = role === 'user';
  const Icon = isUser ? User : Bot;

  return (
    <article
      className={`chat-message chat-message-${role}`}
      aria-label={`${isUser ? 'Your' : 'Assistant'} message`}
    >
      <div className="chat-message-avatar" aria-hidden="true">
        <Icon size={20} />
      </div>

      <div className="chat-message-content">
        <header className="chat-message-header">
          <span className="chat-message-role">
            {isUser ? 'You' : 'NeuroSynth'}
          </span>
          {!isUser && (
            <button
              type="button"
              className="chat-message-copy"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy message'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
        </header>

        <div
          className="chat-message-text"
          dangerouslySetInnerHTML={{
            __html: parseMarkdown(content),
          }}
        />

        {isStreaming && (
          <span className="chat-message-cursor" aria-label="Typing..." />
        )}

        {sources && sources.length > 0 && (
          <footer className="chat-message-sources">
            <span className="sources-label">Sources:</span>
            <ul className="sources-list">
              {sources.map((source, i) => (
                <li key={i} className="source-item">
                  {source.document_title || source.filename || `Source ${i + 1}`}
                  {source.page && ` (p. ${source.page})`}
                </li>
              ))}
            </ul>
          </footer>
        )}
      </div>
    </article>
  );
}

export default memo(ChatMessage);
