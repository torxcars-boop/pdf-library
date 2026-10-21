import React, { useState, useEffect, useRef } from 'react';
import { EnglishWordItem, PronunciationResult } from '../types';
import { 
  Volume2, 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  BookOpen, 
  HelpCircle, 
  Sliders, 
  Globe, 
  Award,
  ChevronRight,
  Headphones,
  Check,
  Languages
} from 'lucide-react';

const CURRICULUM_ENGLISH_ITEMS: EnglishWordItem[] = [
  // 3rd Preparatory (الصف الثالث الإعدادي)
  {
    id: 'prep3_01',
    word: 'Environment',
    phonetic: '/ɪnˈvaɪ.rən.mənt/',
    arabicTranslation: 'البيئة والمحيط الطبيعي',
    exampleSentence: 'We must protect our environment by reducing pollution.',
    exampleTranslation: 'يجب علينا حماية بيئتنا من خلال الحد من التلوث.',
    grade: 'الصف الثالث الإعدادي',
    category: 'مفردات أساسية',
    tips: 'ركز على نطق حرف v بوضوح ولا تنطقه كحرف f، واحرص على عدم إسقاط مقطع ron.'
  },
  {
    id: 'prep3_02',
    word: 'Biodiversity',
    phonetic: '/ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti/',
    arabicTranslation: 'التنوع البيولوجي وتعدد الكائنات',
    exampleSentence: 'The Red Sea is famous for its rich marine biodiversity.',
    exampleTranslation: 'يشتهر البحر الأحمر بتنوعه البيولوجي البحري الغني.',
    grade: 'الصف الثالث الإعدادي',
    category: 'مفردات أساسية',
    tips: 'الكلمة تتكون من مقطعين: bio ثم diversity، النبرة الصوتية تقع على مقطع ver.'
  },
  {
    id: 'prep3_03',
    word: 'Renewable Energy',
    phonetic: '/rɪˈnjuː.ə.bəl ˈen.ər.dʒi/',
    arabicTranslation: 'الطاقة المتجددة (الشمسية والرياح)',
    exampleSentence: 'Egypt is building massive solar parks for renewable energy.',
    exampleTranslation: 'تبني مصر محطات طاقة شمسية عملاقة لتوليد الطاقة المتجددة.',
    grade: 'الصف الثالث الإعدادي',
    category: 'تعبيرات وامتحانات',
    tips: 'تلفظ re-new-able بسلاسة دون تشديد الياء.'
  },

  // 1st Secondary (الصف الأول الثانوي)
  {
    id: 'sec1_01',
    word: 'Sustainability',
    phonetic: '/səˌsteɪ.nəˈbɪl.ə.ti/',
    arabicTranslation: 'الاستدامة والتنمية المستدامة',
    exampleSentence: 'Sustainability is crucial for the future of new smart cities.',
    exampleTranslation: 'الاستدامة أمر حيوي لمستقبل المدن الذكية الجديدة.',
    grade: 'الصف الأول الثانوي',
    category: 'مفردات أساسية',
    tips: 'احرص على تتابع المقاطع: sus-tain-a-bil-i-ty والنبرة الأساسية على bil.'
  },
  {
    id: 'sec1_02',
    word: 'Nanotechnology',
    phonetic: '/ˌnæn.oʊ.tekˈnɑː.lə.dʒi/',
    arabicTranslation: 'تقنية النانو متناهية الصغر',
    exampleSentence: 'Nanotechnology offers breakthrough solutions in modern medicine.',
    exampleTranslation: 'توفر تقنية النانو حلولاً رائدة ومبتكرة في الطب الحديث.',
    grade: 'الصف الأول الثانوي',
    category: 'مفردات أساسية',
    tips: 'انتبه لنطق ch كصوت /k/ وليس /tʃ/، والنبرة على nol.'
  },
  {
    id: 'sec1_03',
    word: 'Take for granted',
    phonetic: '/teɪk fɔːr ˈɡræn.tɪd/',
    arabicTranslation: 'يعتبر الشيء أمراً مسلماً به ومفروغاً منه',
    exampleSentence: 'Do not take your health for granted; maintain good habits.',
    exampleTranslation: 'لا تعتبر صحتك أمراً مفروغاً منه؛ حافظ على عادات صحية جيدة.',
    grade: 'الصف الأول الثانوي',
    category: 'تعبيرات وامتحانات',
    tips: 'تعبير اصطلاحي هام جداً في أسئلة الترجمة بالثانوية.'
  },

  // 2nd Secondary (الصف الثاني الثانوي)
  {
    id: 'sec2_01',
    word: 'Hypothesis',
    phonetic: '/haɪˈpɑː.θə.sɪs/',
    arabicTranslation: 'فرضية علمية قابلة للاختبار',
    exampleSentence: 'Scientists conduct experiments to test their hypothesis.',
    exampleTranslation: 'يقوم العلماء بإجراء التجارب لاختبار فرضيتهم العلمية.',
    grade: 'الصف الثاني الثانوي',
    category: 'مفردات أساسية',
    tips: 'صوت th ينطق ثاءً صحيحة /θ/، والنبرة تقع على المقطع الثاني po.'
  },
  {
    id: 'sec2_02',
    word: 'Photosynthesis',
    phonetic: '/ˌfoʊ.t̬oʊˈsɪn.θə.sɪs/',
    arabicTranslation: 'عملية البناء الضوئي في النبات',
    exampleSentence: 'Plants absorb sunlight and carbon dioxide during photosynthesis.',
    exampleTranslation: 'تمتص النباتات ضوء الشمس وثاني أكسيد الكربون أثناء البناء الضوئي.',
    grade: 'الصف الثاني الثانوي',
    category: 'مفردات أساسية',
    tips: 'انتبه لصوت الـ ph ينطق /f/ وصوت th ينطق ثاء /θ/.'
  },
  {
    id: 'sec2_03',
    word: 'Over the moon',
    phonetic: '/ˈoʊ.vər ðə muːn/',
    arabicTranslation: 'في غاية السعادة والسرور (طاير من الفرحة)',
    exampleSentence: 'She was over the moon when she passed her chemistry exam with flying colors.',
    exampleTranslation: 'كانت في غاية السعادة عندما اجتازت امتحان الكيمياء بتفوق باهر.',
    grade: 'الصف الثاني الثانوي',
    category: 'تعبيرات وامتحانات',
    tips: 'مصطلح مشهور في أسئلة الاختياري والمحادثة.'
  },

  // 3rd Secondary (الصف الثالث الثانوي - الثانوية العامة)
  {
    id: 'sec3_01',
    word: 'Conscientious',
    phonetic: '/ˌkɑːn.ʃiˈen.ʃəs/',
    arabicTranslation: 'ذو ضمير حي، يقظ، متفانٍ ومتقن لعمله',
    exampleSentence: 'A conscientious student reviews their lessons diligently every day.',
    exampleTranslation: 'الطالب المتفاني ذو الضمير الحي يراجع دروسه بجد واجتهاد يومياً.',
    grade: 'الصف الثالث الثانوي',
    category: 'مفردات أساسية',
    tips: 'من أهم كلمات الوحدة الأولى في ثانوية عامة! مقطع tient ينطق صوت الشين /ʃən/.'
  },
  {
    id: 'sec3_02',
    word: 'Pharmaceutical',
    phonetic: '/ˌfɑːr.məˈsuː.t̬ɪ.kəl/',
    arabicTranslation: 'دوائي، صيدلاني أو متعلق بصناعة الدواء',
    exampleSentence: 'Egypt has a thriving pharmaceutical industry supplying the region.',
    exampleTranslation: 'تمتلك مصر صناعة دوائية مزدهرة تزود المنطقة باحتياجاتها.',
    grade: 'الصف الثالث الثانوي',
    category: 'مفردات أساسية',
    tips: 'تبدأ بـ ph وتنطق /f/، والـ c في ceutical تنطق /s/.'
  },
  {
    id: 'sec3_03',
    word: 'Meticulous',
    phonetic: '/məˈtɪk.jə.ləs/',
    arabicTranslation: 'شديد الدقة، حريص وعميق الملاحظة',
    exampleSentence: 'Success in Thanaweya exams demands meticulous attention to details.',
    exampleTranslation: 'يتطلب التفوق في امتحانات الثانوية العامة اهتماماً دقيقاً للغاية بالتفاصيل.',
    grade: 'الصف الثالث الثانوي',
    category: 'مفردات أساسية',
    tips: 'النبرة تقع على المقطع الثاني tic (تِك) وتلفظ ulous بسلاسة.'
  },
  {
    id: 'sec3_04',
    word: 'Hit the nail on the head',
    phonetic: '/hɪt ðə neɪl ɑːn ðə hed/',
    arabicTranslation: 'أصاب كبد الحقيقة، أصاب الهدف بدقة بالغة',
    exampleSentence: 'The teacher hit the nail on the head when explaining the physics rule.',
    exampleTranslation: 'أصاب المعلم كبد الحقيقة تماماً عند شرح قاعدة الفيزياء.',
    grade: 'الصف الثالث الثانوي',
    category: 'تعبيرات وامتحانات',
    tips: 'إيديوم كلاسيكي شهير في امتحانات الثانوية العامة المصرية.'
  }
];

