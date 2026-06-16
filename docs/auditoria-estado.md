# Auditoría de estado

## Sección 1 — Información

Nombre: [Tu nombre completo]

Proyecto auditado: Versión refactorizada / propia versión

Repositorio o ZIP: `/home/sitiouno/Escritorio/principal/ronmy`

Fecha: 16/06/2026

Objetivo de la auditoría: detectar estado mal ubicado y evaluar persistencia de favoritos.

Contexto breve (3–5 líneas):

La app muestra un listado de productos desde `https://fakestoreapi.com/products`, permite marcar y desmarcar elementos como favoritos, mantiene un contador de favoritos en el header y guarda la lista preferida en `localStorage` para que sobreviva al refresh.

---

## Sección 2 — Estado detectado

Variable / estado | Componente donde vive | Tipo (UI / datos / usuario / persistente) | ¿Bien ubicado? | Notas
--- | --- | --- | --- | ---
`products` | `src/hooks/useProducts.js` | datos | Sí | Fetch centralizado en un hook reutilizable.
`loading` | `src/hooks/useProducts.js` | UI | Sí | Estado de carga del fetch.
`error` | `src/hooks/useProducts.js` | UI | Sí | Estado de error del fetch.
`favoriteIds` | `src/hooks/useFavorites.js` | usuario + persistente | Sí | Estado compartido por header y tarjetas.
`favoritesCount` | `src/hooks/useFavorites.js` | derivado (usuario) | Sí | Se calcula a partir de `favoriteIds`, no es estado independiente.

### Estado derivado
¿Hay valores que se calculan en lugar de guardarse? Sí

- `favoritesCount` se deriva de `favoriteIds.length` dentro de `useFavorites.js`.
- No hay estado duplicado evidente en el código actual.

### Prop drilling detectado
¿Hay componentes que solo reenvían props? Sí

Componente intermediario | Props que solo reenvía | Destino final | Impacto
--- | --- | --- | ---
`src/blocks/StoreGrid.jsx` | `favoriteIds`, `onToggleFavorite` | `src/components/ProductCard.jsx` | Moderado: el estado centralizado pasa un nivel extra, pero el árbol es corto y el reenvío es sencillo.

---

## Sección 3 — Persistencia

¿Usa LocalStorage? Sí

Clave | Qué guarda | Dónde se escribe | Dónde se lee | Formato
--- | --- | --- | --- | ---
`ronmy-favorites` | IDs de productos favoritos | `src/hooks/useFavorites.js` en `useEffect` | `src/hooks/useFavorites.js` en `getInitialFavorites()` | JSON

### Evaluación de persistencia
¿Es apropiado lo que se guarda? Sí — guarda preferencias de usuario (IDs de favoritos), no datos sensibles.

¿Hay datos sensibles? No — solo guarda IDs de productos.

¿JSON.parse tiene manejo de errores? Sí — `getInitialFavorites()` utiliza `try/catch` y devuelve `[]` si falla.

¿Estado de React y LocalStorage se sincronizan en el mismo lugar? Sí — `useFavorites.js` centraliza la sincronización: `favoriteIds` se actualiza con `useState` y luego se guarda en `localStorage` dentro del mismo hook.

Riesgo principal detectado:

- Actualmente no hay un riesgo grave. Si el usuario abre dos pestañas simultáneas, el valor se puede desincronizar entre pestañas porque no hay escucha de `storage` ni actualización cruzada. Pero dentro de una sola pestaña la persistencia funciona.

---

## Sección 4 — Responsabilidades

Archivo / componente | UI | Lógica | Datos (fetch / storage) | ¿Mezclado?
--- | --- | --- | --- | ---
`src/components/ProductCard.jsx` | Sí | No | No | No
`src/blocks/StoreGrid.jsx` | Sí | No | No | No
`src/App.jsx` | Sí | Sí | No | No (coordina estado y props)
`src/hooks/useProducts.js` | No | Sí | Sí (fetch) | No
`src/hooks/useFavorites.js` | No | Sí | Sí (storage) | No

