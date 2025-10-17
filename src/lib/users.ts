import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/data';

/**
 * Fetches all user profiles from the 'users' collection in Firestore.
 * @returns A promise that resolves to an array of UserProfile objects.
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    console.log('=== FETCHING USERS FROM FIRESTORE ===');
    console.log('Database instance:', db ? 'exists' : 'null');
    
    const usersCollection = collection(db, 'users');
    console.log('Users collection created');
    
    const userSnapshot = await getDocs(usersCollection);
    console.log('Snapshot obtained, docs count:', userSnapshot.size);
    
    const userList = userSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Document data:', doc.id, data);
      return {
        id: doc.id,
        ...data
      } as UserProfile;
    });
    
    console.log(`Successfully fetched ${userList.length} users from database`);
    console.log('User names found:', userList.map(u => u.name));
    
    return userList;
  } catch (error) {
    console.error("Detailed error fetching users:", error);
    console.error("Error type:", typeof error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return [];
  }
}
