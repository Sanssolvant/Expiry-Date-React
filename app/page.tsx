import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';

// Funktion, um Daten von der API zu laden (Server Component)
async function getUsers() {
  const res = await fetch('http://localhost:3000/api/getUsers', {
    cache: 'no-store', // Kein Caching, da wir aktuelle Daten möchten
  });

  if (!res.ok) {
    throw new Error('Fehler beim Abrufen der Benutzerdaten');
  }

  const data = await res.json();
  return data.data;
}

export default async function HomePage() {
  const users = await getUsers();
  return (
    <>
      <Welcome />
      <ColorSchemeToggle />
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Benutzerliste</h1>
        {users.length > 0 ? (
          <ul>
            {users.map((user: any) => (
              <li key={user.id}>
                {user.username} - {user.email}
              </li>
            ))}
          </ul>
        ) : (
          <p>Keine Benutzer gefunden.</p>
        )}
      </main>
    </>
  );
}
