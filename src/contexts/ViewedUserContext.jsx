import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeUsers } from '../firebase/firestore';

const ViewedUserContext = createContext(null);

// Lets an admin switch which member's habits/rewards they're looking at.
// Members always view themselves; the selector UI is admin-only.
export function ViewedUserProvider({ children }) {
  const { user, profile, isAdmin } = useAuth();
  const [viewedUid, setViewedUid] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    return subscribeUsers(setUsers);
  }, [isAdmin]);

  useEffect(() => {
    if (!viewedUid && user) setViewedUid(user.uid);
  }, [user, viewedUid]);

  const value = {
    viewedUid: isAdmin ? viewedUid ?? user?.uid : user?.uid,
    setViewedUid,
    users,
    isViewingSelf: (isAdmin ? viewedUid ?? user?.uid : user?.uid) === user?.uid,
    profile,
  };

  return <ViewedUserContext.Provider value={value}>{children}</ViewedUserContext.Provider>;
}

export function useViewedUser() {
  const ctx = useContext(ViewedUserContext);
  if (!ctx) throw new Error('useViewedUser must be used within ViewedUserProvider');
  return ctx;
}
