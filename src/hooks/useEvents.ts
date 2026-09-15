'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Event, EventInsert, EventUpdate } from '@/lib/supabase/types'
import { DEFAULT_COLOR } from '@/lib/divisi'

// ===================================
// TYPES
// ===================================

interface Stats {
  todayEvents: Event[]
  thisMonth: number
  upcoming: Event[]
}

interface SuccessResult<T = Event> {
  success: true
  data: T
  count?: number
}

interface ErrorResult {
  success: false
  message: string
}

type Result<T = Event> = SuccessResult<T> | ErrorResult

// ===================================
// HOOK
// ===================================

export function useEvents() {
  const [stats, setStats] = useState<Stats>({ todayEvents: [], thisMonth: 0, upcoming: [] })
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)

  /**
   * Fetch events — returns FC-ready array, NO setState for events.
   * FullCalendar manages its own event store via the events callback.
   */
  const fetchEvents = useCallback(async (start?: string, end?: string): Promise<Event[]> => {
    if (!supabase) return []
    try {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })

      if (start && end) {
        query = query
          .lte('start_date', end)
          .or(`end_date.is.null,end_date.gte.${start}`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching events:', error.message)
        return []
      }
      return data || []
    } catch (err) {
      console.error('Error fetching events:', err)
      return []
    }
  }, [])

  /**
   * Add single event
   */
  const addEvent = useCallback(async (eventData: EventInsert): Promise<Result> => {
    if (!supabase) return { success: false, message: 'Supabase belum dikonfigurasi.' }
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description || null,
          location: eventData.location || null,
          start_date: eventData.start_date,
          end_date: eventData.end_date || null,
          is_tbd: eventData.is_tbd ?? false,
          color: eventData.color || DEFAULT_COLOR,
          created_by: eventData.created_by || null,
          reminder_offset_minutes: eventData.reminder_offset_minutes ?? null,
        }])
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }, [])

  /**
   * Add multiple events (recurring) — 1 request, shared group_id
   */
  const addEvents = useCallback(async (eventsData: EventInsert[]): Promise<Result<Event[]>> => {
    if (!supabase) return { success: false, message: 'Supabase belum dikonfigurasi.' }
    if (!Array.isArray(eventsData) || eventsData.length === 0) {
      return { success: false, message: 'Tidak ada kegiatan untuk disimpan.' }
    }
    const groupId = crypto.randomUUID()
    try {
      const rows = eventsData.map(ev => ({
        title: ev.title,
        description: ev.description || null,
        location: ev.location || null,
        start_date: ev.start_date,
        end_date: ev.end_date || null,
        is_tbd: ev.is_tbd ?? false,
        color: ev.color || DEFAULT_COLOR,
        created_by: ev.created_by || null,
        reminder_offset_minutes: ev.reminder_offset_minutes ?? null,
        group_id: groupId,
      }))
      const { data, error } = await supabase
        .from('events')
        .insert(rows)
        .select()

      if (error) throw error
      return { success: true, data, count: data.length }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }, [])

  /**
   * Update single event
   */
  const updateEvent = useCallback(async (id: string, updates: EventUpdate): Promise<Result> => {
    if (!supabase) return { success: false, message: 'Supabase belum dikonfigurasi.' }
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }, [])

  /**
   * Update all events in a recurring group
   */
  const updateEventGroup = useCallback(async (groupId: string, updates: EventUpdate): Promise<Result<Event[]>> => {
    if (!supabase) return { success: false, message: 'Supabase belum dikonfigurasi.' }
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('group_id', groupId)
        .select()

      if (error) throw error
      return { success: true, data, count: data.length }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }, [])

  /**
   * Delete single event
   */
  const deleteEvent = useCallback(async (id: string): Promise<Result<null>> => {
    if (!supabase) return { success: false, message: 'Supabase belum dikonfigurasi.' }
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true, data: null }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }, [])

  /**
   * Delete all events in a recurring group
   */
  const deleteEventGroup = useCallback(async (groupId: string): Promise<Result<null>> => {
    if (!supabase) return { success: false, message: 'Supabase belum dikonfigurasi.' }
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('group_id', groupId)

      if (error) throw error
      return { success: true, data: null }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }, [])

  /**
   * Update stats — safe to call anytime
   */
  const updateStats = useCallback(async () => {
    if (!supabase) return
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const [todayRes, monthRes, upcomingRes] = await Promise.all([
        supabase.from('events').select('*')
          .or(`and(start_date.gte.${todayStart},start_date.lt.${todayEnd}),and(start_date.lt.${todayEnd},end_date.gte.${todayStart})`)
          .order('start_date', { ascending: true }),
        supabase.from('events').select('*', { count: 'exact', head: true })
          .gte('start_date', monthStart).lte('start_date', monthEnd),
        supabase.from('events').select('*')
          .or(`start_date.gte.${now.toISOString()},end_date.gte.${now.toISOString()}`)
          .order('start_date', { ascending: true })
          .limit(3),
      ])

      setStats({
        todayEvents: todayRes.data || [],
        thisMonth: monthRes.count || 0,
        upcoming: upcomingRes.data || [],
      })
    } catch {
      // Silently fail if Supabase not configured
    }
  }, [])

  /**
   * Realtime subscription — dispatch 'events-changed' window event
   */
  useEffect(() => {
    const client = supabase
    if (!client) return

    const channel = client
      .channel('orbit-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        window.dispatchEvent(new CustomEvent('events-changed'))
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current)
      }
    }
  }, [])

  return {
    stats,
    fetchEvents,
    addEvent,
    addEvents,
    updateEvent,
    updateEventGroup,
    deleteEvent,
    deleteEventGroup,
    updateStats,
  }
}
