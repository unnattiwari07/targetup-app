import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // APP STATE
  const [questions, setQuestions] = useState([])
  const [filterSubject, setFilterSubject] = useState('All')
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  const [isAdmin, setIsAdmin] = useState(false) // Is Admin Mode ON?

  // NEW QUESTION STATE
  const [newQ, setNewQ] = useState({
    text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', subject: 'GK', difficulty: 'Easy'
  })

  useEffect(() => {
    getQuestions()
  }, [])

  async function getQuestions() {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false })
    setQuestions(data || [])
  }

  // --- ADMIN: LOGIN ---
  const handleAdminLogin = () => {
    // CHANGE THIS PASSWORD IF YOU WANT
    const password = prompt("Enter Admin Password:")
    if (password === "TargetUP2026") { 
      setIsAdmin(true)
    } else {
      alert("Wrong password!")
    }
  }

  // --- ADMIN: ADD QUESTION ---
  const handleAddQuestion = async () => {
    if (!newQ.text || !newQ.opA) return alert("Please fill all fields")

    const { error } = await supabase.from('questions').insert([{
      question_text: newQ.text,
      option_a: newQ.opA, option_b: newQ.opB, option_c: newQ.opC, option_d: newQ.opD,
      correct_option: newQ.correct,
      subject: newQ.subject,
      difficulty: newQ.difficulty,
      chapter: 'General'
    }])

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert("Question Added! 🚀")
      setNewQ({ text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', subject: 'GK', difficulty: 'Easy' }) 
      getQuestions() 
      setIsAdmin(false) 
    }
  }

  // --- ADMIN: DELETE QUESTION (NEW!) ---
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this question?")
    if (!confirmDelete) return

    const { error } = await supabase.from('questions').delete().eq('id', id)
    
    if (error) {
      alert("Error deleting: " + error.message)
    } else {
      // Remove it from the screen immediately
      setQuestions(questions.filter(q => q.id !== id))
    }
  }

  // --- QUIZ LOGIC ---
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
        
        {/* LOCK ICON */}
        <button onClick={handleAdminLogin} className="text-gray-600 hover:text-white transition text-2xl">
          {isAdmin ? '🔓' : '🔒'}
        </button>
      </div>

      {/* --- ADMIN PANEL --- */}
      {isAdmin ? (
        <div className="bg-gray-800 p-6 rounded-xl border border-yellow-500 mb-8 animation-fade-in">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">Add New Question</h2>
          
          <div className="grid gap-3">
            <input placeholder="Question Text" className="bg-gray-700 p-3 rounded text-white" 
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

            <button onClick={handleAddQuestion} className="bg-yellow-400 text-black font-bold p-3 rounded mt-2 hover:bg-yellow-300">
              🚀 Publish Question
            </button>
            <button onClick={() => setIsAdmin(false)} className="text-gray-400 text-sm mt-2 text-center">
              Exit Admin Mode
            </button>
          </div>
        </div>
      ) : (
        /* --- NORMAL QUIZ MODE --- */
        <>
          {/* Filter Bar */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            {subjects.map(subject => (
              <button key={subject} onClick={() => setFilterSubject(subject)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${filterSubject === subject ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-300'}`}>
                {subject}
              </button>
            ))}
          </div>

          {/* Question Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedQuestions.map((q) => {
              const userAnswer = selectedAnswers[q.id];
              const isAnswered = userAnswer != null;
              return (
                <div key={q.id} className="relative bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-md group">
                   
                   {/* DELETE BUTTON (Only visible if Admin) */}
                   {isAdmin && (
                     <button 
                       onClick={() => handleDelete(q.id)}
                       className="absolute top-4 right-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white p-2 rounded transition"
                       title="Delete Question"
                     >
                       🗑️
                     </button>
                   )}

                   <div className="flex justify-between items-start mb-4 pr-10">
                    <span className="text-xs font-bold bg-blue-900 text-blue-200 px-2 py-1 rounded uppercase">{q.subject}</span>
                    <span className={`text-xs px-2 py-1 rounded border ${q.difficulty === 'Easy' ? 'border-green-500 text-green-400' : 'border-orange-500 text-orange-400'}`}>{q.difficulty}</span>
                  </div>
                  <h2 className="text-lg font-medium mb-6">{q.question_text}</h2>
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
        </>
      )}
    </div>
  )
}