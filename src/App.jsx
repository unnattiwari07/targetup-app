import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // APP STATE
  const [questions, setQuestions] = useState([])
  const [filterSubject, setFilterSubject] = useState('All')
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  
  // ADMIN STATE
  const [isAdmin, setIsAdmin] = useState(false) 
  const [showAddForm, setShowAddForm] = useState(false) 
  const [editingId, setEditingId] = useState(null) // ID of question being edited

  // FORM STATE
  const [newQ, setNewQ] = useState({
    text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', subject: 'GK', difficulty: 'Easy'
  })

  useEffect(() => {
    // 1. Check persistent login
    const storedLogin = localStorage.getItem('targetup_admin_logged_in')
    if (storedLogin === 'true') {
      setIsAdmin(true)
    }
    // 2. Load Data
    getQuestions()
  }, [])

  async function getQuestions() {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false })
    setQuestions(data || [])
  }

  // --- ADMIN: LOGIN/LOGOUT ---
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
    setShowAddForm(false)
    setEditingId(null)
    localStorage.removeItem('targetup_admin_logged_in')
  }

  // --- ADMIN: EDIT PREP ---
  const handleEditClick = (q) => {
    setEditingId(q.id) // Mark which ID we are editing
    setNewQ({
      text: q.question_text,
      opA: q.option_a,
      opB: q.option_b,
      opC: q.option_c,
      opD: q.option_d,
      correct: q.correct_option,
      subject: q.subject,
      difficulty: q.difficulty
    })
    setShowAddForm(true) // Open the form
    window.scrollTo({ top: 0, behavior: 'smooth' }) // Scroll to top
  }

  const resetForm = () => {
    setNewQ({ text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', subject: 'GK', difficulty: 'Easy' })
    setEditingId(null)
    setShowAddForm(false)
  }

  // --- ADMIN: SAVE (INSERT OR UPDATE) ---
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
      // UPDATE EXISTING
      const { error } = await supabase.from('questions').update(questionData).eq('id', editingId)
      if (!error) alert("Question Updated! ✅")
      else alert("Error: " + error.message)
    } else {
      // INSERT NEW
      const { error } = await supabase.from('questions').insert([questionData])
      if (!error) alert("Question Added! 🚀")
      else alert("Error: " + error.message)
    }

    getQuestions()
    resetForm()
  }

  // --- ADMIN: DELETE ---
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question permanently?")) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (!error) {
      setQuestions(questions.filter(q => q.id !== id))
    }
  }

  // --- UI HELPERS ---
  const handleOptionClick = (questionId, selectedOption) => {
    if (selectedAnswers[questionId]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: selectedOption }))
  }

  const displayedQuestions = filterSubject === 'All' 
    ? questions 
    : questions.filter(q => q.subject === filterSubject)

  const subjects = ['All', ...new Set(questions.map(q => q.subject))]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10 pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-yellow-400">TargetUP Pro 🎯</h1>
          <p className="text-gray-400 text-sm">Practice like a Pro.</p>
        </div>
        
        {/* ADMIN CONTROLS */}
        <div className="flex gap-3">
          {isAdmin ? (
            <>
              <button onClick={() => { resetForm(); setShowAddForm(!showAddForm); }} 
                className="bg-yellow-400 text-black px-3 py-1 rounded font-bold hover:bg-yellow-300 shadow-lg transition">
                {showAddForm && !editingId ? 'Close' : '+ Add Question'}
              </button>
              <button onClick={handleLogout} className="text-red-400 font-bold border border-red-400 px-3 py-1 rounded hover:bg-red-900">
                Exit
              </button>
            </>
          ) : (
            <button onClick={handleAdminLogin} className="text-gray-600 hover:text-white text-2xl">🔒</button>
          )}
        </div>
      </div>

      {/* --- ADD/EDIT FORM --- */}
      {isAdmin && showAddForm && (
        <div className="bg-gray-800 p-6 rounded-xl border-2 border-yellow-500 mb-8 animation-fade-in shadow-2xl relative">
          <button onClick={resetForm} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
          <h2 className="text-xl font-bold mb-4 text-yellow-400">
            {editingId ? '✏️ Edit Question' : '✨ Add New Question'}
          </h2>
          
          <div className="grid gap-3">
            <input placeholder="Question Text" className="bg-gray-700 p-3 rounded text-white focus:ring-2 focus:ring-yellow-400 outline-none" 
              value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Option A" className="bg-gray-700 p-2 rounded" value={newQ.opA} onChange={e => setNewQ({...newQ, opA: e.target.value})} />
              <input placeholder="Option B" className="bg-gray-700 p-2 rounded" value={newQ.opB} onChange={e => setNewQ({...newQ, opB: e.target.value})} />
              <input placeholder="Option C" className="bg-gray-700 p-2 rounded" value={newQ.opC} onChange={e => setNewQ({...newQ, opC: e.target.value})} />
              <input placeholder="Option D" className="bg-gray-700 p-2 rounded" value={newQ.opD} onChange={e => setNewQ({...newQ, opD: e.target.value})} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select className="bg-gray-700 p-2 rounded" value={newQ.correct} onChange={e => setNewQ({...newQ, correct: e.target.value})}>
                <option value="A">Correct: A</option>
                <option value="B">Correct: B</option>
                <option value="C">Correct: C</option>
                <option value="D">Correct: D</option>
              </select>
              <select className="bg-gray-700 p-2 rounded" value={newQ.subject} onChange={e => setNewQ({...newQ, subject: e.target.value})}>
                <option value="GK">GK</option>
                <option value="Maths">Maths</option>
                <option value="Reasoning">Reasoning</option>
                <option value="English">English</option>
                <option value="Science">Science</option>
              </select>
              <select className="bg-gray-700 p-2 rounded" value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: e.target.value})}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveQuestion} className="flex-1 bg-yellow-400 text-black font-bold p-3 rounded hover:bg-yellow-300">
                {editingId ? '💾 Update Question' : '🚀 Publish Question'}
              </button>
              {editingId && (
                <button onClick={resetForm} className="px-4 bg-gray-600 text-white rounded hover:bg-gray-500">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- QUESTION LIST --- */}
      
      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {subjects.map(subject => (
          <button key={subject} onClick={() => setFilterSubject(subject)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${filterSubject === subject ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-300'}`}>
            {subject}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayedQuestions.map((q) => {
          const userAnswer = selectedAnswers[q.id];
          const isAnswered = userAnswer != null;
          return (
            <div key={q.id} className="relative bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-md group">
               
               {/* ADMIN BUTTONS (Edit & Delete) */}
               {isAdmin && (
                 <div className="absolute top-4 right-4 flex gap-2 z-10">
                   {/* EDIT BUTTON */}
                   <button 
                     onClick={() => handleEditClick(q)}
                     className="bg-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition"
                     title="Edit"
                   >
                     ✏️
                   </button>
                   {/* DELETE BUTTON */}
                   <button 
                     onClick={() => handleDelete(q.id)}
                     className="bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white p-2 rounded-lg transition"
                     title="Delete"
                   >
                     🗑️
                   </button>
                 </div>
               )}

               <div className="flex justify-between items-start mb-4 pr-20"> {/* Extra padding right for buttons */}
                <span className="text-xs font-bold bg-blue-900 text-blue-200 px-2 py-1 rounded uppercase">{q.subject}</span>
                <span className={`text-xs px-2 py-1 rounded border ${q.difficulty === 'Easy' ? 'border-green-500 text-green-400' : 'border-orange-500 text-orange-400'}`}>{q.difficulty}</span>
              </div>
              <h2 className="text-lg font-medium mb-6 mt-2">{q.question_text}</h2>
              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map((key) => {
                  const optionText = q[`option_${key.toLowerCase()}`];
                  const isCorrect = q.correct_option === key;
                  const isSelected = userAnswer === key;
                  let btnColor = "bg-gray-700/50 hover:bg-gray-700";
                  if (isAnswered) {
                    if (isCorrect) btnColor = "bg-green-600 text-white border-green-400";
                    else if (isSelected) btnColor = "bg-red-600 text-white border-red-400";
                    else btnColor = "bg-gray-700/50 opacity-50";
                  }
                  return (
                    <button key={key} onClick={() => handleOptionClick(q.id, key)} disabled={isAnswered}
                      className={`w-full text-left p-3 rounded-lg transition-all text-sm border border-transparent ${btnColor}`}>
                      <span className="opacity-70 mr-2 font-bold">{key}.</span> {optionText}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}