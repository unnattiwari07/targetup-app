import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // --- STATE MANAGEMENT ---
  const [currentScreen, setCurrentScreen] = useState('HOME') // HOME, SUBJECT_SELECT, CHAPTER_SELECT, QUESTIONS, SAVED, PROFILE, SETTINGS
  
  // Data State
  const [exams, setExams] = useState([])
  const [questions, setQuestions] = useState([])
  
  // User Data & Auth
  const [user, setUser] = useState(null)
  const [bookmarks, setBookmarks] = useState([]) 
  const [solvedQs, setSolvedQs] = useState([]) 
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  
  // Selection State
  const [selectedExam, setSelectedExam] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  
  // UI State
  const [showProfileMenu, setShowProfileMenu] = useState(false) // <--- TOGGLE FOR MENU
  const [darkMode, setDarkMode] = useState(false) // <--- SETTINGS DUMMY STATE
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false) 
  const [showAddQForm, setShowAddQForm] = useState(false) 
  const [showExamManager, setShowExamManager] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false) 
  const [editingQId, setEditingQId] = useState(null)
  const [editingExamId, setEditingExamId] = useState(null)
  const questionImageRef = useRef(null)

  // Forms
  const [newQ, setNewQ] = useState({
    text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', 
    exam_id: '', subject: '', chapter: '', difficulty: 'Easy',
    yearTag: '', solution: '', imageFile: null, existingImage: ''
  })
  const [newExam, setNewExam] = useState({ name: '', subjects: '', iconFile: null, existingIcon: '' })
  const [authForm, setAuthForm] = useState({ email: '', password: '', isLogin: true })

  useEffect(() => {
    // 1. Check Admin
    const storedLogin = localStorage.getItem('targetup_admin_logged_in')
    if (storedLogin === 'true') setIsAdmin(true)
    
    // 2. Check User Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchCloudUserData(session.user.id)
      else loadLocalUserData()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchCloudUserData(session.user.id)
      else loadLocalUserData()
    })

    fetchExams()
    fetchQuestions()

    return () => subscription.unsubscribe()
  }, [])

  // --- DATA LOADING ---
  const loadLocalUserData = () => {
    setBookmarks(JSON.parse(localStorage.getItem('targetup_bookmarks') || '[]'))
    setSolvedQs(JSON.parse(localStorage.getItem('targetup_solved') || '[]'))
  }

  const fetchCloudUserData = async (userId) => {
    const { data: solvedData } = await supabase.from('user_solved').select('question_id').eq('user_id', userId)
    if (solvedData) setSolvedQs(solvedData.map(item => item.question_id))

    const { data: bookmarkData } = await supabase.from('user_bookmarks').select('question_id').eq('user_id', userId)
    if (bookmarkData) setBookmarks(bookmarkData.map(item => item.question_id))
  }

  async function fetchExams() {
    const { data } = await supabase.from('exams').select('*').order('id', { ascending: true })
    setExams(data || [])
  }
  async function fetchQuestions() {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false })
    setQuestions(data || [])
  }

  // --- AUTH ACTIONS ---
  const handleAuth = async () => {
    if (!authForm.email || !authForm.password) return alert("Please fill all fields")
    const { error } = authForm.isLogin 
      ? await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
      : await supabase.auth.signUp({ email: authForm.email, password: authForm.password })
    
    if (error) alert(error.message)
    else { setShowAuthModal(false); if (!authForm.isLogin) alert("Account created!") }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: window.location.origin }
    })
    if (error) alert(error.message)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAuthForm({ email: '', password: '', isLogin: true })
    setShowProfileMenu(false)
    setCurrentScreen('HOME')
    loadLocalUserData()
  }

  // --- USER ACTIONS ---
  const toggleBookmark = async (id) => {
    const isBookmarked = bookmarks.includes(id)
    const newVal = isBookmarked ? bookmarks.filter(b => b !== id) : [...bookmarks, id]
    setBookmarks(newVal)
    if (user) {
      if (isBookmarked) await supabase.from('user_bookmarks').delete().eq('user_id', user.id).eq('question_id', id)
      else await supabase.from('user_bookmarks').insert([{ user_id: user.id, question_id: id }])
    } else localStorage.setItem('targetup_bookmarks', JSON.stringify(newVal))
  }

  const markQuestionSolved = async (id) => {
    if (!solvedQs.includes(id)) {
      const newVal = [...solvedQs, id]
      setSolvedQs(newVal)
      if (user) await supabase.from('user_solved').insert([{ user_id: user.id, question_id: id }])
      else localStorage.setItem('targetup_solved', JSON.stringify(newVal))
    }
  }

  const handleResetQuestion = async (id) => {
    const newAnswers = { ...selectedAnswers }; delete newAnswers[id]; setSelectedAnswers(newAnswers)
    if (solvedQs.includes(id)) {
      const newSolved = solvedQs.filter(qId => qId !== id)
      setSolvedQs(newSolved)
      if (user) await supabase.from('user_solved').delete().eq('user_id', user.id).eq('question_id', id)
      else localStorage.setItem('targetup_solved', JSON.stringify(newSolved))
    }
  }

  // --- NAVIGATION ---
  const handleExamSelect = (exam) => { setSelectedExam(exam); setCurrentScreen('SUBJECT_SELECT') }
  const handleSubjectSelect = (subj) => { setSelectedSubject(subj); setCurrentScreen('CHAPTER_SELECT') }
  const handleChapterSelect = (chap) => { setSelectedChapter(chap); setCurrentScreen('QUESTIONS') }
  
  const goBack = () => {
    if (currentScreen === 'PROFILE' || currentScreen === 'SETTINGS') setCurrentScreen('HOME')
    else if (currentScreen === 'QUESTIONS' || currentScreen === 'SAVED') setCurrentScreen('CHAPTER_SELECT')
    else if (currentScreen === 'SAVED') setCurrentScreen('HOME') 
    else if (currentScreen === 'QUESTIONS') setCurrentScreen('CHAPTER_SELECT')
    else if (currentScreen === 'CHAPTER_SELECT') setCurrentScreen('SUBJECT_SELECT')
    else if (currentScreen === 'SUBJECT_SELECT') setCurrentScreen('HOME')
  }

  // --- ADMIN FUNCTIONS ---
  const handleSaveExam = async () => {
    if (!newExam.name || !newExam.subjects) return alert("Enter details!")
    let iconUrl = newExam.existingIcon || 'https://placehold.co/100?text=Ex' 
    if (newExam.iconFile) {
      const fileName = `${Date.now()}-${newExam.iconFile.name}`
      const { error } = await supabase.storage.from('exam-icons').upload(fileName, newExam.iconFile)
      if (!error) { const { data } = supabase.storage.from('exam-icons').getPublicUrl(fileName); iconUrl = data.publicUrl }
    }
    const subjects = newExam.subjects.split(',').map(s => s.trim()); const payload = { name: newExam.name, subjects, icon_url: iconUrl }
    if (editingExamId) await supabase.from('exams').update(payload).eq('id', editingExamId); else await supabase.from('exams').insert([payload])
    setNewExam({ name: '', subjects: '', iconFile: null, existingIcon: '' }); setEditingExamId(null); setShowExamManager(false); fetchExams()
  }
  const handleDeleteExam = async (e, id) => { e.stopPropagation(); if (!window.confirm("Delete Exam?")) return; await supabase.from('questions').delete().eq('exam_id', id); await supabase.from('exams').delete().eq('id', id); fetchExams() }
  const handleSaveQuestion = async () => {
    if (!newQ.text || !newQ.exam_id || !newQ.chapter) return alert("Fill fields!"); let imageUrl = newQ.existingImage || null
    if (newQ.imageFile) { const fileName = `q-${Date.now()}-${newQ.imageFile.name}`; const { error } = await supabase.storage.from('question-images').upload(fileName, newQ.imageFile); if (!error) { const { data } = supabase.storage.from('question-images').getPublicUrl(fileName); imageUrl = data.publicUrl } }
    const payload = { question_text: newQ.text, option_a: newQ.opA, option_b: newQ.opB, option_c: newQ.opC, option_d: newQ.opD, correct_option: newQ.correct, exam_id: newQ.exam_id, subject: newQ.subject, chapter: newQ.chapter, difficulty: newQ.difficulty, exam_year: newQ.yearTag, solution_text: newQ.solution, image_url: imageUrl }
    if (editingQId) await supabase.from('questions').update(payload).eq('id', editingQId); else await supabase.from('questions').insert([payload])
    fetchQuestions(); resetQForm()
  }
  const handleDeleteQ = async (id) => { if (!window.confirm("Delete?")) return; await supabase.from('questions').delete().eq('id', id); fetchQuestions() }
  const resetQForm = () => { setNewQ({ text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', exam_id: '', subject: '', chapter: '', difficulty: 'Easy', yearTag: '', solution: '', imageFile: null, existingImage: '' }); setEditingQId(null); setShowAddQForm(false) }

  // --- CALCULATORS ---
  const getExamProgress = (examId) => {
    const total = questions.filter(q => q.exam_id === examId).length
    if (total === 0) return 0
    const solved = questions.filter(q => q.exam_id === examId && solvedQs.includes(q.id)).length
    return Math.round((solved / total) * 100)
  }
  const getChapters = () => {
    const relevantQs = questions.filter(q => q.exam_id === selectedExam?.id && q.subject === selectedSubject)
    const chapters = [...new Set(relevantQs.map(q => q.chapter))]
    return chapters.map(chap => {
      const chapQs = relevantQs.filter(q => q.chapter === chap)
      const solvedCount = chapQs.filter(q => solvedQs.includes(q.id)).length
      const percent = chapQs.length === 0 ? 0 : Math.round((solvedCount / chapQs.length) * 100)
      return { name: chap, total: chapQs.length, solved: solvedCount, percent }
    })
  }
  const getAllChapters = () => [...new Set(questions.map(q => q.chapter))]
  const getVisibleQuestions = () => {
    if (currentScreen === 'SAVED') return questions.filter(q => bookmarks.includes(q.id))
    return questions.filter(q => q.exam_id == selectedExam?.id && q.subject === selectedSubject && q.chapter === selectedChapter)
  }

  // --- RENDER ---
  return (
    <div className={`min-h-screen font-sans pb-20 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* HEADER */}
      <div className={`p-4 shadow-sm sticky top-0 z-50 flex justify-between items-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
           {currentScreen !== 'HOME' && <button onClick={goBack} className="text-xl p-1">⬅️</button>}
           <h1 className={`text-xl font-bold truncate max-w-[200px] ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>
             {currentScreen === 'HOME' ? 'TargetUP 🎯' : 
              currentScreen === 'SAVED' ? 'Saved' : 
              currentScreen === 'PROFILE' ? 'My Profile' : 
              currentScreen === 'SETTINGS' ? 'Settings' : 
              selectedChapter || selectedSubject || selectedExam?.name}
           </h1>
        </div>
        <div className="flex gap-3 items-center relative">
          
          {/* USER PROFILE ICON (CLICK TOGGLES MENU) */}
          <button onClick={() => user ? setShowProfileMenu(!showProfileMenu) : setShowAuthModal(true)} 
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs transition overflow-hidden ${user ? 'border-blue-500' : 'border-gray-300 bg-gray-200 text-gray-500'}`}>
            {user ? (
              user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" /> : user.email[0].toUpperCase()
            ) : '👤'}
          </button>

          {/* --- DROPDOWN MENU --- */}
          {showProfileMenu && user && (
            <div className={`absolute top-12 right-0 w-64 rounded-xl shadow-2xl border animation-fade-in z-50 overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              
              {/* Menu Header */}
              <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-blue-50/50">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg overflow-hidden">
                   {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" /> : user.email[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm truncate text-gray-800">{user.user_metadata?.full_name || 'Student'}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button onClick={() => { setCurrentScreen('PROFILE'); setShowProfileMenu(false) }} 
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium flex gap-3 items-center text-gray-700">
                  <span>👤</span> My Profile
                </button>
                <button onClick={() => { setCurrentScreen('SAVED'); setShowProfileMenu(false) }} 
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium flex gap-3 items-center text-gray-700">
                  <span>❤️</span> Saved Questions
                </button>
                <button onClick={() => { setCurrentScreen('SETTINGS'); setShowProfileMenu(false) }} 
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-sm font-medium flex gap-3 items-center text-gray-700">
                  <span>⚙️</span> Settings
                </button>
              </div>

              {/* Logout */}
              <div className="p-2 border-t border-gray-100">
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 rounded-lg hover:bg-red-50 text-sm font-bold text-red-500 flex gap-3 items-center">
                  <span>🚪</span> Log Out
                </button>
              </div>
            </div>
          )}

          {/* ADMIN LOCK (Kept Separate) */}
          {isAdmin ? (
            <button onClick={() => {setIsAdmin(false); localStorage.removeItem('targetup_admin_logged_in')}} className="text-red-500 text-xs border border-red-200 px-2 py-1 rounded">Exit</button>
          ) : (
            <button onClick={() => { if(prompt("Password:") === "@Nextmove7388##===") { setIsAdmin(true); localStorage.setItem('targetup_admin_logged_in','true') } }} className="text-gray-400 text-xl">🔒</button>
          )}
        </div>
      </div>

      {/* --- AUTH MODAL --- */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h2 className="text-lg font-bold mb-4 text-blue-700">{authForm.isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
            <div className="space-y-3">
              <input className="w-full bg-gray-100 p-2 rounded border" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
              <input className="w-full bg-gray-100 p-2 rounded border" type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
              <button onClick={handleAuth} className="w-full bg-blue-600 text-white py-3 rounded font-bold">{authForm.isLogin ? 'Log In' : 'Sign Up'}</button>
              <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span><div className="flex-grow border-t border-gray-200"></div></div>
              <button onClick={handleGoogleLogin} className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded font-bold flex items-center justify-center gap-2 hover:bg-gray-50"><img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />Continue with Google</button>
              <p onClick={() => setAuthForm({...authForm, isLogin: !authForm.isLogin})} className="text-center text-sm text-blue-500 cursor-pointer underline">{authForm.isLogin ? 'No account? Sign up' : 'Have an account? Log in'}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN TOOLS --- */}
      {isAdmin && (<div className="fixed bottom-4 right-4 z-50 flex gap-2"><button onClick={() => { setNewExam({ name: '', subjects: '', iconFile: null, existingIcon: '' }); setShowExamManager(true) }} className="bg-purple-600 text-white p-3 rounded-full shadow-lg font-bold">🏛️</button><button onClick={() => setShowAddQForm(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg font-bold">+Q</button></div>)}

      {/* --- NEW SCREENS --- */}

      {/* A. PROFILE SCREEN */}
      {currentScreen === 'PROFILE' && user && (
        <div className="p-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center mb-6">
             <div className="w-24 h-24 rounded-full bg-blue-100 mb-4 p-1 border-4 border-white shadow-lg overflow-hidden">
                {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover rounded-full" /> : <span className="w-full h-full flex items-center justify-center text-3xl font-bold text-blue-600">{user.email[0].toUpperCase()}</span>}
             </div>
             <h2 className="text-xl font-bold text-gray-900">{user.user_metadata?.full_name || 'Student'}</h2>
             <p className="text-sm text-gray-500">{user.email}</p>
             <button className="mt-4 border border-gray-300 px-4 py-1.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50">Edit Profile</button>
          </div>

          <h3 className="font-bold text-gray-700 mb-3">Your Stats</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
               <p className="text-3xl font-black text-blue-600">{solvedQs.length}</p>
               <p className="text-xs text-gray-500 font-bold uppercase">Questions Solved</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-xl border border-pink-100 text-center">
               <p className="text-3xl font-black text-pink-600">{bookmarks.length}</p>
               <p className="text-xs text-gray-500 font-bold uppercase">Bookmarks</p>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
               <p className="text-3xl font-black text-green-600">{questions.length > 0 ? Math.round((solvedQs.length / questions.length) * 100) : 0}%</p>
               <p className="text-xs text-gray-500 font-bold uppercase">Overall Completion</p>
          </div>
        </div>
      )}

      {/* B. SETTINGS SCREEN */}
      {currentScreen === 'SETTINGS' && (
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <span className="font-medium text-gray-700">Dark Mode</span>
              <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full p-1 transition ${darkMode ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition transform ${darkMode ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center opacity-50">
              <span className="font-medium text-gray-700">Sound Effects</span>
              <div className="w-12 h-6 bg-gray-200 rounded-full p-1"><div className="w-4 h-4 bg-white rounded-full shadow"></div></div>
            </div>
            <div className="p-4 flex justify-between items-center opacity-50">
              <span className="font-medium text-gray-700">Push Notifications</span>
              <div className="w-12 h-6 bg-gray-200 rounded-full p-1"><div className="w-4 h-4 bg-white rounded-full shadow"></div></div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">TargetUP Version 1.0.2</p>
            <p className="text-xs text-gray-300 mt-1">Made with ❤️ for Students</p>
          </div>
        </div>
      )}

      {/* --- STANDARD SCREENS (HOME, CHAPTERS, QUESTIONS) --- */}
      
      {currentScreen === 'HOME' && (
        <div className="p-4">
          {!user && <div onClick={() => setShowAuthModal(true)} className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-4 text-center cursor-pointer"><p className="text-blue-800 font-bold text-sm">☁️ Sync to Cloud</p><p className="text-blue-500 text-xs">Log in to save your progress.</p></div>}
          <div onClick={() => setCurrentScreen('SAVED')} className="bg-pink-100 border border-pink-200 p-4 rounded-xl mb-6 flex items-center justify-between cursor-pointer active:scale-95 transition"><div className="flex items-center gap-3"><span className="text-2xl">❤️</span><div><h3 className="font-bold text-pink-800">Saved Questions</h3><p className="text-xs text-pink-600">{bookmarks.length} saved</p></div></div><span className="text-pink-400">➔</span></div>
          <h3 className="font-bold text-gray-700 mb-3 ml-1">Select Exam</h3>
          <div className="grid grid-cols-2 gap-4">{exams.map(exam => { const progress = getExamProgress(exam.id); return (<div key={exam.id} onClick={() => handleExamSelect(exam)} className="relative bg-white p-6 rounded-xl shadow border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition cursor-pointer overflow-hidden"><img src={exam.icon_url} className="w-12 h-12 object-contain" /><span className="font-bold text-gray-800 text-center">{exam.name}</span><div className="w-full h-1.5 bg-gray-100 rounded-full mt-1"><div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{width: `${progress}%`}}></div></div><span className="text-[10px] text-gray-400 font-bold">{progress}% Solved</span>{isAdmin && <button onClick={(e) => { e.stopPropagation(); setEditingExamId(exam.id); setNewExam({ name: exam.name, subjects: exam.subjects.join(','), existingIcon: exam.icon_url }); setShowExamManager(true) }} className="absolute top-1 right-1 text-gray-300 hover:text-blue-500">✏️</button>}</div>)})}</div>
        </div>
      )}

      {currentScreen === 'SUBJECT_SELECT' && (
        <div className="p-4 space-y-3"><div className="mb-4"><h1 className="text-2xl font-bold text-gray-800">{selectedExam.name}</h1></div>{selectedExam.subjects.map(subject => (<div key={subject} onClick={() => handleSubjectSelect(subject)} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-blue-50 cursor-pointer"><span className="font-bold text-gray-800">{subject}</span><span className="text-gray-300">➔</span></div>))}</div>
      )}

      {currentScreen === 'CHAPTER_SELECT' && (
        <div className="p-4 space-y-3"><div className="mb-4"><h2 className="text-sm text-gray-500">{selectedExam.name} &gt; {selectedSubject}</h2><h1 className="text-2xl font-bold text-gray-800">Select Chapter</h1></div>{getChapters().map(chap => (<div key={chap.name} onClick={() => handleChapterSelect(chap.name)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-blue-50 cursor-pointer"><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-gray-800">{chap.name}</h3><span className="text-blue-500 text-xs font-bold bg-blue-50 px-2 py-1 rounded">{chap.solved}/{chap.total}</span></div><div className="w-full h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{width: `${chap.percent}%`}}></div></div></div>))}</div>
      )}

      {(currentScreen === 'QUESTIONS' || currentScreen === 'SAVED') && (
        <div className="p-4 grid gap-4 md:grid-cols-2">{getVisibleQuestions().length === 0 && <p className="text-center text-gray-400 col-span-2 mt-10">No questions found.</p>}{getVisibleQuestions().map((q, i) => (<div key={q.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative">{isAdmin && (<div className="absolute top-4 right-4 flex gap-2 z-10"><button onClick={() => { setEditingQId(q.id); setNewQ({ ...q, exam_id: q.exam_id, text: q.question_text, opA: q.option_a, opB: q.option_b, opC: q.option_c, opD: q.option_d, correct: q.correct_option, chapter: q.chapter, yearTag: q.exam_year || '', solution: q.solution_text || '', existingImage: q.image_url }); setShowAddQForm(true) }} className="text-blue-400 bg-white p-1 rounded shadow">✏️</button><button onClick={() => handleDeleteQ(q.id)} className="text-red-400 bg-white p-1 rounded shadow">🗑️</button></div>)}<div className="mb-3 flex justify-between items-start pr-16"><div><div className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">{q.chapter}</div><span className={`text-xs px-2 py-0.5 rounded border ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>{q.difficulty}</span></div><div className="flex gap-3"><button onClick={() => toggleBookmark(q.id)} className="transition active:scale-125">{bookmarks.includes(q.id) ? '❤️' : '🤍'}</button>{selectedAnswers[q.id] && (<button onClick={() => handleResetQuestion(q.id)} className="text-gray-400 hover:text-blue-600 transition">🔄</button>)}</div></div>{q.image_url && <img src={q.image_url} alt="Diagram" className="rounded-lg w-full max-h-60 object-contain bg-gray-50 border mb-4" />}<h2 className="text-lg font-medium text-gray-800 mb-4 whitespace-pre-wrap">{q.question_text}</h2>{['A','B','C','D'].map(key => (<button key={key} onClick={() => { if(!selectedAnswers[q.id]) { setSelectedAnswers({...selectedAnswers, [q.id]: key}); if(q.correct_option === key) markQuestionSolved(q.id) }}} className={`w-full text-left p-3 rounded-lg border mb-2 text-sm ${selectedAnswers[q.id] ? (q.correct_option===key ? 'bg-green-100 border-green-400' : selectedAnswers[q.id]===key ? 'bg-red-100 border-red-400' : 'opacity-50') : 'hover:bg-gray-50'}`}><span className="font-bold mr-2">{key}.</span> {q[`option_${key.toLowerCase()}`]}</button>))}{q.exam_year && <div className="mt-2 text-xs text-gray-400 font-medium flex items-center gap-1">📅 {q.exam_year}</div>}{selectedAnswers[q.id] && q.solution_text && (<details className="mt-3 group"><summary className="cursor-pointer text-sm font-bold text-blue-600 bg-blue-50 p-2 rounded hover:bg-blue-100 flex justify-between"><span>💡 View Solution</span><span>▼</span></summary><div className="p-3 bg-gray-50 text-gray-700 text-sm border border-gray-200 rounded-b mt-1 whitespace-pre-wrap">{q.solution_text}</div></details>)}</div>))}</div>
      )}

      {/* ADMIN POPUPS (Same as before) */}
      {isAdmin && showExamManager && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-xl p-6 relative"><button onClick={() => setShowExamManager(false)} className="absolute top-4 right-4 text-gray-400">✕</button><h2 className="text-lg font-bold mb-4 text-purple-700">Exam</h2><input className="w-full bg-gray-100 p-2 rounded border mb-2" value={newExam.name} onChange={e => setNewExam({...newExam, name: e.target.value})} placeholder="Name"/><input className="w-full bg-gray-100 p-2 rounded border mb-2" value={newExam.subjects} onChange={e => setNewExam({...newExam, subjects: e.target.value})} placeholder="Subjects"/><input type="file" onChange={e => setNewExam({...newExam, iconFile: e.target.files[0]})} className="text-sm"/><button onClick={handleSaveExam} className="w-full bg-purple-600 text-white py-3 rounded font-bold mt-3">Save</button></div></div>)}
      {isAdmin && showAddQForm && (<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-xl p-6 relative max-h-[90vh] overflow-y-auto"><button onClick={resetQForm} className="absolute top-4 right-4 text-gray-400">✕</button><h2 className="text-lg font-bold mb-4 text-blue-700">Add/Edit Q</h2><div className="space-y-3"><div className="grid grid-cols-2 gap-2"><select className="p-2 rounded bg-gray-100 border" value={newQ.exam_id} onChange={e => { const ex = exams.find(x => x.id == e.target.value); setNewQ({...newQ, exam_id: e.target.value, subject: ex?.subjects[0] || ''}) }}><option>Exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select><select className="p-2 rounded bg-gray-100 border" value={newQ.subject} onChange={e => setNewQ({...newQ, subject: e.target.value})}>{exams.find(ex => ex.id == newQ.exam_id)?.subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold text-gray-500">Chapter</label><input list="chapters-list" className="w-full bg-blue-50 p-2 rounded border" value={newQ.chapter} onChange={e => setNewQ({...newQ, chapter: e.target.value})}/><datalist id="chapters-list">{getAllChapters().map(c=><option key={c} value={c}/>)}</datalist></div><div><label className="text-xs font-bold text-gray-500">Year</label><input className="w-full bg-gray-100 p-2 rounded border" value={newQ.yearTag} onChange={e => setNewQ({...newQ, yearTag: e.target.value})}/></div></div><div><label className="text-xs font-bold text-gray-500">Image</label><input type="file" ref={questionImageRef} className="w-full text-sm" onChange={e => setNewQ({...newQ, imageFile: e.target.files[0]})}/></div><textarea className="w-full bg-gray-100 p-3 rounded border" rows="2" value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})}/><textarea className="w-full bg-green-50 p-3 rounded border border-green-200 text-sm" rows="3" value={newQ.solution} onChange={e => setNewQ({...newQ, solution: e.target.value})}/><div className="grid grid-cols-2 gap-2"><input className="bg-gray-100 p-2 rounded" placeholder="A" value={newQ.opA} onChange={e => setNewQ({...newQ, opA: e.target.value})}/><input className="bg-gray-100 p-2 rounded" placeholder="B" value={newQ.opB} onChange={e => setNewQ({...newQ, opB: e.target.value})}/><input className="bg-gray-100 p-2 rounded" placeholder="C" value={newQ.opC} onChange={e => setNewQ({...newQ, opC: e.target.value})}/><input className="bg-gray-100 p-2 rounded" placeholder="D" value={newQ.opD} onChange={e => setNewQ({...newQ, opD: e.target.value})}/></div><div className="grid grid-cols-2 gap-2"><select className="bg-gray-100 p-2 rounded" value={newQ.correct} onChange={e => setNewQ({...newQ, correct: e.target.value})}><option>A</option><option>B</option><option>C</option><option>D</option></select><select className="bg-gray-100 p-2 rounded" value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: e.target.value})}><option>Easy</option><option>Medium</option><option>Hard</option></select></div><button onClick={handleSaveQuestion} className="w-full bg-blue-600 text-white py-3 rounded font-bold">Save</button></div></div></div>)}

    </div>
  )
}