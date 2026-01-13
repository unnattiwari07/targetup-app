import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import { motion, AnimatePresence } from "framer-motion"
import Papa from 'papaparse' // <--- IMPORT THIS

export default function App() {
  // --- STATE ---
  const [currentScreen, setCurrentScreen] = useState('HOME') 
  const [exams, setExams] = useState([])
  const [user, setUser] = useState(null)
  
  // Daily Fact State ☕
  const [dailyFact, setDailyFact] = useState(null)

  // Standard App State
  const [questions, setQuestions] = useState([])
  const [bookmarks, setBookmarks] = useState([]) 
  const [selectedExam, setSelectedExam] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [testConfig, setTestConfig] = useState({ examId: '', subject: 'All', chapter: 'All', qCount: 15 })
  const [testQuestions, setTestQuestions] = useState([]) 
  const [testTimeLeft, setTestTimeLeft] = useState(0) 
  const [testScore, setTestScore] = useState(null) 
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  const [showProfileMenu, setShowProfileMenu] = useState(false) 
  const [showAuthModal, setShowAuthModal] = useState(false) 
  const [authForm, setAuthForm] = useState({ email: '', password: '', isLogin: true })

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false) 
  const [showAddQForm, setShowAddQForm] = useState(false) 
  const [showExamManager, setShowExamManager] = useState(false)
  const [showFactManager, setShowFactManager] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false) // <--- NEW BULK STATE
  const [bulkFile, setBulkFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const [newQ, setNewQ] = useState({ text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', exam_id: '', subject: '', chapter: '', difficulty: 'Easy', yearTag: '', solution: '', imageFile: null, existingImage: '' })
  const [newExam, setNewExam] = useState({ name: '', subjects: '', secretCode: '', iconFile: null, existingIcon: '' })
  const [newFact, setNewFact] = useState({ title: '', description: '' })

  // --- INITIALIZATION ---
  useEffect(() => {
    const storedLogin = localStorage.getItem('targetup_admin_logged_in')
    if (storedLogin === 'true') setIsAdmin(true)
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); fetchUserData(session.user.id) }
      else loadLocalData()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); fetchUserData(session.user.id) }
      else { setUser(null); loadLocalData() }
    })

    fetchExams()
    fetchQuestions()
    fetchDailyFact()

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let timerId
    if (currentScreen === 'TEST_ACTIVE' && testTimeLeft > 0) {
      timerId = setInterval(() => { setTestTimeLeft(prev => prev - 1) }, 1000)
    } else if (currentScreen === 'TEST_ACTIVE' && testTimeLeft === 0) submitTest() 
    return () => clearInterval(timerId)
  }, [currentScreen, testTimeLeft])

  // --- DATA FUNCTIONS ---
  async function fetchDailyFact() {
    const { data } = await supabase.from('daily_facts').select('*').eq('is_active', true).order('id', { ascending: false }).limit(1).single()
    if (data) setDailyFact(data)
  }

  const handleSaveFact = async () => {
    if (!newFact.title || !newFact.description) return alert("Fill all fields!")
    await supabase.from('daily_facts').insert([{ title: newFact.title, description: newFact.description }])
    fetchDailyFact()
    setShowFactManager(false)
    setNewFact({ title: '', description: '' })
  }

  const handleBulkUpload = () => {
    if (!bulkFile) return alert("Please select a CSV file first!")
    setIsUploading(true)
    
    Papa.parse(bulkFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const rows = results.data
            // Validate first row
            if(!rows[0].question_text || !rows[0].exam_id) {
                setIsUploading(false)
                return alert("Invalid CSV Format! Columns needed: question_text, option_a, option_b, option_c, option_d, correct_option, exam_id, subject, chapter, difficulty")
            }

            // Insert into Supabase
            const { error } = await supabase.from('questions').insert(rows)
            
            setIsUploading(false)
            if (error) alert("Upload Failed: " + error.message)
            else {
                alert(`Success! Uploaded ${rows.length} questions.`)
                fetchQuestions()
                setShowBulkUpload(false)
            }
        },
        error: (err) => {
            setIsUploading(false)
            alert("CSV Error: " + err.message)
        }
    })
  }

  // (Existing Fetch Functions)
  const loadLocalData = () => { setBookmarks(JSON.parse(localStorage.getItem('targetup_bookmarks') || '[]')) }
  const fetchUserData = async (uid) => {
    const { data: b } = await supabase.from('user_bookmarks').select('question_id').eq('user_id', uid)
    if (b) setBookmarks(b.map(i => i.question_id))
  }
  async function fetchExams() { 
    const { data: allExams } = await supabase.from('exams').select('*').order('id', { ascending: true });
    let userBatches = [];
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('joined_batches').eq('id', user.id).single();
      userBatches = profile?.joined_batches || [];
    }
    const visibleExams = allExams?.filter(exam => {
        const isPublic = !exam.secret_code || exam.secret_code.trim() === '';
        const isUnlocked = userBatches.includes(exam.secret_code);
        return isPublic || isUnlocked || isAdmin;
    });
    setExams(visibleExams || []);
  }
  async function fetchQuestions() { const { data } = await supabase.from('questions').select('*').order('id', { ascending: false }); setQuestions(data || []) }

  // (App Logic)
  const startTest = () => { if (!testConfig.examId) return alert("Select Exam"); let pool = questions.filter(q => q.exam_id == testConfig.examId); if (testConfig.subject !== 'All') pool = pool.filter(q => q.subject === testConfig.subject); if (testConfig.chapter !== 'All') pool = pool.filter(q => q.chapter === testConfig.chapter); if (pool.length === 0) return alert("No questions!"); const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, testConfig.qCount); setTestQuestions(shuffled); setSelectedAnswers({}); setTestTimeLeft(shuffled.length * 120); setCurrentScreen('TEST_ACTIVE') }
  const submitTest = async () => { let correct = 0; testQuestions.forEach(q => { if (selectedAnswers[q.id] === q.correct_option) correct++ }); setTestScore({ total: correct * 4, maxMarks: testQuestions.length * 4 }); setCurrentScreen('TEST_RESULT') }
  const handleAuth = async () => { const { error } = authForm.isLogin ? await supabase.auth.signInWithPassword(authForm) : await supabase.auth.signUp(authForm); if (error) alert(error.message); else setShowAuthModal(false) }
  const handleLogout = async () => { setUser(null); setShowProfileMenu(false); setCurrentScreen('HOME'); await supabase.auth.signOut(); }
  const toggleBookmark = async (id) => { const newVal = bookmarks.includes(id) ? bookmarks.filter(b => b !== id) : [...bookmarks, id]; setBookmarks(newVal); if(user) { if(bookmarks.includes(id)) await supabase.from('user_bookmarks').delete().eq('user_id', user.id).eq('question_id', id); else await supabase.from('user_bookmarks').insert([{ user_id: user.id, question_id: id }]) } else localStorage.setItem('targetup_bookmarks', JSON.stringify(newVal)) }
  const handleSaveExam = async () => { const payload = { name: newExam.name, subjects: newExam.subjects.split(','), secret_code: newExam.secretCode ? newExam.secretCode.toUpperCase().trim() : null, icon_url: newExam.existingIcon || 'https://placehold.co/100' }; await supabase.from('exams').insert([payload]); fetchExams(); setShowExamManager(false) }
  const handleSaveQuestion = async () => { await supabase.from('questions').insert([{ question_text: newQ.text, option_a: newQ.opA, option_b: newQ.opB, option_c: newQ.opC, option_d: newQ.opD, correct_option: newQ.correct, exam_id: newQ.exam_id, subject: newQ.subject, chapter: newQ.chapter, difficulty: newQ.difficulty }]); fetchQuestions(); setShowAddQForm(false) }
  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60) < 10 ? '0' : ''}${s % 60}`

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans select-none">
      
      {/* HEADER */}
      <div className="p-4 bg-white shadow-sm sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {currentScreen !== 'HOME' && <button onClick={() => setCurrentScreen('HOME')} className="text-xl">⬅️</button>}
           <h1 className="text-xl font-bold text-blue-900 truncate">{currentScreen === 'HOME' ? 'TargetUP 🎯' : 'Test Mode'}</h1>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => user ? setShowProfileMenu(!showProfileMenu) : setShowAuthModal(true)} className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 border border-blue-200">{user ? user.email[0].toUpperCase() : '👤'}</button>
          {showProfileMenu && user && (<div className="absolute top-14 right-4 bg-white p-2 shadow-xl border rounded-xl z-50 w-48"><button onClick={() => {setCurrentScreen('PROFILE'); setShowProfileMenu(false)}} className="w-full text-left p-2 hover:bg-gray-50 rounded">Profile</button><button onClick={handleLogout} className="w-full text-left p-2 text-red-500 hover:bg-red-50 rounded">Logout</button></div>)}
          {isAdmin ? (
  <button onClick={() => { 
      setIsAdmin(false); 
      localStorage.removeItem('targetup_admin_logged_in'); // <--- THIS FIXES IT
  }} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
    Exit Admin
  </button>
) : (<button onClick={() => { if(prompt("Password:") === "@Nextmove7388##===") { setIsAdmin(true); localStorage.setItem('targetup_admin_logged_in','true') } }} className="text-gray-300">🔒</button>)}
        </div>
      </div>

      {/* ADMIN FLOATING BUTTONS */}
      {isAdmin && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
           <button onClick={() => setShowBulkUpload(true)} className="bg-green-600 text-white p-3 rounded-full shadow-lg font-bold">📤</button>
           <button onClick={() => setShowFactManager(true)} className="bg-orange-500 text-white p-3 rounded-full shadow-lg font-bold">☕</button>
           <button onClick={() => setShowExamManager(true)} className="bg-purple-600 text-white p-3 rounded-full shadow-lg font-bold">🏛️</button>
           <button onClick={() => setShowAddQForm(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg font-bold">+Q</button>
        </div>
      )}

      {/* --- SCREENS --- */}
      {currentScreen === 'HOME' && (
        <div className="p-4 space-y-6">
          {dailyFact && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-8xl opacity-10">☕</div>
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-bold text-orange-800 text-sm uppercase tracking-wider">{dailyFact.title}</h3>
                   <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-bold">Today</span>
                </div>
                <p className="text-gray-800 font-medium leading-relaxed">{dailyFact.description}</p>
                <div className="mt-3 flex gap-2">
                   <button onClick={() => navigator.share({title: dailyFact.title, text: dailyFact.description})} className="text-xs font-bold text-orange-600 bg-white px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm active:scale-95 transition">📤 Share</button>
                </div>
             </motion.div>
          )}

          <div>
            <h3 className="font-bold text-gray-700 mb-3">Your Exams</h3>
            <div className="grid grid-cols-2 gap-4">
              {exams.map(exam => (
                <motion.div whileTap={{ scale: 0.95 }} key={exam.id} onClick={() => { setSelectedExam(exam); setCurrentScreen('SUBJECT_SELECT') }} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 cursor-pointer">
                   <img src={exam.icon_url} className="w-10 h-10 object-contain" />
                   <span className="font-bold text-sm text-center">{exam.name}</span>
                   {exam.secret_code && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Private</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'SUBJECT_SELECT' && (<div className="p-4"><h1 className="text-2xl font-bold mb-4">{selectedExam?.name}</h1>{selectedExam?.subjects.map(s => <div key={s} onClick={() => { setSelectedSubject(s); setCurrentScreen('CHAPTER_SELECT') }} className="bg-white p-4 mb-2 rounded shadow-sm font-bold border">{s}</div>)}</div>)}
      {currentScreen === 'CHAPTER_SELECT' && (<div className="p-4"><h1 className="text-2xl font-bold mb-4">Select Chapter</h1>{user && <button onClick={() => setCurrentScreen('TEST_SETUP')} className="w-full bg-blue-600 text-white p-3 rounded font-bold mb-4">Start Random Test 🚀</button>}<div onClick={() => setCurrentScreen('QUESTIONS')} className="bg-white p-4 rounded shadow border font-bold text-center">Browse All Questions</div></div>)}
      {currentScreen === 'TEST_SETUP' && (<div className="p-4"><h2 className="text-xl font-bold mb-4">Configure Test</h2><button onClick={startTest} className="w-full bg-green-600 text-white p-4 rounded font-bold">Start Now</button></div>)}
      {currentScreen === 'TEST_ACTIVE' && (<div className="p-4"><div className="fixed top-16 left-0 right-0 bg-blue-600 text-white p-2 text-center font-bold">Time: {formatTime(testTimeLeft)}</div><div className="mt-10">{testQuestions.map((q, i) => (<div key={q.id} className="bg-white p-4 mb-4 rounded border"><p className="font-bold mb-2">Q{i+1}. {q.question_text}</p>{['A','B','C','D'].map(o => <button key={o} onClick={() => setSelectedAnswers({...selectedAnswers, [q.id]: o})} className={`block w-full text-left p-2 border mb-1 rounded ${selectedAnswers[q.id] === o ? 'bg-blue-100 border-blue-500' : ''}`}>{o}. {q[`option_${o.toLowerCase()}`]}</button>)}</div>))}</div><button onClick={submitTest} className="fixed bottom-0 w-full bg-green-600 text-white p-4 font-bold">Submit</button></div>)}
      {currentScreen === 'TEST_RESULT' && (<div className="p-4 text-center"><h1 className="text-4xl font-bold text-blue-600 mb-4">{testScore.total} / {testScore.maxMarks}</h1><button onClick={() => setCurrentScreen('HOME')} className="bg-gray-800 text-white px-6 py-3 rounded font-bold">Home</button></div>)}
      
      {currentScreen === 'PROFILE' && (
         <div className="p-4">
            <h2 className="text-2xl font-bold mb-6">Profile</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border text-center mb-6"><div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-blue-600 mb-3">{user?.email[0].toUpperCase()}</div><h3 className="font-bold">{user?.email}</h3></div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
               <h3 className="font-bold text-blue-900 mb-2">🔐 Join Private Batch</h3>
               <div className="flex gap-2">
                 <input id="batchInput" placeholder="Enter Code (e.g. SHARMA)" className="w-full p-2 border rounded uppercase font-bold text-sm"/>
                 <button onClick={async () => {
                    const code = document.getElementById('batchInput').value.trim().toUpperCase();
                    if(!code) return alert("Enter Code!");
                    const { data: valid } = await supabase.from('exams').select('secret_code').eq('secret_code', code).maybeSingle();
                    if(!valid) return alert("Invalid Code!");
                    const { data: p } = await supabase.from('profiles').select('joined_batches').eq('id', user.id).single();
                    const newBatches = [...(p?.joined_batches || []), code];
                    await supabase.from('profiles').update({ joined_batches: newBatches }).eq('id', user.id);
                    alert("Batch Joined!"); fetchExams(); setCurrentScreen('HOME');
                 }} className="bg-blue-600 text-white px-4 rounded font-bold">Join</button>
               </div>
            </div>
         </div>
      )}

      {/* ADMIN POPUPS */}
      {showFactManager && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6">
            <h2 className="text-xl font-bold text-orange-600 mb-4">Update Morning Chai ☕</h2>
            <input className="w-full bg-gray-50 p-3 rounded border mb-3 font-bold" value={newFact.title} onChange={e => setNewFact({...newFact, title: e.target.value})} placeholder="Title (e.g., Fact #12)" />
            <textarea className="w-full bg-gray-50 p-3 rounded border mb-4" rows="4" value={newFact.description} onChange={e => setNewFact({...newFact, description: e.target.value})} placeholder="What is the fact of the day?" />
            <button onClick={handleSaveFact} className="w-full bg-orange-600 text-white py-3 rounded font-bold shadow-lg">Publish Live 🚀</button>
            <button onClick={() => setShowFactManager(false)} className="w-full mt-2 text-gray-400 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* BULK UPLOAD POPUP (New) */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6">
            <h2 className="text-xl font-bold text-green-700 mb-4">Bulk Upload (CSV)</h2>
            <p className="text-sm text-gray-500 mb-4">Upload an Excel/CSV file with columns: <b>question_text, option_a... exam_id</b></p>
            <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files[0])} className="mb-4 text-sm"/>
            <button onClick={handleBulkUpload} disabled={isUploading} className="w-full bg-green-600 text-white py-3 rounded font-bold shadow-lg">
                {isUploading ? 'Uploading...' : 'Upload Questions 📤'}
            </button>
            <button onClick={() => setShowBulkUpload(false)} className="w-full mt-2 text-gray-400 text-sm">Cancel</button>
          </div>
        </div>
      )}

{showAuthModal && (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-sm rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">{authForm.isLogin ? 'Login' : 'Sign Up'}</h2>
      
      {/* GOOGLE LOGIN BUTTON (Restored) */}
      <button 
        onClick={async () => {
          const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
          if(error) alert(error.message);
        }}
        className="w-full bg-white border border-gray-300 text-gray-700 p-3 rounded font-bold mb-4 flex items-center justify-center gap-2"
      >
        <span>🇬</span> Continue with Google
      </button>

      <div className="flex items-center gap-2 mb-4">
        <div className="h-px bg-gray-200 flex-1"></div>
        <span className="text-gray-400 text-xs">OR</span>
        <div className="h-px bg-gray-200 flex-1"></div>
      </div>

      <input className="w-full p-2 border mb-2 rounded" placeholder="Email" value={authForm.email} onChange={e=>setAuthForm({...authForm, email:e.target.value})}/>
      <input className="w-full p-2 border mb-4 rounded" type="password" placeholder="Password" value={authForm.password} onChange={e=>setAuthForm({...authForm, password:e.target.value})}/>
      
      <button onClick={handleAuth} className="w-full bg-blue-600 text-white p-3 rounded font-bold">
        {authForm.isLogin ? 'Login' : 'Sign Up'}
      </button>
      
      <p onClick={()=>setAuthForm({...authForm, isLogin:!authForm.isLogin})} className="text-center mt-4 text-blue-500 cursor-pointer">
        Switch to {authForm.isLogin ? 'Sign Up' : 'Login'}
      </p>
      <button onClick={()=>setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
    </div>
    </div>
  )}
  </div>
)}