import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp } from 'lucide-react';
import ProductCard from './ProductCard';
import ProductQuickView from './ProductQuickView';
import { Product } from '../types';
import { products as demoProducts } from '../data/products';

interface BestSellersProps {
  onAddToCart: (product: Product) => void;
}

const BestSellers: React.FC<BestSellersProps> = ({ onAddToCart }) => {
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchBestSellers();
  }, []);

  const fetchBestSellers = async () => {
    try {
      setLoading(true);

      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          province_id
        `);

      if (orderError) throw orderError;

      const productSales: { [key: string]: { total: number, provinces: { [province: string]: number } } } = {};
      orderItems?.forEach(item => {
        if (item.product_id) {
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = { total: 0, provinces: {} };
          }
          productSales[item.product_id].total += item.quantity;

          if (item.province_id) {
            productSales[item.product_id].provinces[item.province_id] =
              (productSales[item.product_id].provinces[item.province_id] || 0) + item.quantity;
          }
        }
      });

      const topProductIds = Object.entries(productSales)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 8)
        .map(([productId]) => productId);

      if (topProductIds.length > 0 && topProductIds.length >= 8) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', topProductIds)
          .eq('is_active', true)
          .gt('stock', 0);

        if (productsError) throw productsError;

        const productsWithPrices = await Promise.all(
          (products || []).map(async (p) => {
            const topProvince = productSales[p.id]?.provinces
              ? Object.entries(productSales[p.id].provinces)
                  .sort(([, a], [, b]) => b - a)[0]?.[0]
              : null;

            let price = parseFloat(p.base_price) || 0;

            if (topProvince) {
              const { data: regionalPrice } = await supabase
                .from('regional_pricing')
                .select('price, region_id')
                .eq('product_id', p.id)
                .eq('is_available', true)
                .single();

              if (regionalPrice?.price) {
                price = parseFloat(regionalPrice.price);
              }
            }

            return {
              id: p.id,
              name: p.name,
              price: price,
              originalPrice: p.original_price ? parseFloat(p.original_price) : undefined,
              image: p.image_url,
              rating: p.rating || 4.5,
              reviews: p.reviews_count || 0,
              category: p.category_id || 'electronics',
              subcategory: p.subcategory_id || 'otros',
              brand: p.brand || '',
              description: p.description || '',
              specifications: {},
              inStock: p.stock > 0,
              availableLocations: {
                provinces: ['all'],
                municipalities: ['all']
              }
            };
          })
        );

        const sortedProducts = topProductIds
          .map(id => productsWithPrices.find(p => p.id === id))
          .filter((p): p is any => p !== undefined);

        setBestSellers(sortedProducts);
      } else {
        const { data: allProducts, error: countError } = await supabase
          .from('products')
          .select('id')
          .eq('is_active', true)
          .gt('stock', 0);

        if (countError) throw countError;

        if (allProducts && allProducts.length > 0) {
          const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
          const randomIds = shuffled.slice(0, 8).map(p => p.id);

          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('id', randomIds);

          if (productsError) throw productsError;

          if (products && products.length > 0) {
            const formattedProducts = products.map(p => ({
              id: p.id,
              name: p.name,
              price: parseFloat(p.base_price) || 0,
              originalPrice: p.original_price ? parseFloat(p.original_price) : undefined,
              image: p.image_url,
              rating: p.rating || 4.5,
              reviews: p.reviews_count || 0,
              category: p.category_id || 'electronics',
              subcategory: p.subcategory_id || 'otros',
              brand: p.brand || '',
              description: p.description || '',
              specifications: {},
              inStock: p.stock > 0,
              availableLocations: {
                provinces: ['all'],
                municipalities: ['all']
              }
            }));

            setBestSellers(formattedProducts);
          }
        } else {
          const shuffled = [...demoProducts].sort(() => Math.random() - 0.5);
          const randomDemoProducts = shuffled.slice(0, 8);
          setBestSellers(randomDemoProducts);
        }
      }
    } catch (error) {
      console.error('Error fetching best sellers:', error);
      const shuffled = [...demoProducts].sort(() => Math.random() - 0.5);
      const randomDemoProducts = shuffled.slice(0, 8);
      setBestSellers(randomDemoProducts);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-8"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-full mb-4">
          <TrendingUp className="w-5 h-5" />
          <span className="font-semibold">Productos Más Vendidos</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Los Favoritos de Nuestros Clientes
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Descubre los productos más populares y mejor valorados por nuestra comunidad
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {bestSellers.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            onQuickView={setQuickViewProduct}
          />
        ))}
      </div>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={quickViewProduct !== null}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

export default BestSellers;
