import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-md py-4 px-4 md:px-8 flex items-center justify-between">
      <Link href="/" className="flex items-center space-x-2">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Image
            src="/agents.png"
            alt="Logo"
            width={25}
            height={25}
            priority
            className="brightness-0 invert"
          />
        </div>

        <p className="text-lg font-bold text-gray-800">
          Statement.<span className="text-primary">AI</span>
        </p>
      </Link>
    </nav>
  );
}
