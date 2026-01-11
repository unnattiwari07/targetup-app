import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // --- STATE MANAGEMENT ---
  const [currentScreen, setCurrentScreen] = useState('HOME') 
  
  // Data State
  const [exams, setExams] = useState([])
  const [questions, setQuestions] = useState([])
  
  // Selection State
  const [selectedExam, setSelectedExam] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [selectedAnswers, setSelectedAnswers] = useState({}) 
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false) 
  const [showAddQForm, setShowAddQForm] = useState(false) 
  const [showExamManager, setShowExamManager] = useState(false)
  
  // Edit State
  const [editingQId, setEditingQId] = useState(null)
  const [editingExamId, setEditingExamId] = useState(null)
  const fileInputRef = useRef(null)

  // Forms
  const [newQ, setNewQ] = useState({
    text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', 
    exam_id: '', subject: '', chapter: '', difficulty: 'Easy',
    yearTag: '', solution: '' // <--- NEW FIELD
  })
  
  const [newExam, setNewExam] = useState({ name: '', subjects: '', iconFile: null, existingIcon: '' })

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

  // --- NAVIGATION FLOW ---
  const handleExamSelect = (exam) => { setSelectedExam(exam); setCurrentScreen('SUBJECT_SELECT') }
  const handleSubjectSelect = (subj) => { setSelectedSubject(subj); setCurrentScreen('CHAPTER_SELECT') }
  const handleChapterSelect = (chap) => { setSelectedChapter(chap); setCurrentScreen('QUESTIONS') }

  const goBack = () => {
    if (currentScreen === 'QUESTIONS') setCurrentScreen('CHAPTER_SELECT')
    else if (currentScreen === 'CHAPTER_SELECT') setCurrentScreen('SUBJECT_SELECT')
    else if (currentScreen === 'SUBJECT_SELECT') setCurrentScreen('HOME')
  }

  // --- ADMIN: EXAM MANAGEMENT ---
  const handleSaveExam = async () => {
    if (!newExam.name || !newExam.subjects) return alert("Enter details!")
    let iconUrl = newExam.existingIcon || 'https://placehold.co/100?text=Ex' 
    if (newExam.iconFile) {
      const fileName = `${Date.now()}-${newExam.iconFile.name}`
      const { error } = await supabase.storage.from('exam-icons').upload(fileName, newExam.iconFile)
      if (!error) {
        const { data } = supabase.storage.from('exam-icons').getPublicUrl(fileName)
        iconUrl = data.publicUrl
      }
    }
    const subjects = newExam.subjects.split(',').map(s => s.trim())
    const payload = { name: newExam.name, subjects, icon_url: iconUrl }

    if (editingExamId) await supabase.from('exams').update(payload).eq('id', editingExamId)
    else await supabase.from('exams').insert([payload])
    
    setNewExam({ name: '', subjects: '', iconFile: null, existingIcon: '' }); setEditingExamId(null); setShowExamManager(false); fetchExams()
  }

  const handleDeleteExam = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm("Delete Exam? Questions will be lost.")) return
    await supabase.from('questions').delete().eq('exam_id', id)
    await supabase.from('exams').delete().eq('id', id)
    fetchExams()
  }

  // --- ADMIN: QUESTION MANAGEMENT ---
  const handleSaveQuestion = async () => {
    if (!newQ.text || !newQ.exam_id || !newQ.chapter) return alert("Fill all fields!")

    const payload = {
      question_text: newQ.text,
      option_a: newQ.opA, option_b: newQ.opB, option_c: newQ.opC, option_d: newQ.opD,
      correct_option: newQ.correct,
      exam_id: newQ.exam_id,
      subject: newQ.subject,
      chapter: newQ.chapter, 
      difficulty: newQ.difficulty,
      exam_year: newQ.yearTag,
      solution_text: newQ.solution // <--- SAVING SOLUTION
    }

    if (editingQId) {
      await supabase.from('questions').update(payload).eq('id', editingQId)
      alert("Updated! ✅")
    } else {
      await supabase.from('questions').insert([payload])
      alert("Added! 🚀")
    }
    fetchQuestions(); resetQForm()
  }

  const handleDeleteQ = async (id) => {
    if (!window.confirm("Delete?")) return
    await supabase.from('questions').delete().eq('id', id)
    fetchQuestions()
  }

  const handleResetQuestion = (id) => {
    const newAnswers = { ...selectedAnswers }
    delete newAnswers[id] 
    setSelectedAnswers(newAnswers)
  }

  // --- HELPERS ---
  const resetQForm = () => {
    setNewQ({ text: '', opA: '', opB: '', opC: '', opD: '', correct: 'A', exam_id: '', subject: '', chapter: '', difficulty: 'Easy', yearTag: '', solution: '' })
    setEditingQId(null); setShowAddQForm(false)
  }

  const getChapters = () => {
    const relevantQs = questions.filter(q => q.exam_id === selectedExam?.id && q.subject === selectedSubject)
    const chapters = [...new Set(relevantQs.map(q => q.chapter))]
    return chapters.map(chap => ({
      name: chap,
      count: relevantQs.filter(q => q.chapter === chap).length
    }))
  }

  const getAllChapters = () => [...new Set(questions.map(q => q.chapter))]

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {currentScreen !== 'HOME' && <button onClick={goBack} className="text-xl p-1">⬅️</button>}
           <h1 className="text-xl font-bold text-blue-900 truncate max-w-[200px]">
             {currentScreen === 'HOME' ? 'TargetUP 🎯' : 
              currentScreen === 'SUBJECT_SELECT' ? selectedExam?.name : 
              currentScreen === 'CHAPTER_SELECT' ? selectedSubject : 
              selectedChapter}
           </h1>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <button onClick={() => { setNewExam({ name: '', subjects: '', iconFile: null, existingIcon: '' }); setShowExamManager(true) }} className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold border border-purple-200">Exams</button>
            <button onClick={() => setShowAddQForm(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold shadow">+ Q</button>
            <button onClick={() => {setIsAdmin(false); localStorage.removeItem('targetup_admin_logged_in')}} className="text-red-500 text-xs border border-red-200 px-2 py-1 rounded">Exit</button>
          </div>
        ) : (
          <button onClick={() => { 
            if(prompt("Password:") === "@Nextmove7388##===") { 
              setIsAdmin(true); localStorage.setItem('targetup_admin_logged_in','true') 
            } else { alert("Wrong Password!") }
          }} className="text-gray-400 text-xl">🔒</button>
        )}
      </div>

      {/* --- SCREENS --- */}

      {/* 1. HOME */}
      {currentScreen === 'HOME' && (
        <div className="p-4 grid grid-cols-2 gap-4">
          {exams.map(exam => (
            <div key={exam.id} onClick={() => handleExamSelect(exam)}
              className="relative bg-white p-6 rounded-xl shadow border border-gray-100 flex flex-col items-center gap-3 active:scale-95 transition cursor-pointer">
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                   <button onClick={(e) => { e.stopPropagation(); setEditingExamId(exam.id); setNewExam({ name: exam.name, subjects: exam.subjects.join(','), existingIcon: exam.icon_url }); setShowExamManager(true) }} className="bg-gray-100 p-1 rounded-full text-xs">✏️</button>
                   <button onClick={(e) => handleDeleteExam(e, exam.id)} className="bg-gray-100 p-1 rounded-full text-xs text-red-500">🗑️</button>
                </div>
              )}
              <img src={exam.icon_url} className="w-12 h-12 object-contain" alt="icon" />
              <span className="font-bold text-gray-800 text-center">{exam.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* 2. SUBJECT SELECT */}
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

      {/* 3. CHAPTER SELECT */}
      {currentScreen === 'CHAPTER_SELECT' && (
        <div className="p-4 space-y-3">
          <div className="mb-4">
            <h2 className="text-sm text-gray-500">{selectedExam.name} &gt; {selectedSubject}</h2>
            <h1 className="text-2xl font-bold text-gray-800">Select Chapter</h1>
          </div>
          
          {getChapters().length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>No chapters yet.</p>
              {isAdmin && <p className="text-sm text-blue-500">Add a question to create a chapter!</p>}
            </div>
          ) : (
            getChapters().map(chap => (
              <div key={chap.name} onClick={() => handleChapterSelect(chap.name)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-blue-50 cursor-pointer">
                <div>
                  <h3 className="font-bold text-gray-800">{chap.name}</h3>
                  <p className="text-xs text-gray-500">{chap.count} Questions</p>
                </div>
                <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded text-xs font-bold">Start</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. QUESTIONS */}
      {currentScreen === 'QUESTIONS' && (
        <div className="p-4 grid gap-4 md:grid-cols-2">
          {questions
            .filter(q => q.exam_id == selectedExam.id && q.subject === selectedSubject && q.chapter === selectedChapter)
            .map((q, i) => (
            <div key={q.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative">
               
               {/* ADMIN EDIT */}
               {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => { setEditingQId(q.id); setNewQ({ ...q, exam_id: q.exam_id, text: q.question_text, opA: q.option_a, opB: q.option_b, opC: q.option_c, opD: q.option_d, correct: q.correct_option, chapter: q.chapter, yearTag: q.exam_year || '', solution: q.solution_text || '' }); setShowAddQForm(true) }} className="text-blue-400">✏️</button>
                    <button onClick={() => handleDeleteQ(q.id)} className="text-red-400">🗑️</button>
                  </div>
                )}
               
               {/* HEADER */}
               <div className="mb-3 flex justify-between items-start pr-16">
                 <div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">{q.chapter}</div>
                    <span className={`text-xs px-2 py-0.5 rounded border ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>{q.difficulty}</span>
                 </div>
                 {/* REFRESH */}
                 {selectedAnswers[q.id] && (
                   <button onClick={() => handleResetQuestion(q.id)} className="text-gray-400 hover:text-blue-600 transition" title="Re-attempt">🔄</button>
                 )}
               </div>

               <h2 className="text-lg font-medium text-gray-800 mb-4">{q.question_text}</h2>
               
               {['A','B','C','D'].map(key => (
                 <button key={key} onClick={() => { if(!selectedAnswers[q.id]) setSelectedAnswers({...selectedAnswers, [q.id]: key}) }} 
                   className={`w-full text-left p-3 rounded-lg border mb-2 text-sm ${selectedAnswers[q.id] ? (q.correct_option===key ? 'bg-green-100 border-green-400' : selectedAnswers[q.id]===key ? 'bg-red-100 border-red-400' : 'opacity-50') : 'hover:bg-gray-50'}`}>
                   <span className="font-bold mr-2">{key}.</span> {q[`option_${key.toLowerCase()}`]}
                 </button>
               ))}
               
               {/* --- YEAR TAG --- */}
               {q.exam_year && <div className="mt-2 text-xs text-gray-400 font-medium flex items-center gap-1">📅 {q.exam_year}</div>}

               {/* --- SOLUTION (Shows ONLY after answering) --- */}
               {selectedAnswers[q.id] && q.solution_text && (
                 <details className="mt-3 group">
                   <summary className="cursor-pointer text-sm font-bold text-blue-600 bg-blue-50 p-2 rounded hover:bg-blue-100 list-none flex justify-between items-center">
                     <span>💡 View Solution</span>
                     <span className="group-open:rotate-180 transition">▼</span>
                   </summary>
                   <div className="p-3 bg-gray-50 text-gray-700 text-sm border border-gray-200 rounded-b mt-1 whitespace-pre-wrap">
                     {q.solution_text}
                   </div>
                 </details>
               )}
            </div>
          ))}
        </div>
      )}

      {/* --- ADMIN POPUPS --- */}

      {/* EXAM MANAGER */}
      {isAdmin && showExamManager && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-6 relative">
            <button onClick={() => setShowExamManager(false)} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h2 className="text-lg font-bold mb-4 text-purple-700">{editingExamId ? 'Edit Exam' : 'Add Exam'}</h2>
            <div className="space-y-3">
              <input className="w-full bg-gray-100 p-2 rounded border" placeholder="Name (e.g. JEE)" value={newExam.name} onChange={e => setNewExam({...newExam, name: e.target.value})} />
              <input className="w-full bg-gray-100 p-2 rounded border" placeholder="Subjects (e.g. Phy, Chem)" value={newExam.subjects} onChange={e => setNewExam({...newExam, subjects: e.target.value})} />
              <input type="file" onChange={e => setNewExam({...newExam, iconFile: e.target.files[0]})} className="text-sm" />
              <button onClick={handleSaveExam} className="w-full bg-purple-600 text-white py-3 rounded font-bold">Save Exam</button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION MANAGER */}
      {isAdmin && showAddQForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={resetQForm} className="absolute top-4 right-4 text-gray-400">✕</button>
            <h2 className="text-lg font-bold mb-4 text-blue-700">{editingQId ? 'Edit' : 'Add'} Question</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select className="p-2 rounded bg-gray-100 border text-sm" value={newQ.exam_id} onChange={e => {
                    const ex = exams.find(x => x.id == e.target.value); setNewQ({...newQ, exam_id: e.target.value, subject: ex?.subjects[0] || ''})
                  }}>
                  <option value="">Exam</option>
                  {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
                <select className="p-2 rounded bg-gray-100 border text-sm" value={newQ.subject} onChange={e => setNewQ({...newQ, subject: e.target.value})}>
                   {exams.find(ex => ex.id == newQ.exam_id)?.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-bold text-gray-500">Chapter</label>
                    <input list="chapters-list" className="w-full bg-blue-50 p-2 rounded border border-blue-200 font-bold text-sm" 
                    placeholder="e.g. Motion"
                    value={newQ.chapter} onChange={e => setNewQ({...newQ, chapter: e.target.value})} 
                    />
                    <datalist id="chapters-list">
                    {getAllChapters().map(c => <option key={c} value={c} />)}
                    </datalist>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500">Year / Source</label>
                    <input className="w-full bg-gray-100 p-2 rounded border text-sm" 
                    placeholder="e.g. JEE 2024"
                    value={newQ.yearTag} onChange={e => setNewQ({...newQ, yearTag: e.target.value})} 
                    />
                </div>
              </div>

              <textarea className="w-full bg-gray-100 p-3 rounded border" rows="2" placeholder="Question..." value={newQ.text} onChange={e => setNewQ({...newQ, text: e.target.value})} />
              
              {/* SOLUTION BOX */}
              <textarea className="w-full bg-green-50 p-3 rounded border border-green-200 text-sm" rows="3" 
                placeholder="💡 Explanation / Solution (Why is A correct?)..." value={newQ.solution} onChange={e => setNewQ({...newQ, solution: e.target.value})} />

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
              <button onClick={handleSaveQuestion} className="w-full bg-blue-600 text-white py-3 rounded font-bold shadow-lg">Save Question</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}