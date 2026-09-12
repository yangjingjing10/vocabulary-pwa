import { initDatabase } from '../index'
import type { UserProfile } from '../schema/database'

const PROFILE_ID = 'default-user-profile'

export async function saveUserProfile(profile: Omit<UserProfile, 'id' | 'updatedAt'>): Promise<void> {
  const db = await initDatabase()
  const fullProfile: UserProfile = {
    ...profile,
    id: PROFILE_ID,
    updatedAt: Date.now()
  }
  await db.put('userProfile', fullProfile)
}

export async function getUserProfile(): Promise<UserProfile | undefined> {
  const db = await initDatabase()
  return db.get('userProfile', PROFILE_ID)
}

export async function updateUserAvatar(avatar: string): Promise<void> {
  const db = await initDatabase()
  const profile = await getUserProfile()
  if (profile) {
    profile.avatar = avatar
    profile.updatedAt = Date.now()
    await db.put('userProfile', profile)
  }
}

export async function updateUserName(name: string): Promise<void> {
  const db = await initDatabase()
  const profile = await getUserProfile()
  if (profile) {
    profile.name = name
    profile.updatedAt = Date.now()
    await db.put('userProfile', profile)
  }
}
