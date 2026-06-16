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
