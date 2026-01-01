import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useRAG } from '../../hooks/useApi';
import { Input, Button, Card, EmptyState } from '../ui';

/**
 * RAG Q&A tab component
 */
function AskTab() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const { answer, sources, loading, error, ask, clearHistory } = useRAG();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, answer]);

  // Update messages when streaming completes
  useEffect(() => {
    if (!loading && answer) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { role: 'assistant', content: answer, sources },
          ];
        }
        return prev;
      });
    }
  }, [loading, answer, sources]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!question.trim() || loading) return;

      const userMessage = { role: 'user', content: question };
      const assistantMessage = { role: 'assistant', content: '', isStreaming: true };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setQuestion('');

      try {
        await ask(question, { stream: true });
      } catch (err) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
          },
        ]);
      }
    },
    [question, loading, ask]
  );

  const handleClear = useCallback(async () => {
    await clearHistory();
    setMessages([]);
  }, [clearHistory]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="ask-tab" role="region" aria-label="Question answering">
      <header className="tab-header">
        <h2 className="tab-title">
          <MessageSquare size={24} aria-hidden="true" />
          Ask Questions
        </h2>
        <p className="tab-description">
          Ask questions about your documents using RAG-powered AI
        </p>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={16} />}
            onClick={handleClear}
            aria-label="Clear conversation"
          >
            Clear
          </Button>
        )}
      </header>

      <Card className="chat-container">
        <div
          className="chat-messages"
          role="log"
          aria-label="Conversation history"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={48} />}
              title="Start a Conversation"
              description="Ask a question about your documents to get AI-powered answers with source citations."
            />
          ) : (
            <>
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.isStreaming ? answer : msg.content}
                  sources={msg.sources}
                  isStreaming={msg.isStreaming && loading}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <div className="chat-input-wrapper">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              disabled={loading}
              aria-label="Your question"
            />
            <Button
              type="submit"
              disabled={!question.trim() || loading}
              aria-label="Send question"
            >
              <Send size={18} aria-hidden="true" />
            </Button>
          </div>
          <p className="chat-hint">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </Card>
    </div>
  );
}

export default memo(AskTab);
