function Header() {
  return (
    <div className="container">
      <header className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-between py-3 mb-4 border-bottom">
        <div className="col mb-md-0 justify-content-center">
          <a href="/" className="d-flex align-items-center link-body-emphasis text-decoration-none" style={{maxWidth:'fit-content'}}>
            <img className="bi me-2" width="34" height="32" aria-label="Bootstrap" src="./Reviser.png"/>
            <h3 className="mb-0 mt-1">Reviser</h3>
          </a>
        </div>
        {/* <div classNameName="nav col-12 col-md-auto mb-2 justify-content-center mb-md-0"></div> */}
      </header>
    </div>
  );
}

export default Header;
