export const signOutRedirect = async () => {
  const clientId = "6chhv3rf7dik3j5gbjic2f9g82";
  const logoutUri = "http://localhost:5173";
  const cognitoDomain = "https://ap-south-1kaeiba6fs.auth.ap-south-1.amazoncognito.com";
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};
