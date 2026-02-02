'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Loader2, Mic, MicOff } from 'lucide-react';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

export default function AddNoteModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess
}: AddNoteModalProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  
  // CRITICAL: Mounted state for SSR safety - prevents hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Set mounted state on client side only - setup speech recognition ONCE
  useEffect(() => {
    setMounted(true);
    
    // Check if speech recognition is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        console.log('[Speech] Initializing speech recognition');
        setSpeechSupported(true);
        recognitionRef.current = new SpeechRecognition();
        
        // NEW APPROACH: Use continuous mode with interim results
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        // Setup event handlers ONCE
        recognitionRef.current.onstart = () => {
          console.log('[Speech] Recognition started');
          finalTranscriptRef.current = '';
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log('[Speech] Result event fired, results count:', event.results.length);
          
          let interimTranscript = '';
          let finalTranscript = '';
          
          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            console.log('[Speech] Result', i, '- isFinal:', event.results[i].isFinal, '- text:', transcript);
            
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          // If we have final transcript, add it to content immediately
          if (finalTranscript) {
            console.log('[Speech] Adding final transcript:', finalTranscript);
            finalTranscriptRef.current += finalTranscript;
            setContent(prev => {
              const newContent = prev + finalTranscript;
              console.log('[Speech] New content:', newContent);
              return newContent;
            });
          }
        };

        recognitionRef.current.onend = () => {
          console.log('[Speech] Recognition ended');
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('[Speech] Recognition error:', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
          } else if (event.error === 'no-speech') {
            console.log('[Speech] No speech detected');
          } else if (event.error === 'aborted') {
            console.log('[Speech] Recognition aborted');
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []); // Only run once on mount

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setError('');
      setIsListening(false);
      finalTranscriptRef.current = '';
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors
        }
      }
    }
  }, [isOpen]);

  // Don't render until mounted (prevents SSR hydration issues)
  if (!mounted || !isOpen) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      console.log('[Speech] Stopping recognition');
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('[Speech] Error stopping:', e);
      }
      setIsListening(false);
    } else {
      console.log('[Speech] Starting recognition');
      try {
        finalTranscriptRef.current = '';
        recognitionRef.current.start();
        setIsListening(true);
        setError('');
      } catch (error) {
        console.error('[Speech] Error starting speech recognition:', error);
        setError('Failed to start speech recognition');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please enter note content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get auth token
      const token = localStorage.getItem('auth-storage');
      let authToken = null;
      if (token) {
        const data = JSON.parse(token);
        authToken = data.state?.token || data.token;
      }

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add note');
      }

      // Success
      setContent('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setContent('');
      setError('');
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      setIsListening(false);
      finalTranscriptRef.current = '';
      onClose();
    }
  };

  // Use createPortal to render at document.body level - ensures modal appears above ALL content
  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-emerald-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-emerald-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Add Note</h2>
              <p className="text-sm text-emerald-200">{leadName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-emerald-200" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <p className="text-red-400 font-medium mb-1">Error</p>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white font-medium">
                Note Content <span className="text-red-400">*</span>
              </label>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                  }`}
                  title={isListening ? 'Stop recording' : 'Start voice input'}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span className="text-sm font-medium">Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span className="text-sm font-medium">Speak</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder={isListening ? "Listening... speak now" : "Type your note or click 'Speak' to use voice input..."}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white/10 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isListening && (
              <p className="text-xs text-emerald-300 mt-1 flex items-center">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                Recording... Speak clearly into your microphone
              </p>
            )}
            <p className="text-sm text-emerald-300/70">
              Add any important information about this lead
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // CRITICAL: Render at document.body level to escape parent stacking context
  );
}