### Ejemplo concreto — ProductCard
Archivo analizado: `src/components/ProductCard.jsx`

¿Qué hace bien?

- Renderiza la UI de la tarjeta de producto.
- Recibe datos y callbacks como props.
- No realiza fetch, no lee `localStorage` y no mantiene estado propio de favoritos.

¿Qué está mezclado?

- No hay mezcla importante. `ProductCard` solo se encarga de la presentación y de disparar `onToggleFavorite` cuando se pulsa el botón.

Consecuencia práctica:

- El componente es fácil de testar y reutilizar porque solo depende de props y no de almacenamiento o fetch.

### Calificación general de separación
UI / lógica / datos: Alta

Justificación:

- La carga de datos está aislada en `src/hooks/useProducts.js`.
- La persistencia y la lógica de favoritos están centralizadas en `src/hooks/useFavorites.js`.
- Los componentes UI (`ProductCard.jsx`, `StoreGrid.jsx`, `App.jsx`) solo reciben props y renderizan.

---

## Sección 5 — Diálogo con IA

### Diálogo 1 — Auditoría general de estado
Mi prompt:

```
Eres un revisor de arquitectura frontend especializado en React.

Analiza el código que te pego y responde:

1. INVENTARIO DE ESTADO
   - Lista cada useState (o estado equivalente): nombre, tipo de dato, componente donde vive.
   - Clasifica cada uno: UI / datos / usuario / persistente.

2. UBICACIÓN
   - ¿El estado está en el componente correcto? Justifica con el principio "lo más bajo posible, lo suficientemente arriba para compartir".

3. ESTADO DERIVADO
   - ¿Hay valores que se podrían calcular en lugar de guardarse en useState?
   - Señala duplicaciones o useEffect que solo sincronizan dos estados.

4. RIESGOS
   - ¿Qué bug o desincronización podría ocurrir con la estructura actual?

Formato: usa tablas y cita archivos/funciones concretos. No des consejos genéricos.

━━━ CÓDIGO ━━━
=== src/hooks/useProducts.js ===
import { useEffect, useState } from 'react'

function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('https://fakestoreapi.com/products')
        if (!response.ok) {
          throw new Error('No se pudo cargar el catálogo')
        }

        const data = await response.json()
        setProducts(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  return { products, loading, error }
}

export default useProducts

=== src/hooks/useFavorites.js ===
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ronmy-favorites'

function getInitialFavorites() {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error leyendo favoritos de LocalStorage:', error)
    return []
  }
}

function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(getInitialFavorites)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds))
    } catch (error) {
      console.error('Error guardando favoritos en LocalStorage:', error)
    }
  }, [favoriteIds])

  const toggleFavorite = (productId) => {
    setFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  return {
    favoriteIds,
    toggleFavorite,
    favoritesCount: favoriteIds.length,
  }
}

export default useFavorites

=== src/App.jsx ===
import StoreGrid from './blocks/StoreGrid.jsx'
import useProducts from './hooks/useProducts.js'
import useFavorites from './hooks/useFavorites.js'

function App() {
  const { products, loading, error } = useProducts()
  const { favoriteIds, toggleFavorite, favoritesCount } = useFavorites()

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
        <div className="favorites-summary">
          <strong>Favoritos:</strong> {favoritesCount}
        </div>
      </header>

      <main>
        {loading && <p className="status-message">Cargando productos...</p>}
        {error && <p className="status-message error">Ocurrió un error: {error}</p>}
        {!loading && !error && (
          <StoreGrid
            products={products}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>
    </div>
  )
}

export default App

=== src/blocks/StoreGrid.jsx ===
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

=== src/components/ProductCard.jsx ===
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
```

Respuesta de la IA:

