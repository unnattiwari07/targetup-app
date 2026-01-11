import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // --- NAVIGATION STATE ---
  const [currentScreen, setCurrentScreen] = useState('HOME') // 'HOME', 'SUBJECT_SELECT', 'QUESTIONS'
  const [selectedExam, setSelectedExam] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  
  // --- DATA STATE ---
  const [questions, setQuestions] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  
  // --- ADMIN STATE ---
  const [isAdmin, setIsAdmin] = useState(false) 
  const [showAddForm, setShowAddForm] = useState(false) 
  const [editingId, setEditingId] = useState(null)
  
  // --- NEW QUESTION FORM STATE ---
  const [newQ, setNewQ] = useState({
    text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', subject: 'GK', difficulty: 'Easy'
  })

  // --- EXAM & SUBJECT MAPPING ---
  // This mimics the "Marks" app categories
  const EXAMS = [
    { id: 'JEE', name: 'JEE Main', icon: '🧪', subjects: ['Maths', 'Science'] },
    { id: 'SSC', name: 'SSC / Govt', icon: '🏛️', subjects: ['GK', 'Reasoning', 'English', 'Maths'] },
    { id: 'NEET', name: 'NEET', icon: '🩺', subjects: ['Science'] },
    { id: 'UPSC', name: 'UPSC', icon: '🇮🇳', subjects: ['GK', 'History', 'Geography'] }
  ]

  useEffect(() => {
    // Check Login
    const storedLogin = localStorage.getItem('targetup_admin_logged_in')
    if (storedLogin === 'true') setIsAdmin(true)
    // Load Data
    getQuestions()
  }, [])

  async function getQuestions() {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false })
    setQuestions(data || [])
  }

  // --- NAVIGATION HANDLERS ---
  const handleExamSelect = (exam) => {
    setSelectedExam(exam)
    setCurrentScreen('SUBJECT_SELECT')
  }

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject)
    setCurrentScreen('QUESTIONS')
  }

  const goBack = () => {
    if (currentScreen === 'QUESTIONS') setCurrentScreen('SUBJECT_SELECT')
    else if (currentScreen === 'SUBJECT_SELECT') setCurrentScreen('HOME')
  }

  // --- ADMIN FUNCTIONS ---
  const handleAdminLogin = () => {
    const password = prompt("Enter Admin Password:")
    if (password === "@Nextmove7388##===") { 
      setIsAdmin(true)
      localStorage.setItem('targetup_admin_logged_in', 'true')
    } else {
      alert("Wrong password!")
    }
  }

  const handleLogout = () => {
    setIsAdmin(false)
    localStorage.removeItem('targetup_admin_logged_in')
  }

  const handleSaveQuestion = async () => {
    if (!newQ.text || !newQ.opA) return alert("Please fill all fields")
    const questionData = {
      question_text: newQ.text,
      option_a: newQ.opA, option_b: newQ.opB, option_c: newQ.opC, option_d: newQ.opD,
      correct_option: newQ.correct,
      subject: newQ.subject,
      difficulty: newQ.difficulty,
      chapter: 'General'
    }
    if (editingId) {
      await supabase.from('questions').update(questionData).eq('id', editingId)
      alert("Updated! ✅")
    } else {
      await supabase.from('questions').insert([questionData])
      alert("Added! 🚀")
    }
    getQuestions(); resetForm()
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this?")) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (!error) setQuestions(questions.filter(q => q.id !== id))
  }

  const handleEditClick = (q) => {
    setEditingId(q.id)
    setNewQ({
      text: q.question_text, opA: q.option_a, opB: q.option_b, opC: q.option_c, opD: q.option_d,
      correct: q.correct_option, subject: q.subject, difficulty: q.difficulty
    })
    setShowAddForm(true)
  }

  const resetForm = () => {
    setNewQ({ text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', subject: 'GK', difficulty: 'Easy' })
    setEditingId(null); setShowAddForm(false)
  }

  // --- QUIZ HELPER ---
  const handleOptionClick = (questionId, selectedOption) => {
    if (selectedAnswers[questionId]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: selectedOption }))
  }

  // Filter questions based on where we are in the flow
  const visibleQuestions = questions.filter(q => {
    if (currentScreen !== 'QUESTIONS') return false
    return q.subject === selectedSubject
  })

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      
      {/* --- TOP HEADER (Like Marks App) --- */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {/* Back Button (Only shows if not Home) */}
           {currentScreen !== 'HOME' && (
             <button onClick={goBack} className="text-xl p-1">⬅️</button>
           )}
           <div>
             <h1 className="text-xl font-bold text-blue-900">
               {currentScreen === 'HOME' ? 'TargetUP 🎯' : 
                currentScreen === 'SUBJECT_SELECT' ? selectedExam?.name : 
                selectedSubject}
             </h1>
             {currentScreen === 'HOME' && <p className="text-xs text-gray-500">Let's crack it today!</p>}
           </div>
        </div>

        {/* Admin Lock */}
        {isAdmin ? (
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold shadow">+ Add</button>
            <button onClick={handleLogout} className="text-red-500 border border-red-200 px-2 py-1 rounded text-xs">Exit</button>
          </div>
        ) : (
          <button onClick={handleAdminLogin} className="text-gray-400 text-xl">🔒</button>
        )}
      </div>

      {/* --- ADMIN FORM POPUP --- */}
      {isAdmin && showAddForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-6 relative">
            <button onClick={resetForm} className="absolute top-4 right-4 text-gray-400 text-xl">✕</button>
            <h2 className="text-lg font-bold mb-4">Add/Edit Question</h2>
            <div className="space-y-3">
              <input className="w-full bg-gray-100 p-3 rounded" placeholder="Question" value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input className="bg-gray-100 p-2 rounded" placeholder="Op A" value={newQ.opA} onChange={e => setNewQ({...newQ, opA: e.target.value})} />
                <input className="bg-gray-100 p-2 rounded" placeholder="Op B" value={newQ.opB} onChange={e => setNewQ({...newQ, opB: e.target.value})} />
                <input className="bg-gray-100 p-2 rounded" placeholder="Op C" value={newQ.opC} onChange={e => setNewQ({...newQ, opC: e.target.value})} />
                <input className="bg-gray-100 p-2 rounded" placeholder="Op D" value={newQ.opD} onChange={e => setNewQ({...newQ, opD: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                 <select className="bg-gray-100 p-2 rounded" value={newQ.correct} onChange={e => setNewQ({...newQ, correct: e.target.value})}>
                   <option value="A">Ans: A</option><option value="B">Ans: B</option><option value="C">Ans: C</option><option value="D">Ans: D</option>
                 </select>
                 <select className="bg-gray-100 p-2 rounded" value={newQ.subject} onChange={e => setNewQ({...newQ, subject: e.target.value})}>
                   <option value="GK">GK</option><option value="Maths">Maths</option><option value="Science">Science</option><option value="English">English</option><option value="Reasoning">Reasoning</option>
                 </select>
                 <select className="bg-gray-100 p-2 rounded" value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: e.target.value})}>
                   <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                 </select>
              </div>
              <button onClick={handleSaveQuestion} className="w-full bg-blue-600 text-white py-3 rounded font-bold mt-2">Save Question</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SCREEN 1: HOME (EXAM SELECTION) --- */}
      {currentScreen === 'HOME' && (
        <div className="p-4">
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <h2 className="text-xl font-bold mb-1">India's Biggest Mock Test 🇮🇳</h2>
            <p className="text-blue-100 text-sm mb-3">Live for JEE, NEET & SSC Aspirants</p>
            <button className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold shadow">Register Free</button>
          </div>
          
          <h3 className="font-bold text-gray-700 mb-3 ml-1">Select Your Exam</h3>
          <div className="grid grid-cols-2 gap-4">
            {EXAMS.map(exam => (
              <div key={exam.id} onClick={() => handleExamSelect(exam)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition cursor-pointer hover:border-blue-300">
                <span className="text-4xl">{exam.icon}</span>
                <span className="font-bold text-gray-800">{exam.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Explore ➔</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SCREEN 2: SUBJECT SELECTION --- */}
      {currentScreen === 'SUBJECT_SELECT' && (
        <div className="p-4">
          <div className="mb-4">
             <h2 className="text-gray-500 text-sm">Exam Category</h2>
             <h1 className="text-2xl font-bold text-gray-800">{selectedExam.name}</h1>
          </div>

          <h3 className="font-bold text-gray-700 mb-3">Subjects</h3>
          <div className="space-y-3">
            {selectedExam.subjects.map(subject => (
              <div key={subject} onClick={() => handleSubjectSelect(subject)}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-blue-50 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${subject === 'Maths' ? 'bg-orange-100 text-orange-600' : 
                      subject === 'Science' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                    {subject[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{subject}</h4>
                    <p className="text-xs text-gray-400">Tap to practice</p>
                  </div>
                </div>
                <span className="text-gray-300">➔</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SCREEN 3: QUESTIONS (THE QUIZ) --- */}
      {currentScreen === 'QUESTIONS' && (
        <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleQuestions.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-5xl mb-4">📭</p>
              <p>No questions found for {selectedSubject}.</p>
              {isAdmin && <p className="text-sm text-blue-500 mt-2">Click "+ Add" to create one!</p>}
            </div>
          ) : (
            visibleQuestions.map((q, index) => {
              const userAnswer = selectedAnswers[q.id];
              const isAnswered = userAnswer != null;
              return (
                <div key={q.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative">
                  
                  {/* ADMIN EDIT/DELETE */}
                  {isAdmin && (
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => handleEditClick(q)} className="text-blue-400 hover:text-blue-600">✏️</button>
                      <button onClick={() => handleDelete(q.id)} className="text-red-400 hover:text-red-600">🗑️</button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-gray-400">Q{visibleQuestions.length - index}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>{q.difficulty}</span>
                  </div>
                  
                  <h2 className="text-lg font-medium text-gray-800 mb-6 leading-relaxed">{q.question_text}</h2>
                  
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const optionText = q[`option_${key.toLowerCase()}`];
                      const isCorrect = q.correct_option === key;
                      const isSelected = userAnswer === key;
                      let btnStyle = "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100";
                      
                      if (isAnswered) {
                        if (isCorrect) btnStyle = "bg-green-100 text-green-800 border-green-300 font-bold";
                        else if (isSelected) btnStyle = "bg-red-100 text-red-800 border-red-300";
                        else btnStyle = "opacity-50 grayscale";
                      }

                      return (
                        <button key={key} onClick={() => handleOptionClick(q.id, key)} disabled={isAnswered}
                          className={`w-full text-left p-3.5 rounded-lg border transition-all text-sm flex gap-3 items-center ${btnStyle}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${isAnswered && isCorrect ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-300'}`}>
                            {key}
                          </span>
                          {optionText}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}