import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Recalculates the number of communities assigned to a personal staff member
 * as either Gestor or Contable, and updates their Firestore document 'n_comunidades' field.
 * @param {string} personalId - The Firestore document ID of the personal member.
 */
export async function recalculatePersonalCount(personalId) {
  if (!personalId) return;
  try {
    const communitiesRef = collection(db, 'comunidades');
    
    // Query communities where this person is the Gestor
    const qGestor = query(communitiesRef, where('gestorId', '==', personalId));
    const snapGestor = await getDocs(qGestor);
    
    // Query communities where this person is the Contable
    const qContable = query(communitiesRef, where('contableId', '==', personalId));
    const snapContable = await getDocs(qContable);
    
    // Store unique community IDs to prevent double counting if they are both roles
    const uniqueCommunityIds = new Set();
    snapGestor.forEach(docSnap => uniqueCommunityIds.add(docSnap.id));
    snapContable.forEach(docSnap => uniqueCommunityIds.add(docSnap.id));
    
    const count = uniqueCommunityIds.size;
    
    // Update the personal document in Firestore
    const personalDocRef = doc(db, 'personal', personalId);
    await updateDoc(personalDocRef, {
      n_comunidades: count
    });
    
    console.log(`Recalculated communities count for ${personalId}: ${count}`);
    return count;
  } catch (error) {
    console.error(`Error recalculating personal count for ${personalId}:`, error);
  }
}
