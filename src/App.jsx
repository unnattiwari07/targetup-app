import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [questions, setQuestions] = useState([])
  const [filterSubject, setFilterSubject] = useState('All')
  const [selectedAnswers, setSelectedAnswers] = useState({}) // Stores user clicks: { questionId: 'A' }
  const [error, setError] = useState(null)

  useEffect(() => {
    getQuestions()
  }, [])

  async function getQuestions() {
    const { data, error } = await supabase.from('questions').select('*')
    if (error) setError(error.message)
    else setQuestions(data)
  }

  // Handle when a user clicks an option
  const handleOptionClick = (questionId, selectedOption) => {
    // If already answered, do nothing (prevent changing answer)
    if (selectedAnswers[questionId]) return;

    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: selectedOption // Save: Question 5 -> User chose 'B'
    }))
  }

  const displayedQuestions = filterSubject === 'All' 
    ? questions 
    : questions.filter(q => q.subject === filterSubject)

  const subjects = ['All', ...new Set(questions.map(q => q.subject))]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">TargetUP 🎯</h1>
        <p className="text-gray-400">Tap an option to see if you are right.</p>
      </div>

      {/* FILTER BAR */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {subjects.map(subject => (
          <button
            key={subject}
            onClick={() => setFilterSubject(subject)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap
              ${filterSubject === subject 
                ? 'bg-yellow-400 text-black shadow-lg scale-105' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {subject}
          </button>
        ))}
      </div>

      {/* QUESTION GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayedQuestions.map((q) => {
          const userAnswer = selectedAnswers[q.id]; // What did user pick?
          const isAnswered = userAnswer != null;    // Did they answer yet?
          
          return (
            <div key={q.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-md">
              
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold bg-blue-900 text-blue-200 px-2 py-1 rounded uppercase tracking-wider">
                  {q.subject}
                </span>
                <span className={`text-xs px-2 py-1 rounded border ${q.difficulty === 'Easy' ? 'border-green-500 text-green-400' : 'border-orange-500 text-orange-400'}`}>
                  {q.difficulty}
                </span>
              </div>

              <h2 className="text-lg font-medium mb-6 leading-relaxed">{q.question_text}</h2>

              <div className="space-y-2">
                {['A', 'B', 'C', 'D'].map((optionKey) => {
                  // Logic to determine Button Color
                  const optionText = q[`option_${optionKey.toLowerCase()}`]; // "Lucknow"
                  const isCorrect = q.correct_option === optionKey;          // Is this the right answer?
                  const isSelected = userAnswer === optionKey;               // Did user click this?

                  let btnColor = "bg-gray-700/50 hover:bg-gray-700"; // Default
                  
                  if (isAnswered) {
                    if (isCorrect) btnColor = "bg-green-600 text-white border-green-400"; // Correct Answer -> Always Green
                    else if (isSelected) btnColor = "bg-red-600 text-white border-red-400"; // Wrong Click -> Red
                    else btnColor = "bg-gray-700/50 opacity-50"; // Other options -> Fade out
                  }

                  return (
                    <button 
                      key={optionKey} 
                      onClick={() => handleOptionClick(q.id, optionKey)}
                      disabled={isAnswered} // Disable clicks after answering
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 text-sm border border-transparent ${btnColor}`}
                    >
                      <span className="opacity-70 mr-2 font-bold">{optionKey}.</span> {optionText}
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