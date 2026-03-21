import { useAuth } from '../contexts/AuthContext';

const UserInfoExample = () => {
  const { user, isAuthenticated } = useAuth();

  // Vérifier si l'utilisateur est connecté
  if (!isAuthenticated) {
    return <div>Utilisateur non connecté</div>;
  }

  // Accéder aux informations de l'utilisateur
  return (
    <div>
      <h3>Informations utilisateur :</h3>
      <p><strong>ID:</strong> {user?.id || 'Non disponible'}</p>
      <p><strong>Email:</strong> {user?.email || 'Non disponible'}</p>
      <p><strong>Nom:</strong> {user?.nom || user?.name || 'Non disponible'}</p>
      <p><strong>Prénom:</strong> {user?.prenom || user?.first_name || 'Non disponible'}</p>
      <p><strong>Rôle:</strong> {user?.role || 'Non disponible'}</p>
      
      <h4>Objet utilisateur complet :</h4>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
};

export default UserInfoExample;
