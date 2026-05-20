export default function Footer() {
  return (
    <footer className="w-full bg-white py-4 px-4 md:px-8 flex items-center justify-center">
      <p className="text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Statement AI. All rights reserved.
      </p>
    </footer>
  );
}
