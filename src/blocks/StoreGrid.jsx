import ProductCard from '../components/ProductCard.jsx'

function StoreGrid({ products, favoriteIds, onToggleFavorite }) {
  return (
    <section className="block-grid" aria-label="Catálogo de productos">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={favoriteIds.includes(product.id)}
          onToggleFavorite={() => onToggleFavorite(product.id)}
        />
      ))}
    </section>
  )
}

export default StoreGrid
