export default function Footer() {
  return (
    <footer className="mt-auto border-top py-3 mt-4">
      <div className="container d-flex flex-column flex-sm-row justify-content-between align-items-center">
        <span className="text-muted small">&copy; {new Date().getFullYear()} Reviser. All rights reserved.</span>
        <div className="d-flex gap-3 mt-2 mt-sm-0">
          <a href="/" className="text-muted small text-decoration-none">Home</a>
          <a href="#" className="text-muted small text-decoration-none">Privacy</a>
          <a href="#" className="text-muted small text-decoration-none">Terms</a>
        </div>
      </div>
    </footer>
  );
}
