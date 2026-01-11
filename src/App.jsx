import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // --- STATE MANAGEMENT ---
  const [currentScreen, setCurrentScreen] = useState('HOME') 
  const [exams, setExams] = useState([])
  const [selectedExam, setSelectedExam] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [questions, setQuestions] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  
  // --- ADMIN STATE ---
  const [isAdmin, setIsAdmin] = useState(false) 
  const [showAddQForm, setShowAddQForm] = useState(false) 
  const [showExamManager, setShowExamManager] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const fileInputRef = useRef(null)

  // --- FORMS ---
  const [newQ, setNewQ] = useState({
    text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', exam_id: '', subject: '', difficulty: 'Easy'
  })
  
  const [newExam, setNewExam] = useState({ name: '', subjects: '', iconFile: null })

  useEffect(() => {
    const storedLogin = localStorage.getItem('targetup_admin_logged_in')
    if (storedLogin === 'true') setIsAdmin(true)
    fetchExams()
    fetchQuestions()
  }, [])

  // --- DATA FETCHING ---
  async function fetchExams() {
    const { data } = await supabase.from('exams').select('*').order('id', { ascending: true })
    setExams(data || [])
  }

  async function fetchQuestions() {
    const { data } = await supabase.from('questions').select('*').order('id', { ascending: false })
    setQuestions(data || [])
  }

  // --- ADMIN: ADD/EDIT EXAM ---
  const handleSaveExam = async () => {
    if (!newExam.name || !newExam.subjects) return alert("Enter Name and Subjects!")
    
    let iconUrl = 'https://placehold.co/100?text=Ex' // Default
    
    // Upload Image if selected
    if (newExam.iconFile) {
      const fileName = `${Date.now()}-${newExam.iconFile.name}`
      const { data, error } = await supabase.storage.from('exam-icons').upload(fileName, newExam.iconFile)
      if (error) return alert("Image upload failed: " + error.message)
      
      // Get Public URL
      const { data: publicUrl } = supabase.storage.from('exam-icons').getPublicUrl(fileName)
      iconUrl = publicUrl.publicUrl
    }

    // Save to DB (Subjects are comma separated string -> convert to array)
    const subjectArray = newExam.subjects.split(',').map(s => s.trim())
    
    const { error } = await supabase.from('exams').insert([{
      name: newExam.name,
      subjects: subjectArray,
      icon_url: iconUrl
    }])

    if (error) alert("Error: " + error.message)
    else {
      alert("Exam Created! 🎉")
      setNewExam({ name: '', subjects: '', iconFile: null })
      fetchExams()
      setShowExamManager(false)
    }
  }

  // --- ADMIN: ADD/EDIT QUESTION ---
  const handleSaveQuestion = async () => {
    if (!newQ.text || !newQ.opA || !newQ.exam_id) return alert("Fill all fields & Select Exam!")

    const questionData = {
      question_text: newQ.text,
      option_a: newQ.opA, option_b: newQ.opB, option_c: newQ.opC, option_d: newQ.opD,
      correct_option: newQ.correct,
      exam_id: newQ.exam_id,
      subject: newQ.subject,
      difficulty: newQ.difficulty
    }

    if (editingId) {
      await supabase.from('questions').update(questionData).eq('id', editingId)
      alert("Updated! ✅")
    } else {
      await supabase.from('questions').insert([questionData])
      alert("Added! 🚀")
    }
    fetchQuestions(); resetQForm()
  }

  const handleDeleteQ = async (id) => {
    if (!window.confirm("Delete this?")) return
    await supabase.from('questions').delete().eq('id', id)
    fetchQuestions()
  }

  // --- HELPERS ---
  const handleExamSelect = (exam) => { setSelectedExam(exam); setCurrentScreen('SUBJECT_SELECT') }
  const handleSubjectSelect = (subj) => { setSelectedSubject(subj); setCurrentScreen('QUESTIONS') }
  const goBack = () => {
    if (currentScreen === 'QUESTIONS') setCurrentScreen('SUBJECT_SELECT')
    else if (currentScreen === 'SUBJECT_SELECT') setCurrentScreen('HOME')
  }
  const resetQForm = () => {
    setNewQ({ text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', exam_id: '', subject: '', difficulty: 'Easy' })
    setEditingId(null); setShowAddQForm(false)
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {currentScreen !== 'HOME' && <button onClick={goBack} className="text-xl p-1">⬅️</button>}
           <h1 className="text-xl font-bold text-blue-900">
             {currentScreen === 'HOME' ? 'TargetUP 🎯' : currentScreen === 'SUBJECT_SELECT' ? selectedExam?.name : selectedSubject}
           </h1>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <button onClick={() => setShowExamManager(true)} className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold border border-purple-200">Manage Exams</button>
            <button onClick={() => setShowAddQForm(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold shadow">+ Q</button>
            <button onClick={() => {setIsAdmin(false); localStorage.removeItem('targetup_admin_logged_in')}} className="text-red-500 text-xs border border-red-200 px-2 py-1 rounded">Exit</button>
          </div>
        ) : (
          <button onClick={() => { if(prompt("Password:") === "@Nextmove7388##===") { setIsAdmin(true); localStorage.setItem('targetup_admin_logged_in','true') }}} className="text-gray-400 text-xl">🔒</button>
        )}
      </div>

      {/* --- POPUP 1: EXAM MANAGER (ADD NEW EXAM) --- */}
      {isAdmin && showExamManager && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 relative">
            <button onClick={() => setShowExamManager(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h2 className="text-lg font-bold mb-4 text-purple-700">Add New Exam Category</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-bold">Exam Name</label>
                <input className="w-full bg-gray-100 p-2 rounded border" placeholder="e.g. JEE Main 2026" 
                  value={newExam.name} onChange={e => setNewExam({...newExam, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold">Subjects (comma separated)</label>
                <input className="w-full bg-gray-100 p-2 rounded border" placeholder="e.g. Maths, Physics, Chemistry" 
                  value={newExam.subjects} onChange={e => setNewExam({...newExam, subjects: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-bold">Upload Icon</label>
                <input type="file" ref={fileInputRef} className="w-full text-sm" 
                  onChange={e => setNewExam({...newExam, iconFile: e.target.files[0]})} />
              </div>
              <button onClick={handleSaveExam} className="w-full bg-purple-600 text-white py-3 rounded font-bold hover:bg-purple-700">
                Create Exam 🏛️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP 2: ADD QUESTION (SMART FORM) --- */}
      {isAdmin && showAddQForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={resetQForm} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h2 className="text-lg font-bold mb-4 text-blue-700">{editingId ? 'Edit' : 'Add'} Question</h2>
            
            <div className="space-y-3">
              {/* 1. SELECT EXAM FIRST */}
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <label className="block text-xs font-bold text-blue-600 mb-1">Step 1: Select Exam</label>
                <select className="w-full p-2 rounded bg-white border" 
                  value={newQ.exam_id} onChange={e => {
                    const exam = exams.find(ex => ex.id == e.target.value)
                    setNewQ({...newQ, exam_id: e.target.value, subject: exam?.subjects[0] || ''})
                  }}>
                  <option value="">-- Choose Exam --</option>
                  {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
              </div>

              {/* 2. SELECT SUBJECT (Based on Exam) */}
              {newQ.exam_id && (
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                  <label className="block text-xs font-bold text-blue-600 mb-1">Step 2: Select Subject</label>
                  <select className="w-full p-2 rounded bg-white border" 
                    value={newQ.subject} onChange={e => setNewQ({...newQ, subject: e.target.value})}>
                    {exams.find(ex => ex.id == newQ.exam_id)?.subjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              <textarea className="w-full bg-gray-100 p-3 rounded border" rows="3" placeholder="Question Text..." value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input className="bg-gray-100 p-2 rounded" placeholder="Op A" value={newQ.opA} onChange={e => setNewQ({...newQ, opA: e.target.value})} />
                <input className="bg-gray-100 p-2 rounded" placeholder="Op B" value={newQ.opB} onChange={e => setNewQ({...newQ, opB: e.target.value})} />
                <input className="bg-gray-100 p-2 rounded" placeholder="Op C" value={newQ.opC} onChange={e => setNewQ({...newQ, opC: e.target.value})} />
                <input className="bg-gray-100 p-2 rounded" placeholder="Op D" value={newQ.opD} onChange={e => setNewQ({...newQ, opD: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <select className="bg-gray-100 p-2 rounded" value={newQ.correct} onChange={e => setNewQ({...newQ, correct: e.target.value})}>
                   <option value="A">Ans: A</option><option value="B">Ans: B</option><option value="C">Ans: C</option><option value="D">Ans: D</option>
                 </select>
                 <select className="bg-gray-100 p-2 rounded" value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: e.target.value})}>
                   <option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                 </select>
              </div>
              <button onClick={handleSaveQuestion} className="w-full bg-blue-600 text-white py-3 rounded font-bold mt-2 shadow-lg">Save & Publish</button>
            </div>
          </div>
        </div>
      )}

      {/* --- UI SCREENS --- */}
      
      {/* HOME */}
      {currentScreen === 'HOME' && (
        <div className="p-4 grid grid-cols-2 gap-4">
          {exams.length === 0 ? <p className="col-span-2 text-center text-gray-400 mt-10">No Exams Added Yet.<br/>Use Admin Panel to add one!</p> :
            exams.map(exam => (
              <div key={exam.id} onClick={() => handleExamSelect(exam)}
                className="bg-white p-6 rounded-xl shadow border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition cursor-pointer">
                <img src={exam.icon_url} className="w-12 h-12 object-contain" alt="icon" />
                <span className="font-bold text-gray-800 text-center">{exam.name}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* SUBJECTS */}
      {currentScreen === 'SUBJECT_SELECT' && (
        <div className="p-4 space-y-3">
          <div className="mb-4"><h1 className="text-2xl font-bold text-gray-800">{selectedExam.name}</h1></div>
          {selectedExam.subjects.map(subject => (
            <div key={subject} onClick={() => handleSubjectSelect(subject)}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-blue-50 cursor-pointer">
              <span className="font-bold text-gray-800">{subject}</span>
              <span className="text-gray-300">➔</span>
            </div>
          ))}
        </div>
      )}

      {/* QUESTIONS */}
      {currentScreen === 'QUESTIONS' && (
        <div className="p-4 grid gap-4 md:grid-cols-2">
          {questions.filter(q => q.exam_id == selectedExam.id && q.subject === selectedSubject).map((q, i) => (
            <div key={q.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative">
               {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => { setEditingId(q.id); setNewQ({ ...q, exam_id: q.exam_id, text: q.question_text, opA: q.option_a, opB: q.option_b, opC: q.option_c, opD: q.option_d, correct: q.correct_option }); setShowAddQForm(true) }} className="text-blue-400">✏️</button>
                    <button onClick={() => handleDeleteQ(q.id)} className="text-red-400">🗑️</button>
                  </div>
                )}
               <h2 className="text-lg font-medium text-gray-800 mb-4">{q.question_text}</h2>
               {['A','B','C','D'].map(key => (
                 <button key={key} onClick={() => { if(!selectedAnswers[q.id]) setSelectedAnswers({...selectedAnswers, [q.id]: key}) }} 
                   className={`w-full text-left p-3 rounded-lg border mb-2 text-sm ${selectedAnswers[q.id] ? (q.correct_option===key ? 'bg-green-100 border-green-400' : selectedAnswers[q.id]===key ? 'bg-red-100 border-red-400' : 'opacity-50') : 'hover:bg-gray-50'}`}>
                   <span className="font-bold mr-2">{key}.</span> {q[`option_${key.toLowerCase()}`]}
                 </button>
               ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}