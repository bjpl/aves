// CONCEPT: Modern TTS Audio Service for Spanish bird vocabulary
// WHY: Provides elegant pronunciation with fallbacks and caching
// PATTERN: Service layer with Web Speech API and external TTS fallbacks

type VoicePreference = 'spanish-spain' | 'spanish-mexico' | 'spanish-argentina' | 'spanish-any';

interface TTSOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voicePreference?: VoicePreference;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface VoiceInfo {
  voice: SpeechSynthesisVoice;
  quality: number; // 0-100 rating
  region: string;
}

class AudioService {
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioCache = new Map<string, HTMLAudioElement>();
  private isPlaying = false;

  constructor() {
    this.initVoices();
  }

  /**
   * Initialize speech synthesis voices
   */
  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Voices may load asynchronously
    const loadVoices = () => {
      this.voices = speechSynthesis.getVoices();
      this.voicesLoaded = this.voices.length > 0;
    };

    loadVoices();

    // Chrome loads voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Get ranked Spanish voices by quality
   */
  getSpanishVoices(): VoiceInfo[] {
    if (!this.voicesLoaded) {
      this.voices = speechSynthesis.getVoices();
    }

    return this.voices
      .filter(voice => voice.lang.startsWith('es'))
      .map(voice => {
        let quality = 50; // Base quality
        let region = 'Unknown';

        // Rate by region and quality indicators
        if (voice.lang === 'es-ES') {
          quality += 20;
          region = 'Spain';
        } else if (voice.lang === 'es-MX') {
          quality += 15;
          region = 'Mexico';
        } else if (voice.lang === 'es-AR') {
          quality += 10;
          region = 'Argentina';
        } else if (voice.lang.startsWith('es-')) {
          quality += 5;
          region = voice.lang.replace('es-', '');
        }

        // Premium voices (usually marked as local or high quality)
        if (voice.localService) quality += 10;
        if (voice.name.toLowerCase().includes('premium')) quality += 15;
        if (voice.name.toLowerCase().includes('enhanced')) quality += 10;
        if (voice.name.toLowerCase().includes('natural')) quality += 10;

        return { voice, quality, region };
      })
      .sort((a, b) => b.quality - a.quality);
  }

  /**
   * Find the best Spanish voice based on preference
   */
  private getBestVoice(preference: VoicePreference): SpeechSynthesisVoice | null {
    const spanishVoices = this.getSpanishVoices();

    if (spanishVoices.length === 0) return null;

    switch (preference) {
      case 'spanish-spain':
        return spanishVoices.find(v => v.region === 'Spain')?.voice ?? spanishVoices[0].voice;
      case 'spanish-mexico':
        return spanishVoices.find(v => v.region === 'Mexico')?.voice ?? spanishVoices[0].voice;
      case 'spanish-argentina':
        return spanishVoices.find(v => v.region === 'Argentina')?.voice ?? spanishVoices[0].voice;
      default:
        return spanishVoices[0].voice;
    }
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Speak text with Spanish pronunciation
   */
  speak(options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        const error = new Error('Speech synthesis not available');
        options.onError?.(error);
        reject(error);
        return;
      }

      // Stop any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(options.text);

      // Configure speech settings
      utterance.lang = options.lang ?? 'es-ES';
      utterance.rate = options.rate ?? 0.85; // Slightly slower for learning
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      // Set voice
      const voice = this.getBestVoice(options.voicePreference ?? 'spanish-spain');
      if (voice) {
        utterance.voice = voice;
      }

      // Event handlers
      utterance.onstart = () => {
        this.isPlaying = true;
        options.onStart?.();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        const error = new Error(`Speech synthesis error: ${event.error}`);
        options.onError?.(error);
        reject(error);
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Speak a Spanish bird term with emphasis
   */
  speakTerm(term: string, pronunciation?: string): Promise<void> {
    // If pronunciation guide provided, use it
    const textToSpeak = pronunciation || term;

    return this.speak({
      text: textToSpeak,
      rate: 0.75, // Even slower for vocabulary learning
      voicePreference: 'spanish-spain',
    });
  }

  /**
   * Speak a full Spanish sentence
   */
  speakSentence(sentence: string): Promise<void> {
    return this.speak({
      text: sentence,
      rate: 0.9, // Natural pace for sentences
      voicePreference: 'spanish-spain',
    });
  }

  /**
   * Speak vocabulary with English translation
   */
  async speakWithTranslation(spanish: string, english: string, pauseMs = 800): Promise<void> {
    // Speak Spanish first
    await this.speak({
      text: spanish,
      lang: 'es-ES',
      rate: 0.8,
    });

    // Pause between languages
    await new Promise(resolve => setTimeout(resolve, pauseMs));

    // Then English translation
    await this.speak({
      text: english,
      lang: 'en-US',
      rate: 0.9,
    });
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isPlaying && this.currentUtterance !== null;
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.isAvailable()) {
      speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.isAvailable() && this.isPlaying) {
      speechSynthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.isAvailable()) {
      speechSynthesis.resume();
    }
  }

  /**
   * Play audio file with caching
   */
  playAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let audio = this.audioCache.get(url);

      if (!audio) {
        audio = new Audio(url);
        audio.preload = 'auto';
        this.audioCache.set(url, audio);
      }

      audio.currentTime = 0;

      const onEnded = () => {
        this.isPlaying = false;
        audio?.removeEventListener('ended', onEnded);
        audio?.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        this.isPlaying = false;
        audio?.removeEventListener('ended', onEnded);
        audio?.removeEventListener('error', onError);
        reject(new Error(`Failed to play audio: ${url}`));
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      this.isPlaying = true;
      audio.play().catch(reject);
    });
  }

  /**
   * Clear audio cache
   */
  clearCache(): void {
    this.audioCache.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.audioCache.clear();
  }
}

// Export singleton instance
export const audioService = new AudioService();
export type { TTSOptions, VoiceInfo, VoicePreference };
