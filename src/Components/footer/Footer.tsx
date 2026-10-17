const LINK_CLASS = "text-body-sm text-muted-foreground no-underline hover:text-foreground";

export default function Footer() {
  return (
    <footer className="mt-6 border-t border-border py-4">
      <div className="flex flex-col items-center justify-between px-3 sm:flex-row">
        <span className="text-body-sm text-muted-foreground">&copy; {new Date().getFullYear()} Reviser. All rights reserved.</span>
        <div className="mt-2 flex gap-4 sm:mt-0">
          <a href="/" className={LINK_CLASS}>
            Home
          </a>
          <a href="#" className={LINK_CLASS}>
            Privacy
          </a>
          <a href="#" className={LINK_CLASS}>
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
