import StoreGrid from './blocks/StoreGrid.jsx'
import useProducts from './hooks/useProducts.js'

function App() {
  const { products, loading, error } = useProducts()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Fake Store</p>
          <h1>Productos en línea</h1>
          <p className="subtitle">
            Un ejemplo de arquitectura con componentes, bloques y hooks en React.
          </p>
        </div>
      </header>

      <main>
        {loading && <p className="status-message">Cargando productos...</p>}
        {error && <p className="status-message error">Ocurrió un error: {error}</p>}
        {!loading && !error && <StoreGrid products={products} />}
      </main>
    </div>
  )
}

export default App
