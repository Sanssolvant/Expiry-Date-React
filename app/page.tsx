import { LoginForm } from '@/components/LoginForm/LoginForm';

// // Funktion, um Daten von der API zu laden (Server Component)
// async function getUsers() {
//   const res = await fetch('http://localhost:3000/api/getUsers', {
//     cache: 'no-store', // Kein Caching, da wir aktuelle Daten möchten
//   });

//   if (!res.ok) {
//     throw new Error('Fehler beim Abrufen der Benutzerdaten');
//   }

//   const data = await res.json();
//   return data.data;
// }

export default async function HomePage() {
  return (
    <>
      <LoginForm />
    </>
  );
}
