// src/constants.js

export const CATEGORY_EXAMPLES_SIMPLE = {
  'Ankara Essence': 'Infinity Dresses',
  'Kente Royal': 'Blazers',
  'Modern Dashiki': 'Kaftans',
  'Maasai Beads': 'Necklaces',
  'Traditional Wedding': 'Bridal Gowns',
  'Heritage Headwear': 'Gold Wraps',
  'Tribal Footwear': 'Sandals',
  'Agbada Collection': 'Robes',
  'Normal Clothes': 'T-Shirts'
}

export const CATEGORY_EXAMPLES_DETAILED = {
  'Ankara Essence': 'Infinity Dresses, Mudcloth Vests, Wrap Skirts',
  'Kente Royal': 'Graduation Stoles, Blazers, Traditional Robes',
  'Modern Dashiki': 'Kaftans, Tunics, Hoodies',
  'Maasai Beads': 'Necklaces, Warrior Shukas, Sandals',
  'Traditional Wedding': 'Bridal Gowns, Groom Suits, Headpieces',
  'Heritage Headwear': 'Gold Headwraps, Turban, Gele',
  'Tribal Footwear': 'Leather Sandals, Beaded Slides',
  'Agbada Collection': 'Grand Robes, Kaftans',
  'Normal Clothes': 'T-Shirts, Jeans, Casual Dresses, Jackets'
}

export const EXPLORE_ITEMS = [
  { id: 1, name: 'Bogolan Mudcloth Vest', price: '$75.00' },
  { id: 2, name: 'Zulu Beaded Sandals', price: '$55.00' },
  { id: 3, name: 'Modern Adire Tunic', price: '$85.00' },
]

export const DEFAULT_COLORS = [
  { id: 1, hex: '#1C1C1E' }, // Almost Black
  { id: 2, hex: '#876964' }, // Warm Brown
  { id: 3, hex: '#6A807D' }, // Slate Green
  { id: 4, hex: '#806782' }  // Muted Purple
]

export const MOCK_REVIEW = {
  author: 'Leslie Alexander',
  time: '3 years ago',
  rating: 4,
  text: "Good service and I'm happy with the service, best value plant nursery in my area.",
  // Placeholder avatar
  avatar: 'https://i.pravatar.cc/150?u=leslie' 
}

export const DEFAULT_PORTFOLIO = [
  'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400&auto=format&fit=crop'
]

export const REVIEWS_LIST = [
  {
    id: 1,
    author: 'Leslie Alexander',
    time: '5 Min',
    rating: 4,
    text: 'Good service and I\'m happy with the service, best value plant nursery in my area.',
    avatar: 'https://i.pravatar.cc/150?u=leslie'
  },
  {
    id: 2,
    author: 'Raji Fakhr',
    time: '10 Min',
    rating: 3,
    text: 'Formal assessment of something with the intention of change if necessary.',
    avatar: 'https://i.pravatar.cc/150?u=raji'
  },
  {
    id: 3,
    author: 'Thuwaybah Issa',
    time: '15 Min',
    rating: 3,
    text: 'Good service and I\'m happy with the service, best value plant nursery in my area.',
    avatar: 'https://i.pravatar.cc/150?u=thuwaybah'
  },
  {
    id: 4,
    author: 'Nuhaid Rihab',
    time: '20 Min',
    rating: 3,
    text: 'Review of the latest book on Chaucer. A criticism is a judgment, usually in an article, either favorable.',
    avatar: 'https://i.pravatar.cc/150?u=nuhaid'
  }
]
