function ProductCard({ product, isFavorite, onToggleFavorite }) {
  return (
    <article className="product-card">
      <div className="product-card-media">
        <img src={product.image} alt={product.title} loading="lazy" />
        <button
          type="button"
          className={`favorite-toggle ${isFavorite ? 'active' : ''}`}
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="product-card-body">
        <p className="category">{product.category}</p>
        <h2>{product.title}</h2>
        <p className="price">${product.price.toFixed(2)}</p>
        <p className="description">{product.description}</p>
        <button type="button" className="add-cart-button">
          Agregar al carrito
        </button>
      </div>
    </article>
  )
}

export default ProductCard
