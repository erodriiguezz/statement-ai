export default function Footer() {
  return (
    <footer className="px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-5xl text-center text-sm text-muted">
        &copy; {new Date().getFullYear()} Statement.AI · Parsed locally · Not
        retained
      </div>
    </footer>
  );
}
