// Ensures a logged-in seller lands on their Dashboard first — on login,
// on registration, and if they open/reopen the app straight to the Home
// page with a session already saved. It only fires once per browser
// session (cleared when the tab closes, and on logout) so that a seller
// who deliberately clicks "Home" from the navbar can browse it normally
// afterwards without being bounced back on every render/refresh.
const FLAG_KEY = "tiffo_seller_landed_dashboard";

export function markSellerLandedOnDashboard(): void {
  sessionStorage.setItem(FLAG_KEY, "1");
}

export function hasSellerLandedOnDashboard(): boolean {
  return sessionStorage.getItem(FLAG_KEY) === "1";
}

export function clearSellerLandedOnDashboard(): void {
  sessionStorage.removeItem(FLAG_KEY);
}
