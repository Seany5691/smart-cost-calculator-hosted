# Voice-to-Text and Click-to-Open Fixes

## Issues Fixed

### 1. Voice-to-Text Not Working ✅
**Problem**: Voice-to-text button showed recording state but speech was not being transcribed to the textarea.

**Root Cause**: Stale closure issue - the `isListening` state variable in the `onend` event handler was captured at initialization time and never updated, so the auto-restart logic never worked.

**Solution**: 
- Added `isListeningRef` to track listening state without closure issues
- Updated all state changes to also update the ref
- `onend` handler now checks `isListeningRef.current` instead of stale `isListening`

**Implementation**:
```typescript
const isList