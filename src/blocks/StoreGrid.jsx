import ProductCard from '../components/ProductCard.jsx'

function StoreGrid({ products }) {
  return (
    <section className="block-grid" aria-label="Catálogo de productos">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </section>
  )
}

export default StoreGrid
