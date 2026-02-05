/**
 * Quality Settings and Presets
 * 
 * Phase 4: Polish & Features
 * 
 * Provides quality presets and adaptive settings based on device capabilities.
 */

export type QualityPreset = 'fast' | 'balanced' | 'best' | 'auto';

export interface QualitySettings {
  // Image processing
  targetResolution: { width: number; height: number };
  jpegQuality: number;
  maxFileSize: number; // MB
  contrastFactor: number;
  brightnessTarget: number;
  sharpenPasses: number;
  
  // Edge detection
  edgeDetectionDownsample: boolean;
  edgeDetectionInterval: number; // ms (for real-time)
  
  // Performance
  batchSize: number;
  useWebWorkers: boolean;
}

/**
 * Detect device tier based on hardware capabilities
 */
function detectDeviceTier(): 'low' | 'mid' | 'high' {
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (performance as any).memory?.jsHeapSizeLimit || 0;
  const memoryGB = memory / (1024 * 1024 * 1024);

  // High-end: 8+ cores, 4+ GB memory
  if (cores >= 8 && memoryGB >= 4) {
    return 'high';
  }
  
  // Mid-range: 4+ cores, 2+ GB memory
  if (cores >= 4 && memoryGB >= 2) {
    return 'mid';
  }
  
  // Low-end: everything else
  return 'low';
}

/**
 * Get quality settings for a preset
 */
export function getQualitySettings(preset: QualityPreset): QualitySettings {
  // Auto preset: detect device tier and choose appropriate settings
  if (preset === 'auto') {
    const tier = detectDeviceTier();
    console.log(`[Quality Settings] Auto-detected device tier: ${tier}`);
    
    switch (tier) {
      case 'high':
        return getQualitySettings('best');
      case 'mid':
        return getQualitySettings('balanced');
      case 'low':
        return getQualitySettings('fast');
    }
  }

  // Preset configurations
  const presets: Record<Exclude<QualityPreset, 'auto'>, QualitySettings> = {
    fast: {
      // Lower quality for speed
      targetResolution: { width: 1800, height: 2550 },
      jpegQuality: 0.85,
      maxFileSize: 1.5,
      contrastFactor: 1.4,
      brightnessTarget: 200,
      sharpenPasses: 1,
      
      // Fast edge detection
      edgeDetectionDownsample: true,
      edgeDetectionInterval: 200, // 5 FPS
      
      // Performance
      batchSize: 3,
      useWebWorkers: false, // Single-threaded for low-end devices
    },
    
    balanced: {
      // Good balance of quality and speed
      targetResolution: { width: 2100, height: 2970 },
      jpegQuality: 0.92,
      maxFileSize: 2,
      contrastFactor: 1.6,
      brightnessTarget: 210,
      sharpenPasses: 1,
      
      // Balanced edge detection
      edgeDetectionDownsample: true,
      edgeDetectionInterval: 100, // 10 FPS
      
      // Performance
      batchSize: 5,
      useWebWorkers: true,
    },
    
    best: {
      // Maximum quality
      targetResolution: { width: 2480, height: 3508 }, // Full A4 at 300 DPI
      jpegQuality: 0.98,
      maxFileSize: 3,
      contrastFactor: 1.8,
      brightnessTarget: 220,
      sharpenPasses: 2,
      
      // High-quality edge detection
      edgeDetectionDownsample: false,
      edgeDetectionInterval: 100, // 10 FPS
      
      // Performance
      batchSize: 5,
      useWebWorkers: true,
    },
  };

  return presets[preset];
}

/**
 * Get recommended preset based on document type
 */
export function getRecommendedPreset(documentType?: string): QualityPreset {
  switch (documentType) {
    case 'receipt':
    case 'note':
      return 'fast'; // Receipts don't need high quality
      
    case 'contract':
    case 'legal':
    case 'invoice':
      return 'best'; // Legal documents need maximum quality
      
    case 'whiteboard':
    case 'presentation':
      return 'balanced'; // Whiteboards need good quality but not maximum
      
    default:
      return 'auto'; // Auto-detect for general documents
  }
}

/**
 * Estimate processing time based on settings and image count
 */
export function estimateProcessingTime(
  imageCount: number,
  settings: QualitySettings
): number {
  // Base time per image (seconds)
  let timePerImage: number;
  
  if (settings.targetResolution.width >= 2400) {
    timePerImage = 3; // Best quality
  } else if (settings.targetResolution.width >= 2000) {
    timePerImage = 2; // Balanced
  } else {
    timePerImage = 1; // Fast
  }
  
  // Adjust for web workers
  if (settings.useWebWorkers) {
    timePerImage *= 0.5; // 2x faster with workers
  }
  
  // Adjust for batch size
  const batches = Math.ceil(imageCount / settings.batchSize);
  
  return Math.ceil(batches * timePerImage);
}

/**
 * Get user-friendly description of preset
 */
export function getPresetDescription(preset: QualityPreset): {
  name: string;
  description: string;
  icon: string;
} {
  const descriptions = {
    fast: {
      name: 'Fast',
      description: 'Lower quality, faster processing. Good for quick scans and receipts.',
      icon: '⚡',
    },
    balanced: {
      name: 'Balanced',
      description: 'Good quality with reasonable speed. Recommended for most documents.',
      icon: '⚖️',
    },
    best: {
      name: 'Best',
      description: 'Maximum quality, slower processing. Perfect for contracts and legal documents.',
      icon: '✨',
    },
    auto: {
      name: 'Auto',
      description: 'Automatically adjusts quality based on your device capabilities.',
      icon: '🤖',
    },
  };
  
  return descriptions[preset];
}

// Default preset
export const DEFAULT_PRESET: QualityPreset = 'auto';

// Current active settings (can be changed by user)
let currentSettings: QualitySettings = getQualitySettings(DEFAULT_PRESET);

export function getCurrentSettings(): QualitySettings {
  return currentSettings;
}

export function setQualityPreset(preset: QualityPreset) {
  currentSettings = getQualitySettings(preset);
  console.log(`[Quality Settings] Preset changed to: ${preset}`, currentSettings);
}