```
1. INVENTARIO DE ESTADO

| Estado | Componente | Tipo |
|---|---|---|
| products | useProducts.js | datos |
| loading | useProducts.js | UI |
| error | useProducts.js | UI |
| favoriteIds | useFavorites.js | usuario + persistente |
| favoritesCount | useFavorites.js | derivado |

2. UBICACIÓN

- `products`, `loading` y `error` están bien ubicados en `useProducts.js` porque ese hook encapsula fetch y su estado asociado.
- `favoriteIds` está bien centralizado en `useFavorites.js`; es el estado compartido entre header y las tarjetas.
- `StoreGrid.jsx` reenvía `favoriteIds` y `onToggleFavorite`, pero el árbol es corto y el estado no está demasiado arriba.

3. ESTADO DERIVADO

- `favoritesCount` no es un useState adicional en el código actual; es derivado de `favoriteIds.length` dentro de `useFavorites.js`.
- No se observan duplicaciones de estado ni `useEffect` que solo copien valores de un estado a otro.

4. RIESGOS

- El principal riesgo es la sincronización entre pestañas. `localStorage` se escribe en `useEffect`, pero no hay escucha de eventos `storage` para actualizar si otra pestaña cambia el valor.
- Si `localStorage` contiene datos corruptos, `getInitialFavorites()` los ignora y carga `[]`, lo que restaura la app sin favoritos.
```

Mi evaluación de esta respuesta:

Pregunta | Tu respuesta
--- | ---
¿Fue específica o genérica? | Específica — nombra archivos concretos y estados detectados.
¿Confirmó lo que detectaste? | Sí — coincide con el mapa de estados y la estructura actual.
¿Estás de acuerdo? | Sí — el análisis es correcto y refleja la implementación.
¿Aplicarías sus recomendaciones? | Sí — la única mejora real es la sincronización entre pestañas.

### Diálogo 2 — Revisar uso de LocalStorage
Mi prompt:

```
Revisa cómo se usa LocalStorage en este proyecto React.

Responde:

1. DÓNDE se lee y escribe (archivo + función)
2. QUÉ claves se usan y qué formato tienen
3. QUÉ se guarda — ¿es apropiado para LocalStorage?
4. SEGURIDAD — ¿hay datos sensibles? ¿tokens? ¿contraseñas?
5. ROBUSTEZ — ¿hay try/catch al parsear JSON? ¿validación de tipos?
6. SINCRONIZACIÓN — ¿el estado de React y LocalStorage se actualizan juntos o en sitios distintos?
7. MEJORAS concretas (máximo 3), sin reescribir todo el proyecto

━━━ CÓDIGO ━━━
=== src/hooks/useFavorites.js ===
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ronmy-favorites'

function getInitialFavorites() {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error leyendo favoritos de LocalStorage:', error)
    return []
  }
}

function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(getInitialFavorites)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds))
    } catch (error) {
      console.error('Error guardando favoritos en LocalStorage:', error)
    }
  }, [favoriteIds])

  const toggleFavorite = (productId) => {
    setFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  return {
    favoriteIds,
    toggleFavorite,
    favoritesCount: favoriteIds.length,
  }
}

export default useFavorites
```

Respuesta de la IA:

