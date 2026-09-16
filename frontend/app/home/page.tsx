export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">Quickpin</h1>
          <div className="text-sm text-gray-500">🌐 বাংলা | English</div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-blue-100 rounded-xl p-6 text-center text-blue-600 border-2 border-dashed border-blue-300">
          🖼️ Top Banner (admin panel থেকে upload হবে)
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3"></div>
              <p className="text-sm font-medium">Product {i}</p>
              <p className="text-blue-600 font-bold">₹0.00</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-gray-100 rounded-xl p-6 text-center text-gray-500 border-2 border-dashed border-gray-300">
          🖼️ Footer Banner (admin panel থেকে upload হবে)
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-400">
        © 2026 Quickpin
      </footer>
    </div>
  );
}
