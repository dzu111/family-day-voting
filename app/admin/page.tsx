"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'

const CATEGORIES = [
  "Paling Gempak",
  "Pakaian Sedondon",
  "Paling Sporting",
  "Paling Havoc",
  "Paling Sempoi",
  "Teamwork Mantap",
  "Persiapan Lengkap"
]

const FAMILY_NAMES: Record<number, string> = {
  1: "Keluarga Ayahlong",
  2: "Keluarga Ayah Ngah",
  3: "Keluarga Mak Belakang",
  4: "Keluarga Mak Lang",
  5: "Keluarga Mak Dak",
  6: "Keluarga Makteh",
  7: "Keluarga Acu"
}

export default function AdminPanel() {
  const [activeFamily, setActiveFamily] = useState<number | null>(null)
  const [votes, setVotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: controlData } = await supabase.from('live_control').select('*').single()
      if (controlData) {
        setActiveFamily(controlData.active_family_id)
        if (controlData.active_family_id) fetchVotes(controlData.active_family_id)
      }
      setLoading(false)
    }
    fetchInitialData()

    // Listen to control state changes
    const controlChannel = supabase.channel('control_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_control' }, (payload) => {
        const newData = payload.new
        setActiveFamily(newData.active_family_id)
        if (newData.active_family_id) {
          fetchVotes(newData.active_family_id)
        } else {
          setVotes([])
        }
      }).subscribe()

    // Listen to new votes arriving in real-time
    const votesChannel = supabase.channel('new_votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) => {
        setVotes(prev => [payload.new, ...prev])
      }).subscribe()

    return () => {
      supabase.removeChannel(controlChannel)
      supabase.removeChannel(votesChannel)
    }
  }, [])

  const fetchVotes = async (familyId: number) => {
    const { data } = await supabase.from('votes')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
    if (data) setVotes(data)
  }

  const pushFamily = async (id: number) => {
    // Only update the active family id, no more voting_status
    await supabase.from('live_control').update({ active_family_id: id }).eq('id', 1)
  }

  const resetSession = async () => {
    await supabase.from('live_control').update({ active_family_id: null }).eq('id', 1)
  }

  // Calculate live tallies
  const tallies = new Array(7).fill(0)
  votes.forEach(v => {
    tallies[v.category_1 - 1] += 1
    tallies[v.category_2 - 1] += 1
  })
  const maxTally = Math.max(...tallies, 1) // Prevent division by zero

  if (loading) return <div className="p-8 text-center text-xl font-bold">Loading Control Panel...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Master Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800">Admin Control Panel</h1>
            <p className="text-gray-500 font-medium mt-1">
              Active: {activeFamily ? FAMILY_NAMES[activeFamily] : 'None (Waiting Screen)'} • Total Votes: {votes.length}/58
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={resetSession} className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold">
              Reset
            </button>
          </div>
        </div>

        {/* Family Push Buttons */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4 uppercase tracking-wide">Push Family Live</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                onClick={() => pushFamily(num)}
                className={`p-4 rounded-xl font-black transition-all ${activeFamily === num ? 'bg-blue-600 text-white shadow-lg scale-105 ring-4 ring-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {FAMILY_NAMES[num]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Live Tally Charts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center justify-between">
              Live Category Tally 
              <span className="text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full animate-pulse">LIVE</span>
            </h2>
            <div className="space-y-4">
              {CATEGORIES.map((cat, index) => {
                const count = tallies[index]
                const percentage = (count / maxTally) * 100
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
                      <span>{cat}</span>
                      <span>{count} votes</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-4 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Live Comment Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col h-[500px]">
            <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center justify-between">
              Live Comment Feed
              <span className="text-sm font-bold bg-pink-100 text-pink-700 px-3 py-1 rounded-full animate-pulse">LIVE</span>
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {votes.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-medium italic">
                  Waiting for voters to submit...
                </div>
              ) : (
                votes.map((vote) => (
                  <div key={vote.id} className="bg-gray-50 border border-gray-100 p-4 rounded-xl animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-800">{vote.voter_name}</span>
                      <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded">
                        {new Date(vote.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed">"{vote.comment}"</p>
                    <div className="mt-3 flex gap-2 text-xs font-bold text-indigo-600">
                      <span className="bg-indigo-50 px-2 py-1 rounded-md">{CATEGORIES[vote.category_1 - 1]}</span>
                      <span className="bg-indigo-50 px-2 py-1 rounded-md">{CATEGORIES[vote.category_2 - 1]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}