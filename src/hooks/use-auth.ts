'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import type { User as AuthUser } from '@supabase/supabase-js'
import type { User, Subscription, ClientStage } from '@/types'

export function useAuth() {
  const router = useRouter()
  const { user, subscription, stages, isLoading, setUser, setSubscription, setStages, setIsLoading, reset } = useAuthStore()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

  const loadUserData = useCallback(async () => {
    const supabase = createClient()
    
    try {
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser()
      
      if (!currentAuthUser) {
        reset()
        return null
      }
      
      setAuthUser(currentAuthUser)
      
      // Load user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentAuthUser.id)
        .single()
      
      if (userError || !userProfile) {
        console.error('Error loading user profile:', userError)
        reset()
        return null
      }
      
      setUser(userProfile)
      
      // Load subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .single()
      
      if (sub) {
        setSubscription(sub)
      }
      
      // Load stages
      const { data: stagesData } = await supabase
        .from('client_stages')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('position')
      
      if (stagesData) {
        setStages(stagesData)
      }
      
      return userProfile
    } catch (error) {
      console.error('Error loading auth:', error)
      reset()
      return null
    } finally {
      setIsLoading(false)
    }
  }, [setUser, setSubscription, setStages, setIsLoading, reset])

  useEffect(() => {
    loadUserData()
    
    const supabase = createClient()
    
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_OUT') {
          reset()
          router.push('/login')
        } else if (event === 'SIGNED_IN') {
          await loadUserData()
        }
      }
    )
    
    return () => {
      authSubscription.unsubscribe()
    }
  }, [loadUserData, reset, router])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    reset()
    router.push('/login')
  }

  const isTrialExpired = subscription?.status === 'TRIAL' && subscription.trial_ends_at 
    ? new Date(subscription.trial_ends_at) < new Date() 
    : false

  const isSubscriptionActive = subscription?.status === 'ACTIVE' || 
    (subscription?.status === 'TRIAL' && !isTrialExpired)

  return {
    user,
    authUser,
    subscription,
    stages,
    isLoading,
    isTrialExpired,
    isSubscriptionActive,
    signOut,
    refresh: loadUserData,
  }
}
