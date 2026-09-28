// Mismo marco que el login (logos + card centrada) para las pantallas sin sesion de
// recuperacion de contraseña.
export default function PublicAuthCard({ title, children }) {
  return (
    <div className="container" style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <div className="login-logos" aria-label="Marcas">
          <img className="login-logo" src="/brands/dflex.png" alt="Dflex" />
          <img className="login-logo" src="/brands/degrandis.png" alt="DeGrandis Portones" />
          <img className="login-logo" src="/brands/ipanel.png" alt="iPanel" />
        </div>
        <div className="spacer" />
        {title ? <h3 style={{ margin: 0, textAlign: "center" }}>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
