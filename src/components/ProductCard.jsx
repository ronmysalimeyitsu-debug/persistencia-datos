function ProductCard({ product }) {
  return (
    <article className="product-card">
      <img src={product.image} alt={product.title} loading="lazy" />
      <div className="product-card-body">
        <p className="category">{product.category}</p>
        <h2>{product.title}</h2>
        <p className="price">${product.price.toFixed(2)}</p>
        <p className="description">{product.description}</p>
        <button type="button">Agregar al carrito</button>
      </div>
    </article>
  )
}

export default ProductCard