export const EnglishAITutor: React.FC = () => {
  // Voice selection & settings
  const [selectedAccent, setSelectedAccent] = useState<'UK' | 'US'>('UK');
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [selectedGrade, setSelectedGrade] = useState<string>('الكل');
  const [activeTab, setActiveTab] = useState<'vocab' | 'free_practice' | 'tips'>('vocab');

  // Currently playing word ID
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);

  // Free practice input & results
  const [customText, setCustomText] = useState<string>('Education is the most powerful weapon which you can use to change the world.');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [pronunciationResult, setPronunciationResult] = useState<PronunciationResult | null>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition on mount if available
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedAccent === 'UK' ? 'en-GB' : 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsRecording(false);
        evaluatePronunciation(transcript, customText);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechRecognitionSupported(false);
    }
  }, [selectedAccent, customText]);

  // Text-To-Speech Synthesis function
  const speakText = (text: string, id?: string) => {
    if (!('speechSynthesis' in window)) {
      alert('متصفحك لا يدعم محرك نطق الأصوات Web Speech API');
      return;
    }

    window.speechSynthesis.cancel();

    if (id) setPlayingWordId(id);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.lang = selectedAccent === 'UK' ? 'en-GB' : 'en-US';

    // Find native matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const voiceLangPrefix = selectedAccent === 'UK' ? 'en-GB' : 'en-US';
    const matchedVoice = voices.find(v => v.lang.startsWith(voiceLangPrefix) || v.lang.startsWith('en'));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      setPlayingWordId(null);
    };

    utterance.onerror = () => {
      setPlayingWordId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Evaluate Pronunciation Comparison
  const evaluatePronunciation = (spoken: string, target: string) => {
    const targetWords = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const spokenWords = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

    const matchedWords: string[] = [];
    const missedWords: string[] = [];

    targetWords.forEach(word => {
      if (spokenWords.includes(word)) {
        matchedWords.push(word);
      } else {
        missedWords.push(word);
      }
    });

    const score = targetWords.length > 0 
      ? Math.round((matchedWords.length / targetWords.length) * 100) 
      : 0;

    let feedback = '';
    if (score >= 90) {
      feedback = 'نطق مذهل وفائق الدقة! مخارج الحروف ممتازة تشبه المتحدثين الأصليين 🌟';
    } else if (score >= 75) {
      feedback = 'أداء جيد جداً! معظم الكلمات واضحة، حاول التمهل قليلاً عند نطق المقاطع المشددة ✨';
    } else {
      feedback = 'بداية جيدة! استمع للنطق النموذجي مرة أخرى وحاول تكرار الجملة بصوت مسموع ومتمهل 💪';
    }

    setPronunciationResult({
      targetText: target,
      spokenText: spoken,
      accuracyScore: score,
      feedback,
      matchedWords,
      missedWords
    });
  };

  const handleStartRecording = () => {
    if (!recognitionRef.current) {
      alert('خاصية التعرف على الصوت المباشر غير متوفرة في هذا المتصفح، جرب استخدام متصفح Google Chrome.');
      return;
    }
    setPronunciationResult(null);
    setIsRecording(true);
    try {
      recognitionRef.current.lang = selectedAccent === 'UK' ? 'en-GB' : 'en-US';
      recognitionRef.current.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // Filtered vocabulary list
  const filteredItems = CURRICULUM_ENGLISH_ITEMS.filter(item => {
    if (selectedGrade === 'الكل') return true;
    return item.grade === selectedGrade;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ------------------------------------------------------------------- */}
      {/* HERO BANNER: AI English Pronunciation Coach */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-amber-950/20 border border-blue-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="p-2 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Volume2 className="w-6 h-6" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
                معلم نطق اللغة الإنجليزية الذكي للطلاب (AI Pronunciation Coach) 🇬🇧 🇺🇸
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                ذكاء اصطناعي تفاعلي
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              استمع للنطق الإنجليزي الصحيح لمناهج الثانوية العامة والإعدادية، اختبر نطقك المباشر بالميكروفون، وتعرّف على الفونيمز (Phonetics) ومخارج الحروف الصعبة.
            </p>
          </div>

          {/* Quick Voice Settings Controls */}
          <div className="flex items-center gap-3 bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800">
            {/* Accent Toggle */}
            <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
              <button
                onClick={() => setSelectedAccent('UK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedAccent === 'UK' ? 'bg-blue-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🇬🇧 بريطاني (UK)
              </button>
              <button
                onClick={() => setSelectedAccent('US')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedAccent === 'US' ? 'bg-blue-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🇺🇸 أمريكي (US)
              </button>
            </div>

            {/* Speed selection */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <span className="text-[11px] text-zinc-500">السرعة:</span>
              <select
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 text-amber-300 font-bold rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                <option value="0.75">0.75x متمهل</option>
                <option value="0.9">0.9x قياسي</option>
                <option value="1.0">1.0x طبيعي</option>
                <option value="1.2">1.2x سريع</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TABS NAVIGATION: Vocabulary vs Free Speech Practice vs Secret Tips */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
        {[
          { id: 'vocab', label: '📚 بنك مفردات المناهج والنطق (3 إعدادي - 3 ثانوي)', icon: BookOpen },
          { id: 'free_practice', label: '🎙️ اختبر نطقك واكتب أي جملة للتدرب', icon: Mic },
          { id: 'tips', label: '💡 أسرار النطق وتجنب الأخطاء الشائعة للطلاب', icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-blue-500 text-zinc-950 shadow-md shadow-blue-500/20 font-extrabold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: CURRICULUM VOCABULARY BANK */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'vocab' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Grade Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400 font-semibold ml-2">تصفية حسب الصف الدراسي:</span>
            {[
              'الكل',
              'الصف الثالث الإعدادي',
              'الصف الأول الثانوي',
              'الصف الثاني الثانوي',
              'الصف الثالث الثانوي'
            ].map(grade => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedGrade === grade
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>

          {/* Vocabulary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const isPlaying = playingWordId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-blue-500/50 rounded-3xl p-5 shadow-xl transition flex flex-col justify-between space-y-4 group"
                >
                  <div>
                    {/* Header: Grade & Category badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {item.grade}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-semibold">
                        {item.category}
                      </span>
                    </div>

                    {/* Word & Phonetic IPA */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-zinc-100 tracking-wide font-sans group-hover:text-blue-300 transition">
                          {item.word}
                        </h3>
                        <span className="text-xs text-amber-400/90 font-mono block mt-0.5">
                          {item.phonetic}
                        </span>
                      </div>

                      {/* Play Audio Button */}
                      <button
                        onClick={() => speakText(item.word, item.id)}
                        className={`p-3 rounded-2xl transition shadow-lg ${
                          isPlaying
                            ? 'bg-amber-500 text-zinc-950 scale-110 animate-pulse'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
                        }`}
                        title="استمع للنطق الصحيح"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Arabic Translation */}
                    <p className="text-xs font-bold text-zinc-300 mt-2.5">
                      {item.arabicTranslation}
                    </p>

                    {/* Example Sentence */}
                    <div className="mt-3 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                      <p className="text-xs text-zinc-200 font-sans italic leading-relaxed">
                        "{item.exampleSentence}"
                      </p>
                      {item.exampleTranslation && (
                        <p className="text-[11px] text-zinc-400">
                          {item.exampleTranslation}
                        </p>
                      )}
                    </div>

                    {/* Linguistic Pronunciation Tip */}
                    {item.tips && (
                      <p className="text-[10px] text-amber-400/90 mt-2.5 flex items-start gap-1.5 bg-amber-500/5 p-2 rounded-xl border border-amber-500/20">
                        <span className="text-xs">💡</span>
                        <span>{item.tips}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions: Listen sentence or test */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                    <button
                      onClick={() => speakText(item.exampleSentence, `${item.id}_sent`)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>نطق الجملة كاملة</span>
                    </button>

                    <button
                      onClick={() => {
                        setCustomText(item.word);
                        setActiveTab('free_practice');
                      }}
                      className="py-1.5 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold border border-blue-500/30 transition"
                      title="تدرب على النطق بنفسك"
                    >
                      <span>اختبر نطقك 🎙️</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: FREE PRACTICE & SPEECH EVALUATION */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'free_practice' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
          <div className="bg-zinc-900 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-400" />
                <span>مختبر التدريب والنطق الذكي التفاعلي</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                اكتب أي كلمة، عبارة، أو فقرة إنجليزية ترغب في إتقانها، استمع لنطقها، ثم تحدث بالميكروفون ليقوم النظام بتقييم دقة نطقك!
              </p>
            </div>

            {/* Target Text Input */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                النص الإنجليزي المستهدف للتدريب:
              </label>
              <textarea
                rows={3}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type or paste any English sentence..."
                className="w-full py-3 px-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm font-sans text-zinc-100 focus:outline-none focus:border-blue-500 transition leading-relaxed"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-zinc-500">جمل مقترحة سريعة:</span>
              {[
                'Practice makes perfect.',
                'The early bird catches the worm.',
                'Curiosity is the key to knowledge.',
                'Never put off until tomorrow what you can do today.'
              ].map(phrase => (
                <button
                  key={phrase}
                  onClick={() => setCustomText(phrase)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 text-[11px] font-sans transition"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Actions: Listen vs Speak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => speakText(customText)}
                className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold rounded-xl border border-zinc-700 transition flex items-center justify-center gap-2 shadow-md"
              >
                <Volume2 className="w-4 h-4 text-blue-400" />
                <span>1. استمع للنطق النموذجي 🔊</span>
              </button>

              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`py-3 px-4 text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 ${
                  isRecording
                    ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-zinc-950 font-black hover:brightness-110'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>جاري الاستماع... اضغط لإنهاء التسجيل</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>2. سجّل نطقك وتحدث بالميكروفون 🎙️</span>
                  </>
                )}
              </button>
            </div>

            {/* Evaluation Result Feedback Card */}
            {pronunciationResult && (
              <div className="p-5 rounded-2xl bg-zinc-950 border border-blue-500/40 shadow-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {pronunciationResult.accuracyScore >= 85 ? '🎉' : pronunciationResult.accuracyScore >= 60 ? '✨' : '🎯'}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-200">نتيجة تقييم الذكاء الاصطناعي:</h4>
                  </div>
                  <span className={`text-base font-black px-3 py-1 rounded-xl ${
                    pronunciationResult.accuracyScore >= 80 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {pronunciationResult.accuracyScore}% دقة النطق
                  </span>
                </div>

                <p className="text-xs text-zinc-300">
                  {pronunciationResult.feedback}
                </p>

                <div className="p-3 rounded-xl bg-zinc-900 text-xs font-sans text-zinc-300">
                  <span className="text-[10px] text-zinc-500 block mb-1 font-sans">ما تم التقاطه من صوتك (Transcript):</span>
                  "{pronunciationResult.spokenText || 'لم يتم التقاط صوت واضح'}"
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 3: PRONUNCIATION TIPS FOR EGYPTIAN STUDENTS */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'tips' && (
        <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-amber-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>دليل الطالب المصري لإتقان النطق الإنجليزي وتفادي الأخطاء الشائعة</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                نصائح لغوية محددة صممها خبراء اللغة لمساعدة الطلاب على التمييز بين الأصوات الدقيقة:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-blue-400 flex items-center gap-2">
                  <span>1. التمييز الصوتي بين /P/ و /B/</span>
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  صوت <b>P</b> صوت انفجاري غير مجهور (Voiceless)، يخرج معه هواء ملحوظ من الشفتين (ضع ورقة أمام فمك عند نطق Pen لتتحرك). أما <b>B</b> فهو مجهور تهتز معه الأحبال الصوتية.
                </p>
                <div className="text-[11px] text-amber-400 font-mono">
                  مثال: Park ≠ Bark | Pen ≠ Ben | Pin ≠ Bin
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                  <span>2. نطق صوت /TH/ (الثاء والذال)</span>
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  لا تنطق TH كحرف السين أو الزاي! ضع طرف اللسان بين الأسنان العلوية والسفلية لخروج صوت /θ/ مثل <i>Think, Three</i> أو /ð/ مثل <i>This, That, The</i>.
                </p>
                <div className="text-[11px] text-amber-400 font-mono">
                  مثال: Think ≠ Sink | Thank ≠ Sank
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <span>3. الحروف الصامتة (Silent Letters)</span>
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  في الإنجليزية كلمات كثيرة تتضمن حروفاً تُكتب ولا تُنطق. احرص على عدم نطق الحرف الصامت:
                </p>
                <div className="text-[11px] text-amber-400 font-mono">
                  Doubt (الـ b صامتة) | Knife (الـ k صامتة) | Wednesday (الـ d صامتة)
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-purple-400 flex items-center gap-2">
                  <span>4. النبر الصوتي للكلمات (Word Stress)</span>
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  الكلمات الإنجليزية الطويلة تحتوي على مقطع مشدد واحد رئيسي (Primary Stress). إعطاء النبرة للمقطع الصحيح يجعل كلامك مفهوماً وسلساً للمستمعين.
                </p>
                <div className="text-[11px] text-amber-400 font-mono">
                  مثال: PHO-to-graph مقابل pho-TO-gra-phy
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
