
import React, { useState, useRef } from 'react';
import BitiBot from './components/BitiBot';
import Roadmap from './components/Roadmap';
import Certificate from './components/Certificate';
import BadgeDisplay from './components/BadgeDisplay';
import HelpChat from './components/HelpChat';
import { BitiEmotion, UserProgress, ContentChunk, ExamContent, Book } from './types';
import { COURSES, LANGUAGES, CULTURAL_SOUNDS, DEV_PASSWORD, BOOKS, BADGES } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { generateStageContent, generateTTS, generateExamContent } from './services/geminiService';

/**
 * Manual PCM Decoding for Gemini TTS API.
 * Gemini 2.5 Flash Preview TTS returns raw 16-bit Signed Little-Endian PCM data.
 * This function converts those bytes into an AudioBuffer usable by the Web Audio API.
 */
async function decodeRawPcm(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // Ensure we are working with 16-bit samples (2 bytes each)
  const byteLength = data.byteLength;
  const samplesCount = Math.floor(byteLength / 2);
  
  // Use DataView to ensure we read 16-bit integers correctly regardless of platform endianness (TTS is LE)
  const view = new DataView(data.buffer, data.byteOffset, byteLength);
  const int16Data = new Int16Array(samplesCount);
  
  for (let i = 0; i < samplesCount; i++) {
    // Read 16-bit signed integer (Little Endian)
    int16Data[i] = view.getInt16(i * 2, true);
  }

  const frameCount = int16Data.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 range [-32768, 32767] to Float32 range [-1.0, 1.0]
      channelData[i] = int16Data[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [view, setView] = useState<'onboarding' | 'lang-select' | 'course-select' | 'world-select' | 'roadmap' | 'learning' | 'exam' | 'certificate'>('onboarding');
  const [progress, setProgress] = useState<UserProgress>({
    name: '',
    fatherName: '',
    contact: '',
    language: 'hinglish',
    completedStages: 1,
    currentCourse: '',
    earnedBadges: [],
    streak: 0,
    examsPassed: 0,
    sessionStages: 0
  });
  
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [devInput, setDevInput] = useState('');
  const [emotion, setEmotion] = useState<BitiEmotion>(BitiEmotion.STUDIOUS);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentContent, setCurrentContent] = useState<ContentChunk | null>(null);
  const [examContent, setExamContent] = useState<ExamContent | null>(null);
  const [currentExamQuestion, setCurrentExamQuestion] = useState(0);
  const [examScore, setExamScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selfieMode, setSelfieMode] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [lastAudioData, setLastAudioData] = useState<string | null>(null);
  const [showKO, setShowKO] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playSound = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(() => {});
  };

  const handleBack = () => {
    if (view === 'lang-select') setView('onboarding');
    else if (view === 'course-select') setView('lang-select');
    else if (view === 'world-select') setView('course-select');
    else if (view === 'roadmap') setView('world-select');
    else if (view === 'learning') setView('roadmap');
    else if (view === 'exam') setView('roadmap');
    else if (view === 'certificate') setView('course-select');
    
    // Stop audio on back
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      setIsSpeaking(false);
    }
  };

  const handleOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (devInput === DEV_PASSWORD) {
      setIsDeveloperMode(true);
      alert("Developer Mode Unlocked: Access special debug features now.");
    }
    setView('lang-select');
  };

  const selectLanguage = (langId: string) => {
    setProgress(prev => ({ ...prev, language: langId }));
    setView('course-select');
  };

  const selectCourse = (courseId: string) => {
    const course = COURSES.find(c => c.id === courseId);
    setProgress(prev => ({ ...prev, currentCourse: course?.id || '' }));
    setView('world-select');
  };

  const selectWorld = (worldId: string) => {
    setProgress(prev => ({ ...prev, currentBook: worldId, completedStages: 1 }));
    setView('roadmap');
  };

  const startStage = async (stageNum: number) => {
    setLoading(true);
    setError(null);
    setEmotion(BitiEmotion.STUDIOUS);
    
    if (currentAudioSourceRef.current) {
        currentAudioSourceRef.current.stop();
        setIsSpeaking(false);
    }

    try {
      const course = COURSES.find(c => c.id === progress.currentCourse);
      const world = BOOKS[progress.currentCourse]?.find(b => b.id === progress.currentBook);
      
      // Parallelize content and TTS generation for speed
      const contentPromise = generateStageContent(
        course?.name || progress.currentCourse, 
        stageNum, 
        `${world?.name || 'World'} - Mastery Step ${stageNum}`,
        progress.language
      );

      const content = await contentPromise;
      setCurrentContent(content);
      setView('learning');
      
      // Start TTS in background after content is ready
      generateTTS(content.explanation, progress.language).then(audioData => {
        if (audioData) {
          setLastAudioData(audioData);
          playAudioFromBase64(audioData);
        }
      });

    } catch (err: any) {
      console.error("Guru Error:", err);
      setError("Gurukul connection lost. Please try again.");
      setEmotion(BitiEmotion.ENCOURAGING);
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (level: number) => {
    setLoading(true);
    setError(null);
    setEmotion(BitiEmotion.PROFESSIONAL);
    setCurrentExamQuestion(0);
    setExamScore(0);

    try {
      const course = COURSES.find(c => c.id === progress.currentCourse);
      const content = await generateExamContent(course?.name || progress.currentCourse, level, progress.language, 50);
      setExamContent(content);
      setView('exam');
      
      const audioData = await generateTTS(`It is time for your Maha-Pariksha for Level ${level}. 50 questions await you. Stay focused, student.`, progress.language);
      if (audioData) {
        await playAudioFromBase64(audioData);
      }
    } catch (err: any) {
      console.error("Exam Error:", err);
      setError("Exam scroll could not be unrolled. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExamAnswer = (optionIndex: number) => {
    if (!examContent) return;
    
    const isCorrect = optionIndex === examContent.questions[currentExamQuestion].correctAnswer;
    if (isCorrect) {
      setExamScore(prev => prev + 1);
      playSound(CULTURAL_SOUNDS.success);
    } else {
      setEmotion(BitiEmotion.ENCOURAGING);
    }

    if (currentExamQuestion < examContent.questions.length - 1) {
      setCurrentExamQuestion(prev => prev + 1);
    } else {
      // Exam finished
      const finalScore = isCorrect ? examScore + 1 : examScore;
      if (finalScore >= 35) { // Pass criteria: 70% (35/50)
        // Award perfect exam badge
        if (finalScore === 50) {
          awardBadge('perfect-exam');
        }

        const newExamsPassed = progress.examsPassed + 1;
        setProgress(prev => ({ ...prev, examsPassed: newExamsPassed }));
        
        if (newExamsPassed === 5) {
          awardBadge('exam-warrior');
        }

        if (progress.completedStages >= 200) {
          awardBadge('god-level');
          awardBadge('category-master');
          setView('exam'); // This will trigger the final graduation logic
        } else {
          setView('roadmap');
          playSound(CULTURAL_SOUNDS.milestone);
        }
      } else {
        alert(`Guru says: You scored ${finalScore}/50. You need more practice. Let's review the previous lessons.`);
        setProgress(prev => ({ ...prev, completedStages: Math.max(1, prev.completedStages - 20), streak: 0 }));
        setView('roadmap');
      }
    }
  };

  const awardBadge = (badgeId: string) => {
    setProgress(prev => {
      if (prev.earnedBadges.includes(badgeId)) return prev;
      playSound(CULTURAL_SOUNDS.milestone);
      return { ...prev, earnedBadges: [...prev.earnedBadges, badgeId] };
    });
  };

  const playAudioFromBase64 = async (base64: string) => {
    if (isSpeaking && base64) return;
    setIsSpeaking(true);
    
    if (!audioContextRef.current) {
      // 24kHz is the output sample rate for the Gemini TTS model
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    
    if (ctx.state === 'suspended') await ctx.resume();

    // If no new base64 provided, and we aren't currently speaking, we don't do anything 
    // (This logic is usually triggered by the "Magic Mic" button when content already exists)
    if (!base64 && currentContent) {
        setLoading(true);
        const newData = await generateTTS(currentContent.explanation, progress.language);
        setLoading(false);
        if (newData) await playAudioFromBase64(newData);
        return;
    }

    if (!base64) {
      setIsSpeaking(false);
      return;
    }

    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      const buffer = await decodeRawPcm(bytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      currentAudioSourceRef.current = source;
      source.start();
    } catch (e) {
      console.error("Audio Decode Error:", e);
      setIsSpeaking(false);
    }
  };

  const completeStage = () => {
    playSound(CULTURAL_SOUNDS.success);
    const nextStage = progress.completedStages + 1;
    const newStreak = progress.streak + 1;
    const newSessionStages = progress.sessionStages + 1;
    const newlyEarnedBadges: string[] = [];
    
    // Helper to track new badges in this specific completion
    const trackBadge = (id: string) => {
      if (!progress.earnedBadges.includes(id)) {
        newlyEarnedBadges.push(id);
        awardBadge(id);
      }
    };

    // Time-based badges
    const hour = new Date().getHours();
    if (hour >= 4 && hour <= 8) trackBadge('early-bird');
    if (hour >= 22 || hour <= 3) trackBadge('night-owl');

    if (newStreak === 1) trackBadge('first-step');
    if (newStreak === 10) trackBadge('streak-10');
    if (newSessionStages === 5) trackBadge('quick-thinker');
    if (nextStage === 100) trackBadge('halfway');
    if (nextStage === 201) trackBadge('god-level');

    setProgress(prev => ({ 
      ...prev, 
      completedStages: nextStage, 
      streak: newStreak,
      sessionStages: newSessionStages
    }));

    setNewBadges(newlyEarnedBadges);
    setShowKO(true);
    
    // Sequence: KO -> Rewards -> Next View
    setTimeout(() => {
      setShowKO(false);
      setShowRewards(true);
    }, 2000);
  };

  const proceedFromRewards = () => {
    setShowRewards(false);
    const nextStage = progress.completedStages; // Already incremented in completeStage

    if ((nextStage - 1) % 20 === 0 && nextStage > 1) {
      // Just finished a chapter (20, 40, 60...)
      startExam(nextStage - 1);
    } else if (nextStage === 202) {
      setView('exam');
    } else {
      setView('roadmap');
    }
  };

  // --- Developer Tools ---
  const devSkipToStage = (stage: number) => {
    setProgress(prev => ({ ...prev, completedStages: stage }));
    setView('roadmap');
  };

  const devInstaComplete = () => {
    setProgress(prev => ({ 
      ...prev, 
      completedStages: 101,
      selfieUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=200&h=200' 
    }));
    setView('certificate');
  };

  const takeSelfie = async () => {
    try {
      setSelfieMode(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera permission needed for the Success Selfie!");
    }
  };

  const capture = () => {
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const url = canvas.toDataURL('image/png');
      setProgress(prev => ({ ...prev, selfieUrl: url }));
      setSelfieMode(false);
      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      setView('certificate');
      playSound(CULTURAL_SOUNDS.milestone);
    }
  };

  const filteredCourses = COURSES.filter(c => 
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-800 font-sans">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />
      
      <header className="p-6 flex justify-between items-center z-20 sticky top-0 bg-[#020617]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center space-x-3">
          {view !== 'onboarding' && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-full text-orange-500 hover:bg-gray-700 transition-colors"
              aria-label="Go back"
            >
              <span className="text-xl font-bold">←</span>
            </motion.button>
          )}
          <h1 className="text-xl font-gurukul font-bold text-orange-500 tracking-tight">Bharat AI-Gurukul</h1>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 ${loading ? 'bg-yellow-500' : 'bg-teal-500'} rounded-full animate-pulse`} />
            <span className="text-[9px] text-teal-400 font-black tracking-widest uppercase">
              {loading ? 'Consulting Guru' : 'Guru Online'}
            </span>
          </div>
          {isDeveloperMode && (
            <span className="text-[7px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black mt-1">DEBUG ON</span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-24 z-10">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-900/40 border border-red-500 text-red-200 p-4 rounded-xl mb-4 text-center"
            >
              <p className="mb-2 font-bold">{error}</p>
              <button 
                onClick={() => startStage(progress.completedStages)}
                className="bg-red-600 px-4 py-1 rounded-full text-sm font-bold"
              >
                Retry Step {progress.completedStages}
              </button>
            </motion.div>
          )}

          {view === 'onboarding' && (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 mt-10"
            >
              <BitiBot emotion={BitiEmotion.ENCOURAGING} isSpeaking={false} />
              <div className="text-center">
                <h2 className="text-3xl font-gurukul font-bold mb-2">Namaste, Learner!</h2>
                <p className="text-gray-400 text-sm">Your epic quest for knowledge begins here.</p>
              </div>
              <form onSubmit={handleOnboarding} className="space-y-4">
                <input required className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all" placeholder="Full Name (eg. Rajesh Kumar)" value={progress.name} onChange={e => setProgress(p => ({...p, name: e.target.value}))} />
                <input required className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all" placeholder="Father's Name" value={progress.fatherName} onChange={e => setProgress(p => ({...p, fatherName: e.target.value}))} />
                <input required type="tel" className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:border-orange-500 outline-none transition-all" placeholder="Mobile Number" value={progress.contact} onChange={e => setProgress(p => ({...p, contact: e.target.value}))} />
                
                <div className="pt-6 border-t border-gray-800">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-3">Developer/Tester Access</p>
                  <input 
                    type="text"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-white focus:border-purple-600 outline-none font-mono" 
                    placeholder="Password: Vedas & Sanskrit" 
                    value={devInput} 
                    onChange={e => setDevInput(e.target.value)} 
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-orange-600 font-bold p-4 rounded-xl shadow-lg hover:bg-orange-700 transition-all"
                >
                  START YOUR JOURNEY
                </motion.button>
              </form>
            </motion.div>
          )}

          {view === 'lang-select' && (
            <motion.div 
              key="lang-select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 mt-6"
            >
              <h2 className="text-2xl font-gurukul font-bold">Choose Your Language</h2>
              <div className="grid grid-cols-2 gap-4">
                {LANGUAGES.map(lang => (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={lang.id} 
                    onClick={() => selectLanguage(lang.id)} 
                    className="p-6 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center hover:border-orange-500 transition-all text-center group"
                  >
                    <span className="text-3xl mb-2 group-hover:scale-125 transition-transform">{lang.flag}</span>
                    <span className="font-bold text-sm group-hover:text-orange-400">{lang.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'course-select' && (
            <motion.div 
              key="course-select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 mt-6"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-gurukul font-bold">Pick Your Quest</h2>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Select a course to master</p>
                </div>
                <button onClick={() => setView('lang-select')} className="text-xs text-orange-400 underline decoration-dotted">Change Language</button>
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search for a course..." 
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 px-10 text-sm outline-none focus:border-orange-500 transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                {courseSearch && (
                  <button 
                    onClick={() => setCourseSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="grid gap-4 pb-12">
                {filteredCourses.map(course => (
                  <motion.button 
                    whileHover={{ x: 5, backgroundColor: 'rgba(31, 41, 55, 0.5)' }}
                    key={course.id} 
                    onClick={() => selectCourse(course.id)} 
                    className="p-6 bg-gray-900 border border-gray-800 rounded-2xl text-left hover:border-teal-500 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-teal-500/10 to-transparent pointer-events-none"></div>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-teal-400 rounded-full font-bold uppercase tracking-wider mb-2 inline-block border border-teal-500/20">{course.category}</span>
                    <h3 className="text-xl font-bold group-hover:text-teal-400 transition-colors">{course.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{course.description}</p>
                  </motion.button>
                ))}
                {filteredCourses.length === 0 && (
                  <div className="text-center py-10 text-gray-500 italic">No courses found matching your search.</div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'world-select' && (
            <motion.div 
              key="world-select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 mt-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-gurukul font-bold">Select Your World</h2>
                <button onClick={() => setView('course-select')} className="text-xs text-orange-400 underline decoration-dotted">Change Course</button>
              </div>
              <div className="grid gap-4 pb-12">
                {BOOKS[progress.currentCourse]?.map(world => (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={world.id} 
                    onClick={() => selectWorld(world.id)} 
                    className="p-6 bg-gray-900 border border-gray-800 rounded-2xl text-left hover:border-orange-500 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none"></div>
                    <h3 className="text-xl font-bold group-hover:text-orange-400 transition-colors">{world.name.replace('Book', 'World')}</h3>
                    <p className="text-gray-500 text-sm mt-1">{world.description}</p>
                    <div className="mt-4 flex items-center text-[10px] text-teal-400 font-black uppercase tracking-widest">
                      <span>{world.totalLevels} Levels</span>
                      <span className="mx-2">•</span>
                      <span>Boss Exam every 10 Levels</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'roadmap' && (
            <motion.div 
              key="roadmap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isDeveloperMode && (
                <div className="mb-6 p-4 bg-purple-900/30 border border-purple-500/40 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-purple-300 mb-3">Tester Toolbox</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => devSkipToStage(50)} className="bg-purple-600 hover:bg-purple-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">Step 50</button>
                    <button onClick={() => devSkipToStage(100)} className="bg-purple-600 hover:bg-purple-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">Step 100</button>
                    <button onClick={() => devSkipToStage(150)} className="bg-purple-600 hover:bg-purple-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">Step 150</button>
                    <button onClick={() => devSkipToStage(200)} className="bg-purple-600 hover:bg-purple-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">Step 200</button>
                    <button onClick={() => devSkipToStage(201)} className="bg-yellow-600 hover:bg-yellow-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">GOD LEVEL</button>
                    <button onClick={() => setView('exam')} className="bg-red-600 hover:bg-red-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">Force Exam</button>
                    <button onClick={devInstaComplete} className="bg-green-600 hover:bg-green-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors">Direct Cert</button>
                  </div>
                  
                  <p className="text-[10px] font-black uppercase text-purple-300 mb-2">Check Milestones</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 201].map(m => (
                      <button 
                        key={m} 
                        onClick={() => devSkipToStage(m)}
                        className="bg-gray-800 hover:bg-purple-700 text-[9px] font-bold py-1 rounded border border-purple-500/20"
                      >
                        {m === 201 ? 'GOD' : `Lvl ${m}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Roadmap currentStage={progress.completedStages} onSelectStage={(s) => startStage(s)} />
              <BadgeDisplay earnedBadgeIds={progress.earnedBadges} />
            </motion.div>
          )}

          {view === 'learning' && currentContent && (
            <motion.div 
              key="learning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6 pt-6 pb-32"
            >
              <div className="flex items-center justify-between bg-gray-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <span className="text-xl">📜</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest">Current Quest</h3>
                    <p className="text-sm font-bold text-white">Step {progress.completedStages}: {COURSES.find(c => c.id === progress.currentCourse)?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-teal-400 uppercase">Progress</p>
                  <p className="text-sm font-bold text-white">{Math.round((progress.completedStages / 200) * 100)}%</p>
                </div>
              </div>

              <BitiBot emotion={emotion} isSpeaking={isSpeaking} />
              
              {isDeveloperMode && (
                <div className="flex justify-end">
                  <button onClick={completeStage} className="text-[10px] bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg font-black transition-colors">SKIP QUEST</button>
                </div>
              )}

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-900 border border-gray-800 rounded-3xl p-8 relative shadow-2xl shadow-black/50 overflow-hidden group"
              >
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-teal-500"></div>
                 <h4 className="text-teal-400 text-xs font-black uppercase mb-4 flex items-center tracking-[0.2em]">
                   <span className="mr-2">🕉️</span> Guru's Wisdom
                 </h4>
                 {currentContent.imageUrl && (
                   <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black">
                     <img src={currentContent.imageUrl} alt="Educational visual" className="w-full h-auto" />
                   </div>
                 )}
                 <p className="text-xl leading-relaxed font-medium text-gray-100">{currentContent.explanation}</p>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-8 border-l-8 border-l-orange-500 shadow-xl"
              >
                 <h4 className="text-orange-400 text-xs font-black uppercase mb-4 tracking-[0.2em]">The Local Bridge</h4>
                 <p className="italic text-gray-300 text-lg leading-relaxed">"{currentContent.analogy}"</p>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-indigo-900/40 border border-indigo-700/50 rounded-3xl p-8 relative overflow-hidden shadow-2xl"
              >
                 <div className="absolute top-0 right-0 p-4">
                   <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">Quest Objective</div>
                 </div>
                 <h4 className="text-indigo-400 text-xs font-black uppercase mb-4 tracking-[0.2em]">Your Task</h4>
                 <p className="font-bold text-2xl mb-8 text-white leading-tight">{currentContent.task}</p>
                 
                 <motion.button 
                   whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(20, 184, 166, 0.4)' }}
                   whileTap={{ scale: 0.98 }}
                   onClick={completeStage} 
                   className="w-full bg-gradient-to-r from-teal-600 to-teal-500 p-6 rounded-2xl font-black text-lg hover:from-teal-500 hover:to-teal-400 shadow-xl shadow-teal-500/20 flex items-center justify-center space-x-4 transition-all group"
                 >
                   <span className="tracking-widest">COMPLETE QUEST</span>
                   <span className="text-2xl group-hover:translate-x-2 transition-transform">⚔️</span>
                 </motion.button>
              </motion.div>
            </motion.div>
          )}

          {view === 'exam' && (
            <motion.div 
              key="exam"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-8 mt-10"
            >
              {examContent && progress.completedStages <= 200 ? (
                <div className="space-y-6 text-left">
                  <BitiBot emotion={emotion} isSpeaking={isSpeaking} />
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-orange-500 font-gurukul text-xl mb-4">{examContent.title}</h3>
                    <p className="text-lg font-medium mb-6">{examContent.questions[currentExamQuestion].question}</p>
                    <div className="grid gap-3">
                      {examContent.questions[currentExamQuestion].options.map((opt, idx) => (
                        <motion.button 
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(31, 41, 55, 1)' }}
                          whileTap={{ scale: 0.98 }}
                          key={idx}
                          onClick={() => handleExamAnswer(idx)}
                          className="w-full text-left p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-teal-500 transition-all"
                        >
                          {opt}
                        </motion.button>
                      ))}
                    </div>
                    <div className="mt-6 flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      <span>Question {currentExamQuestion + 1} of {examContent.questions.length}</span>
                      <span>Score: {examScore}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <BitiBot emotion={BitiEmotion.EXCITED} isSpeaking={false} />
                  <div className="space-y-2">
                    <h2 className="text-4xl font-gurukul text-yellow-400 font-bold uppercase tracking-widest">Agni-Pariksha</h2>
                    <p className="text-gray-400 text-sm max-w-[80%] mx-auto">You've mastered 200 stages! Now, prove your skills to the Guru.</p>
                  </div>
                  
                  {isDeveloperMode && (
                    <button onClick={devInstaComplete} className="bg-purple-600/50 hover:bg-purple-600 px-4 py-2 rounded-xl text-[10px] font-black border border-purple-500/30">BYPASS EXAM</button>
                  )}

                  {!selfieMode ? (
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={takeSelfie} 
                      className="bg-orange-600 p-6 rounded-full w-full font-black text-xl shadow-2xl shadow-orange-600/40 hover:bg-orange-500 transition-all"
                    >
                      START GRADUATION
                    </motion.button>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-3xl overflow-hidden border-4 border-yellow-500 shadow-2xl bg-black">
                         <video ref={videoRef} autoPlay className="w-full h-auto aspect-video object-cover" />
                         <div className="absolute inset-0 border-[16px] border-yellow-500/10 pointer-events-none"></div>
                      </div>
                      <button onClick={capture} className="bg-green-600 p-5 rounded-2xl w-full font-black text-lg hover:bg-green-500 shadow-xl shadow-green-600/20 transition-all">
                         SMILE & CAPTURE 📸
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {view === 'certificate' && (
            <motion.div 
              key="certificate"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6 flex flex-col items-center"
            >
              <BitiBot emotion={BitiEmotion.EXCITED} isSpeaking={false} />
              <div className="text-center mb-8">
                <h2 className="text-3xl font-gurukul text-yellow-500 font-bold uppercase tracking-tighter">Certified Master</h2>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Authenticated by Bharat AI-Gurukul</p>
              </div>
              <Certificate progress={progress} onDownload={() => alert('Certificate generated and ready for digital download.')} />
              <BadgeDisplay earnedBadgeIds={progress.earnedBadges} />
              <button onClick={() => setView('course-select')} className="mt-10 bg-gray-800/50 px-6 py-3 rounded-full text-teal-400 font-bold hover:bg-gray-800 transition-colors border border-teal-500/20">
                EXPLORE ANOTHER VISHAY
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Magic Mic for Audio Guidance */}
      {view !== 'onboarding' && view !== 'lang-select' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => !isSpeaking && lastAudioData && playAudioFromBase64(lastAudioData)} 
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 group ${isSpeaking ? 'bg-orange-500 scale-110 shadow-orange-500/50' : 'bg-indigo-600 shadow-indigo-600/40 hover:scale-105'}`}
          >
            <div className={`w-8 h-8 rounded-full border-2 mb-1 ${isSpeaking ? 'animate-ping border-white' : 'border-white/50 group-hover:border-white'}`} />
            <span className="text-[9px] font-black tracking-widest uppercase">Magic Mic</span>
          </motion.button>
        </div>
      )}

      {/* AI Help Chatbot */}
      <HelpChat />

      {/* K.O. Animation Overlay */}
      <AnimatePresence>
        {showKO && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0, scale: 3 }}
            className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.h2 
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 0.1 }}
                className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(249,115,22,1)] italic tracking-tighter"
              >
                K.O.
              </motion.h2>
              <p className="text-orange-500 font-black text-2xl uppercase tracking-widest mt-4">Level Cleared!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rewards Summary Overlay */}
      <AnimatePresence>
        {showRewards && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-sm space-y-8 text-center"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-gurukul text-orange-500 font-bold">VICTORY!</h2>
                <p className="text-gray-400 uppercase tracking-widest text-xs font-black">Quest Rewards Received</p>
              </div>

              <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Milestone Reached</span>
                  <span className="text-teal-400 font-black">Step {progress.completedStages - 1}</span>
                </div>

                {newBadges.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">New Badges Earned</p>
                    <div className="flex flex-wrap justify-center gap-4">
                      {newBadges.map(bid => {
                        const badge = BADGES.find(b => b.id === bid);
                        return (
                          <motion.div 
                            key={bid}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex flex-col items-center"
                          >
                            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center text-3xl border border-orange-500/30 shadow-lg shadow-orange-500/10">
                              {badge?.icon}
                            </div>
                            <span className="text-[9px] font-black text-white mt-2 uppercase">{badge?.name}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Streak Bonus</span>
                    <span className="text-orange-500 font-bold">+{progress.streak}x</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress.completedStages / 200) * 100}%` }}
                      className="h-full bg-gradient-to-r from-orange-500 to-teal-500"
                    />
                  </div>
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={proceedFromRewards}
                className="w-full bg-white text-black font-black py-5 rounded-2xl text-xl shadow-2xl"
              >
                CONTINUE QUEST ➔
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] backdrop-blur-md">
          <div className="relative flex flex-col items-center justify-center">
             <div className="w-28 h-28 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl animate-bounce">🧘</span>
             </div>
          </div>
          <div className="mt-8 text-center space-y-2">
            <p className="font-gurukul text-2xl text-orange-500 animate-pulse tracking-wide font-bold">Consulting the Cosmic Guru...</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Accessing the Great Akashi Repository</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
