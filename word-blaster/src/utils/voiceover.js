// Voice-over utility for reading failed questions aloud
// Uses the Web Speech API (speechSynthesis) - works in all modern browsers

let voiceReady = false
let preferredVoice = null

// Load voices (they may not be available immediately)
function loadVoices() {
  if (!window.speechSynthesis) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    // Prefer a clear English voice good for kids
    preferredVoice =
      voices.find(v => v.name.includes('Google UK English Female')) ||
      voices.find(v => v.name.includes('Google US English')) ||
      voices.find(v => v.name.includes('Samantha')) ||
      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
      voices.find(v => v.lang.startsWith('en-')) ||
      voices.find(v => v.lang.startsWith('en'))
    voiceReady = true
  }
}

// Voices load async in some browsers
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

/**
 * Speak a question and its correct answer aloud.
 * Example: "What is the name of RBC? The answer is: erythrocyte"
 */
export function speakQuestionAnswer(question, answer) {
  if (!window.speechSynthesis) return

  window.speechSynthesis.cancel()

  const text = `${question}? The answer is: ${answer}.`
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.85    // Slightly slower for kids
  utterance.pitch = 1.05   // Slightly higher, friendly tone
  utterance.volume = 0.9
  if (preferredVoice) utterance.voice = preferredVoice

  window.speechSynthesis.speak(utterance)
}

/**
 * Speak a list of corrections (for diagram labels, etc.)
 * Example: "Label A is the Left Ventricle. Label B is the Right Atrium."
 */
export function speakCorrections(corrections) {
  if (!window.speechSynthesis || corrections.length === 0) return

  window.speechSynthesis.cancel()

  const text = corrections.join('. ') + '.'
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.85
  utterance.pitch = 1.05
  utterance.volume = 0.9
  if (preferredVoice) utterance.voice = preferredVoice

  window.speechSynthesis.speak(utterance)
}

/**
 * Speak the correct order of a sequence.
 * Example: "The correct order is: First, seed. Then, sprout. Then, plant."
 */
export function speakSequenceOrder(title, steps) {
  if (!window.speechSynthesis || steps.length === 0) return

  window.speechSynthesis.cancel()

  const orderedSteps = [...steps].sort((a, b) => a.step_number - b.step_number)
  const stepList = orderedSteps.map((s, i) => {
    if (i === 0) return `First, ${s.content}`
    if (i === orderedSteps.length - 1) return `Finally, ${s.content}`
    return `Then, ${s.content}`
  }).join('. ')

  const text = `${title}. The correct order is: ${stepList}.`
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.8     // Even slower for sequences (more content)
  utterance.pitch = 1.05
  utterance.volume = 0.9
  if (preferredVoice) utterance.voice = preferredVoice

  window.speechSynthesis.speak(utterance)
}

/** Cancel any ongoing speech */
export function cancelSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}
