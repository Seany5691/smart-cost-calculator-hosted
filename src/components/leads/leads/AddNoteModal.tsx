'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { createLeadNote } from '@/lib/leads/supabaseNotesReminders';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onNoteAdded?: () => void;
}

export const AddNoteModal = ({ isOpen, onClose, leadId, leadName, onNoteAdded }: AddNoteModalProps) => {
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const lastProcessedIndexRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    
    // Check if speech recognition is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          // Get the final transcript
          const transcript = event.results[0][0].transcript;
          transcriptRef.current = transcript;
        };

        recognitionRef.current.onend = () => {
          // Add the transcript when recognition ends
          if (transcriptRef.current.trim()) {
            setNote(prev => prev + transcriptRef.current + ' ');
            transcriptRef.current = '';
          }
          
          // Auto-restart if button is still pressed
          if (isListening) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Failed to restart:', e);
              setIsListening(false);
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          transcriptRef.current = '';
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
          }
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setNote('');
      setError(null);
      setIsListening(false);
      transcriptRef.current = '';
      lastProcessedIndexRef.current = 0; // Reset index tracking
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      transcriptRef.current = '';
      lastProcessedIndexRef.current = 0;
    } else {
      try {
        // Store the current note length to know where speech starts
        transcriptRef.current = '';
        lastProcessedIndexRef.current = 0;
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('Failed to start speech recognition');
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!note.trim()) {
      setError('Please enter a note');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await createLeadNote(leadId, user.id, note.trim());
      
      if (onNoteAdded) {
        onNoteAdded();
      }
      
      onClose();
      setNote('');
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add Note</h2>
                  <p className="text-blue-100 text-sm">{leadName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Note *
                </label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                      isListening
                        ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
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
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isListening ? "Listening... speak now" : "Type your note or click 'Speak' to use voice input..."}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                autoFocus
              />
              {isListening && (
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  Recording... Speak clearly into your microphone
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end space-x-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !note.trim()}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
