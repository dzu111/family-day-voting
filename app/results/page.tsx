"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../src/lib/supabase'
import Confetti from 'react-confetti'

const CATEGORIES = [
  "1. Anugerah Persembahan Paling Gempak",
  "2. Anugerah Pakaian Sedondon",
  "3. Anugerah Keluarga Paling Sporting",
  "4. Anugerah Keluarga Paling Havoc",
  "5. Anugerah Keluarga Paling Sempoi",
  "6. Anugerah Teamwork Paling Mantap",
  "7. Anugerah Persiapan Paling Lengkap"
]

// Mapping Nama Keluarga untuk Halaman Hasil
const FAMILY_NAMES: Record<number, string> = {
  1: "Keluarga Ayahlong",
  2: "Keluarga Ayah Ngah",
  3: "Keluarga Mak Belakang",
  4: "Keluarga Mak Lang",
  5: "Keluarga Mak Dak",
  6: "Keluarga Makteh",
  7: "Keluarga Acu"
}

type ViewState = 'grid' | 'countdown' | 'winner' | 'comments'

export default function ResultsPage() {
  const [winners, setWinners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [viewState, setViewState] = useState<ViewState>('grid')
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null)
  
  const [countdown, setCountdown] = useState(5.5) 
  
  const [isScrolling, setIsScrolling] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/audio.m4a')

    const calculateWinners = async () => {
      const { data: votes } = await supabase.from('votes').select('*')
      if (!votes) return

      const scores = Array(7).fill(0).map(() => Array(7).fill(0))
      const commentsMap = Array(7).fill(null).map(() => Array(7).fill(null).map(() => [] as {name: string, text: string}[]))

      votes.forEach(v => {
        const fIdx = v.family_id - 1
        const c1Idx = v.category_1 - 1
        const c2Idx = v.category_2 - 1

        if (fIdx >= 0 && fIdx < 7) {
          if (c1Idx >= 0 && c1Idx < 7) {
            scores[fIdx][c1Idx]++
            if (v.comment) commentsMap[fIdx][c1Idx].push({ name: v.voter_name, text: v.comment })
          }
          if (c2Idx >= 0 && c2Idx < 7) {
            scores[fIdx][c2Idx]++
            if (v.comment) commentsMap[fIdx][c2Idx].push({ name: v.voter_name, text: v.comment })
          }
        }
      })

      let unassignedFamilies = [0, 1, 2, 3, 4, 5, 6]
      let unassignedCategories = [0, 1, 2, 3, 4, 5, 6]
      const categoryWinners = Array(7).fill(null)

      while (unassignedFamilies.length > 0 && unassignedCategories.length > 0) {
        let maxScore = -1
        let bestFam = -1
        let bestCat = -1

        for (let f of unassignedFamilies) {
          for (let c of unassignedCategories) {
            if (scores[f][c] > maxScore) {
              maxScore = scores[f][c]
              bestFam = f
              bestCat = c
            }
          }
        }

        categoryWinners[bestCat] = {
          winningFamily: bestFam + 1,
          maxCount: maxScore,
          allComments: commentsMap[bestFam][bestCat]
        }

        unassignedFamilies = unassignedFamilies.filter(f => f !== bestFam)
        unassignedCategories = unassignedCategories.filter(c => c !== bestCat)
      }

      setWinners(categoryWinners)
      setLoading(false)
    }

    calculateWinners()
  }, [])

  useEffect(() => {
    let animationFrameId: number

    const scrollStep = () => {
      if (isScrolling && scrollRef.current) {
        scrollRef.current.scrollTop += 1.5 
      }
      animationFrameId = requestAnimationFrame(scrollStep)
    }

    if (viewState === 'comments') {
      animationFrameId = requestAnimationFrame(scrollStep)
    }

    return () => cancelAnimationFrame(animationFrameId)
  }, [isScrolling, viewState])

  const triggerEnvelope = (index: number) => {
    setActiveCategoryIndex(index)
    setViewState('countdown')
    setCountdown(5.5) 

    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.log("Audio play blocked:", e))
    }

    let count = 5.5
    const timer = setInterval(() => {
      count = Number((count - 0.1).toFixed(1))
      setCountdown(count)
      
      if (count <= 0) {
        clearInterval(timer)
        setViewState('winner')
      }
    }, 100)
  }

  const goBackToGrid = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    setViewState('grid')
    setActiveCategoryIndex(null)
    setIsScrolling(true)
  }

  if (loading) return <div className="h-screen w-screen bg-black text-white flex items-center justify-center text-5xl font-bold animate-pulse">Memuat turun data pelayan...</div>

  const activeData = activeCategoryIndex !== null ? winners[activeCategoryIndex] : null

  return (
    <div className="h-screen w-screen bg-slate-950 font-sans overflow-hidden text-white">
      
      {viewState === 'grid' && (
        <div className="h-full w-full flex flex-col p-8">
          <h1 className="text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-600 mb-8 drop-shadow-2xl uppercase tracking-widest">
            Malam Keputusan Family Day
          </h1>
          
          <div className="flex-1 grid grid-cols-1 gap-4 max-w-5xl mx-auto w-full pb-8">
            {CATEGORIES.map((cat, index) => (
              <div 
                key={index} 
                onClick={() => triggerEnvelope(index)}
                className="group relative bg-gradient-to-r from-indigo-900 to-blue-900 rounded-2xl border-2 border-indigo-500/30 flex items-center p-6 cursor-pointer hover:scale-[1.02] hover:border-yellow-400 transition-all duration-300 shadow-xl"
              >
                <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/10 rounded-xl transition-all duration-500"></div>
                <svg className="w-12 h-12 text-indigo-300 mr-6 group-hover:text-yellow-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <h2 className="text-3xl font-bold tracking-wide">{cat.substring(3)}</h2>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewState === 'countdown' && (
        <div className="h-full w-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black relative overflow-hidden">
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[50rem] h-[50rem] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute w-[30rem] h-[30rem] bg-pink-500/20 rounded-full blur-[100px] animate-ping"></div>
          </div>
          
          <h2 className="text-6xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-pink-300 uppercase tracking-widest mb-12 z-10 font-bold drop-shadow-2xl">
            {CATEGORIES[activeCategoryIndex!].substring(3)}
          </h2>
          
          <div className="text-[20rem] font-black text-white animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite] drop-shadow-[0_0_80px_rgba(255,255,255,0.8)] z-10 leading-none">
            {countdown.toFixed(1)}
          </div>
        </div>
      )}

      {viewState === 'winner' && (
        <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black relative">
          <Confetti recycle={true} numberOfPieces={500} gravity={0.15} />
          
          <h2 className="text-5xl font-bold text-yellow-300 mb-8 uppercase tracking-widest animate-[fadeIn_1s_ease-out]">
            {CATEGORIES[activeCategoryIndex!]}
          </h2>
          
          {activeData?.winningFamily ? (
            <>
              {/* Teks Pengumuman Pemenang Menggunakan Nama Asli */}
              <div className="text-[7rem] md:text-[9rem] font-black text-white mb-6 drop-shadow-[0_0_50px_rgba(255,255,255,0.3)] animate-[scaleIn_0.5s_ease-out] text-center leading-tight">
                {FAMILY_NAMES[activeData.winningFamily]}
              </div>
              
              <div className="text-5xl font-bold text-pink-400 mb-16 animate-[fadeIn_2s_ease-out]">
                {activeData.maxCount} Undian Sah
              </div>

              <div className="flex gap-8 z-10">
                <button 
                  onClick={goBackToGrid}
                  className="px-10 py-5 bg-gray-800 hover:bg-gray-700 rounded-full text-2xl font-bold transition-colors shadow-xl"
                >
                  Kembali
                </button>
                <button 
                  onClick={() => setViewState('comments')}
                  className="px-12 py-5 bg-gradient-to-r from-pink-500 to-orange-400 hover:scale-105 rounded-full text-2xl font-black transition-all shadow-[0_0_40px_rgba(236,72,153,0.5)]"
                >
                  Teruskan ke Ruangan Komen
                </button>
              </div>
            </>
          ) : (
            <div className="text-7xl font-black text-gray-500 mt-12">Tiada Undian</div>
          )}
        </div>
      )}

      {viewState === 'comments' && (
        <div className="h-full w-full flex flex-col bg-slate-950 relative">
          <div className="bg-black/50 backdrop-blur-md p-6 border-b border-gray-800 flex justify-between items-center z-10">
            <div>
              {/* Teks Judul Komen Menggunakan Nama Asli */}
              <h2 className="text-3xl font-black text-yellow-400">
                Komen Peminat: {activeData?.winningFamily ? FAMILY_NAMES[activeData.winningFamily] : ""}
              </h2>
              <p className="text-gray-400 text-lg">{CATEGORIES[activeCategoryIndex!]}</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setIsScrolling(!isScrolling)}
                className={`px-8 py-3 rounded-full font-bold text-xl transition-colors ${isScrolling ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                {isScrolling ? 'PAUSE SCROLL' : 'RESUME SCROLL'}
              </button>
              <button 
                onClick={goBackToGrid}
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-full font-bold text-xl transition-colors"
              >
                Tutup Komen
              </button>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-12 custom-scrollbar pb-[50vh]"
            onMouseEnter={() => setIsScrolling(false)}
            onMouseLeave={() => setIsScrolling(true)}
          >
            <div className="max-w-5xl mx-auto space-y-8">
              {activeData?.allComments.map((commentData: {name: string, text: string}, idx: number) => (
                <div key={idx} className="bg-gray-900 border-l-8 border-pink-500 p-8 rounded-r-2xl shadow-lg transform transition-transform hover:scale-[1.02]">
                  <p className="text-2xl font-bold text-pink-400 mb-3">{commentData.name}</p>
                  <p className="text-4xl text-gray-100 leading-relaxed font-medium">"{commentData.text}"</p>
                </div>
              ))}
              {activeData?.allComments.length === 0 && (
                <div className="text-center text-4xl text-gray-600 mt-20">Tiada komen ditinggalkan.</div>
              )}
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>
        </div>
      )}

    </div>
  )
}