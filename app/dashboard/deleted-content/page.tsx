import Link from "next/link";

export default function DeletedContentPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Content Unavailable</h1>
        <p className="text-gray-600 mb-6">
          This content is no longer available. It may have been deleted or the user who posted it has been removed.
        </p>
        <Link 
          href="/dashboard" 
          className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
} 