```
1. DÓNDE se lee y escribe
   - Se lee en `getInitialFavorites()` dentro de `src/hooks/useFavorites.js`.
   - Se escribe en el `useEffect` de `src/hooks/useFavorites.js` que dispara cuando cambia `favoriteIds`.

2. QUÉ claves y formato
   - Clave: `ronmy-favorites`
   - Formato: JSON string de un array de IDs.

3. QUÉ se guarda
   - Se guarda una lista de IDs de productos marcados como favoritos. Es apropiado porque son preferencias de usuario y no datos sensibles.

4. SEGURIDAD
   - No hay datos sensibles. No hay tokens ni contraseñas.

5. ROBUSTEZ
   - Sí, hay `try/catch` en `getInitialFavorites()` para manejar JSON inválido.
   - No hay validación de tipos más allá de comprobar que existe `stored`.

6. SINCRONIZACIÓN
   - El hook centraliza ambos: el estado de React (`favoriteIds`) y el `localStorage` se actualizan en el mismo hook.
   - Falta una estrategia para sincronizar entre pestañas, pero en una sola pestaña la sincronización es correcta.

7. MEJORAS concretas
   - Extraer la clave y las funciones de storage a un módulo separado como `src/lib/favoritesStorage.js`.
   - Agregar validación adicional tras el `JSON.parse` para asegurar que el valor es un array.
   - Escuchar el evento `storage` en el hook para sincronizar favoritos si otra pestaña cambia la clave.
```

Mi evaluación de esta respuesta:

Pregunta | Tu respuesta
--- | ---
¿Fue específica o genérica? | Específica — se centra en `src/hooks/useFavorites.js`.
¿Confirmó lo que detectaste? | Sí — validó la clave, el formato y la centralización del hook.
¿Estás de acuerdo? | Sí — el diagnóstico es preciso y no exagera.
¿Aplicarías sus recomendaciones? | Sí — extraer storage y validar el parseo son mejoras útiles.

---

## Sección 6 — Mejora propuesta

### Mejora principal
Nombre corto: Extraer storage de favoritos

Qué cambiaría:

Separar la lógica de `localStorage` en un módulo independiente para que `useFavorites.js` solo maneje estado y negocio, y no lectura/escritura directa.

Cómo lo haría (pasos):

1. Crear `src/lib/favoritesStorage.js`.
2. Mover allí `STORAGE_KEY`, `getInitialFavorites()` y el guardado en `localStorage`.
3. Importar esas funciones desde `src/hooks/useFavorites.js`.

Por qué sería mejor:

- Reduce el acoplamiento entre el hook y la API de browser.
- Facilita tests unitarios de `useFavorites` al simular funciones de storage.
- Hace más claro qué parte es responsabilidad de datos vs lógica de estado.

Esfuerzo estimado: 20–30 minutos

Criterio de éxito:

- `ProductCard.jsx` no importa ni menciona `localStorage`.
- Favoritos siguen persistiendo al refrescar.
- `src/hooks/useFavorites.js` importa solo funciones de storage, no accede directamente a `window.localStorage`.

### Mejora secundaria (opcional)
Qué cambiaría: Añadir escucha de `storage` para sincronizar favoritos entre pestañas.

Cómo lo haría:

- En `useFavorites.js`, agregar un `useEffect` que suscribe `window.addEventListener('storage', ...)`.
- Si cambia `ronmy-favorites`, actualizar `favoriteIds` con el nuevo valor.
- Limpiar el listener en el `return` del efecto.

Por qué sería mejor:

- Hace la persistencia más robusta en escenarios multi-pestaña.
- Evita que una pestaña muestre datos desactualizados si el usuario cambia favoritos en otra.

Lo que NO cambiaría (y por qué)

- No cambiaría la separación `App.jsx` / `StoreGrid.jsx` / `ProductCard.jsx` porque la estructura actual ya mantiene responsabilidades claras.
- No movería `favoriteIds` al nivel de `App.jsx`; el hook dedicado `useFavorites.js` es la ubicación adecuada para la lógica de persistencia.

---

## Checklist antes de entregar
- [x] Completé las 6 secciones
- [x] Inventarié al menos 2 piezas de estado con su ubicación
- [x] Documenté LocalStorage (o expliqué por qué no aplica)
- [x] Evalué separación UI / lógica / datos con un ejemplo concreto
- [x] Incluí al menos 2 diálogos con IA (prompt + respuesta completos)
- [x] Evalué cada respuesta de la IA (no solo la pegué)
- [x] Propuse una mejora con pasos, justificación y criterio de éxito
