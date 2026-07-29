import { useEffect, useState } from 'react';
import { subscribeUsers, updateUserDoc } from '../firebase/firestore';
import AddUserForm from '../components/admin/AddUserForm';

export default function AdminPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => subscribeUsers(setUsers), []);

  async function toggleRole(u) {
    await updateUserDoc(u.id, { role: u.role === 'admin' ? 'member' : 'admin' });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin</h1>
      </div>

      <AddUserForm />

      <p style={{ margin: '20px 0 8px', fontWeight: 700 }}>Users</p>
      {users.map((u) => (
        <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{u.name}</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{u.role}</p>
          </div>
          <button className="btn secondary" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => toggleRole(u)}>
            Make {u.role === 'admin' ? 'member' : 'admin'}
          </button>
        </div>
      ))}
    </div>
  );
}
