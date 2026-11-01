"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../src/lib/supabase'

const CATEGORIES = [
  "1. Anugerah Persembahan Paling Gempak",
  "2. Anugerah Pakaian Sedondon",
  "3. Anugerah Keluarga Paling Sporting",
  "4. Anugerah Keluarga Paling Havoc",
  "5. Anugerah Keluarga Paling Sempoi",
  "6. Anugerah Teamwork Paling Mantap",
  "7. Anugerah Persiapan Paling Lengkap"
]

const FAMILY_DATA: Record<number, { name: string, image: string }> = {
  1: { name: "Keluarga Ayahlong", image: "/keluarga-1.jpg" },
  2: { name: "Keluarga Ayah Ngah", image: "/keluarga-2.jpg" },
  3: { name: "Keluarga Mak Belakang", image: "/keluarga-3.jpg" },
  4: { name: "Keluarga Mak Lang", image: "/keluarga-4.jpg" },
  5: { name: "Keluarga Mak Dak", image: "/keluarga-5.jpg" },
  6: { name: "Keluarga Makteh", image: "/keluarga-6.jpg" },
  7: { name: "Keluarga Acu", image: "/keluarga-7.jpg" }
}

export default function VoterScreen() {
  const [viewState, setViewState] = useState<'idle' | 'reveal' | 'voting' | 'submitted'>('idle')
  const [showNameModal, setShowNameModal] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)

  const [activeFamily, setActiveFamily] = useState<number | null>(null)
  const [voterName, setVoterName] = useState('')
  const [comment, setComment] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasVotedThisFamily, setHasVotedThisFamily] = useState(false)

  useEffect(() => {
    const fetchState = async () => {
      const { data } = await supabase.from('live_control').select('*').single()
      if (data) {
        setActiveFamily(data.active_family_id)
        if (data.active_family_id) {
          fetchVoteCount(data.active_family_id)
          checkDeviceVote(data.active_family_id)
        }
      }
      setLoading(false)
    }
    fetchState()

    const channel = supabase
      .channel('admin_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_control' }, (payload) => {
        const newData = payload.new
        setActiveFamily(newData.active_family_id)
        
        if (newData.active_family_id) {
           setViewState('reveal')
           setShowNameModal(false)
           setShowCommentModal(false)
           setSelectedCategories([])
           setComment('')
           setVoterName('')
           fetchVoteCount(newData.active_family_id)
           checkDeviceVote(newData.active_family_id)
        } else {
           setViewState('idle')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const checkDeviceVote = (familyId: number) => {
    const hasVoted = localStorage.getItem(`voted_family_${familyId}`)
    if (hasVoted === 'true') {
      setHasVotedThisFamily(true)
      setViewState('submitted')
    } else {
      setHasVotedThisFamily(false)
      setViewState('reveal')
    }
  }

  const fetchVoteCount = async (familyId: number) => {
    const { count } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('family_id', familyId)
    setVoteCount(count || 0)
  }

  const toggleCategory = (index: number) => {
    if (selectedCategories.includes(index)) {
      setSelectedCategories(selectedCategories.filter(i => i !== index))
    } else if (selectedCategories.length < 2) {
      setSelectedCategories([...selectedCategories, index])
    }
  }

  const submitFinalVote = async () => {
    if (selectedCategories.length !== 2 || !voterName || !comment || hasVotedThisFamily) return
    
    const { error } = await supabase.from('votes').insert({
      voter_name: voterName,
      family_id: activeFamily,
      category_1: selectedCategories[0] + 1,
      category_2: selectedCategories[1] + 1,
      comment: comment
    })

    if (!error) {
      localStorage.setItem(`voted_family_${activeFamily}`, 'true')
      setHasVotedThisFamily(true)
      setShowCommentModal(false)
      setViewState('submitted')
    }
  }

  const voteAgainAsRepresentative = () => {
    if (!activeFamily) return
    localStorage.removeItem(`voted_family_${activeFamily}`)
    setHasVotedThisFamily(false)
    setVoterName('')
    setComment('')
    setSelectedCategories([])
    setViewState('reveal')
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>

  if (viewState === 'idle' || !activeFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-24 h-24 border-4 border-t-blue-500 border-gray-700 rounded-full animate-spin mx-auto mb-8"></div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse tracking-wide">
            Menunggu Persembahan Seterusnya...
          </h1>
        </div>
      </div>
    )
  }

  if (viewState === 'submitted' || hasVotedThisFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-900 flex flex-col items-center justify-center text-white p-6 text-center shadow-inner">
        <div className="bg-white/20 p-8 rounded-full mb-8 backdrop-blur-sm animate-bounce">
          <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h1 className="text-5xl font-black mb-4 drop-shadow-lg">Undian Direkodkan!</h1>
        <p className="text-xl text-green-100 font-medium max-w-md mx-auto mb-10">
          Peranti ini telah membuat undian untuk {FAMILY_DATA[activeFamily].name}. Sila tunggu keluarga seterusnya.
        </p>

        {voteCount < 58 && (
          <button 
            onClick={voteAgainAsRepresentative}
            className="px-8 py-4 bg-white/20 hover:bg-white text-white hover:text-green-800 border-2 border-white rounded-full font-bold text-lg transition-all duration-300 shadow-xl"
          >
            Undi Lagi (Wakil Orang Tua/Kanak-Kanak)
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans relative overflow-hidden">
      
      {/* Tampilan Visual (Grand Reveal) dengan Foto Keluarga */}
      {viewState === 'reveal' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-900 to-black z-10 animate-[fadeIn_0.5s_ease-out]">
          <h2 className="text-3xl text-indigo-200 font-bold mb-6 tracking-widest uppercase">Persembahan Sekarang</h2>
          
          <div className="relative w-full max-w-md md:max-w-lg aspect-[4/5] md:aspect-video bg-gray-900 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.5)] flex items-center justify-center mb-12 transform hover:scale-105 transition-transform duration-500 border-4 border-white/10 overflow-hidden">
             
             {/* Latar Belakang Blur (Glassmorphism Effect) */}
             <img 
               src={FAMILY_DATA[activeFamily].image} 
               alt="Background" 
               className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110"
               onError={(e) => { e.currentTarget.style.display = 'none'; }}
             />

             {/* Foto Utama - object-contain memastikan seluruh gambar terlihat */}
             <img 
               src={FAMILY_DATA[activeFamily].image} 
               alt={FAMILY_DATA[activeFamily].name} 
               className="absolute inset-0 w-full h-full object-contain z-0"
               onError={(e) => { e.currentTarget.style.display = 'none'; }}
             />
             
             {/* Gradient Overlay untuk membuat teks mudah dibaca */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10"></div>
             
             {/* Teks Nama Keluarga di bagian bawah kotak */}
             <h1 className="absolute bottom-6 left-0 right-0 z-20 text-4xl md:text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-center px-4">
               {FAMILY_DATA[activeFamily].name}
             </h1>
          </div>

          <button 
            onClick={() => setShowNameModal(true)}
            className="group relative px-10 py-5 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full text-white font-black text-2xl shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:shadow-[0_0_50px_rgba(236,72,153,0.8)] hover:scale-110 transition-all duration-300 animate-bounce"
          >
            MULA MENGUNDI
            <div className="absolute inset-0 h-full w-full rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out"></div>
          </button>
        </div>
      )}

      {viewState === 'voting' && (
        <div className="relative z-0 p-4 md:p-8 pt-12 pb-32 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
              {FAMILY_DATA[activeFamily].name}
            </h2>
            <p className="text-gray-400 text-lg">Pilih 2 Kategori Terbaik ({selectedCategories.length}/2)</p>
          </div>

          {voteCount >= 58 && (
             <div className="bg-orange-500/20 border border-orange-500 text-orange-200 p-4 rounded-xl mb-8 font-bold text-center text-xl backdrop-blur-md">
               Had maksimum (58) undian telah dicapai untuk keluarga ini!
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat, index) => {
              const isSelected = selectedCategories.includes(index)
              return (
                <button
                  key={index}
                  onClick={() => toggleCategory(index)}
                  className={`relative overflow-hidden p-6 rounded-2xl text-left transition-all duration-300 min-h-[100px] flex items-center shadow-lg
                    ${isSelected 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-2 border-white scale-[1.02] shadow-[0_0_20px_rgba(79,70,229,0.5)]' 
                      : 'bg-gray-800 border-2 border-gray-700 hover:border-gray-500 text-gray-300'
                    }`}
                >
                  <span className={`text-xl font-bold ${isSelected ? 'text-white' : ''}`}>{cat}</span>
                  {isSelected && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent">
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setShowCommentModal(true)}
                disabled={selectedCategories.length !== 2 || voteCount >= 58}
                className={`w-full py-5 rounded-2xl font-black text-2xl text-white transition-all duration-300 shadow-2xl
                  ${selectedCategories.length !== 2 || voteCount >= 58 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-400 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                  }`}
              >
                {selectedCategories.length < 2 ? 'PILIH 2 KATEGORI' : 'TERUSKAN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-gray-800 border border-gray-600 rounded-3xl p-8 w-full max-w-md shadow-2xl transform scale-100 animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-3xl font-black text-white mb-2">Siapa anda?</h3>
            <p className="text-gray-400 mb-8">Sila masukkan nama untuk rekod undian.</p>
            <input 
              type="text" 
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              className="w-full bg-gray-900 border-2 border-gray-600 rounded-2xl p-5 text-2xl text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none mb-8 transition-all"
              placeholder="Nama anda..."
              autoFocus
            />
            <button
              onClick={() => {
                if(voterName.trim()) {
                  setShowNameModal(false)
                  setViewState('voting')
                }
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xl transition-colors"
            >
              Teruskan Mengundi
            </button>
          </div>
        </div>
      )}

      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-gray-800 border border-gray-600 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-3xl font-black text-white mb-2">Komen Persembahan</h3>
            <p className="text-gray-400 mb-6">Tinggalkan komen padu anda untuk {FAMILY_DATA[activeFamily].name}!</p>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-gray-900 border-2 border-gray-600 rounded-2xl p-5 text-xl text-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none mb-6 min-h-[150px] resize-none transition-all"
              placeholder="Fuh, persembahan paling gempak abad ini..."
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowCommentModal(false)}
                className="w-1/3 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-bold text-lg transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={submitFinalVote}
                disabled={!comment.trim()}
                className={`w-2/3 py-4 rounded-2xl font-black text-xl text-white transition-all shadow-lg
                  ${!comment.trim() ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-500 to-orange-400 hover:scale-105'}`}
              >
                HANTAR UNDIAN
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}