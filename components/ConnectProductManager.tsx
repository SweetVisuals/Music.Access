import React, { useState, useEffect } from 'react';
import { stripeService } from '../services/stripeService';
import { UserProfile } from '../types';
import { Loader2, Plus, Package, DollarSign } from 'lucide-react';

interface ConnectProductManagerProps {
    userProfile: UserProfile;
}

const ConnectProductManager: React.FC<ConnectProductManagerProps> = ({ userProfile }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price: '', // user enters dollars
    });

    useEffect(() => {
        if (userProfile.stripe_account_id) {
            fetchProducts(userProfile.stripe_account_id);
        }
    }, [userProfile.stripe_account_id]);

    const fetchProducts = async (accountId: string) => {
        setLoading(true);
        try {
            const res = await stripeService.listProducts(accountId);
            if (res && res.data) {
                setProducts(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch products", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userProfile.stripe_account_id) return;
        setCreating(true);

        try {
            const priceInCents = Math.round(parseFloat(newProduct.price) * 100);
            await stripeService.createProduct(userProfile.stripe_account_id, {
                name: newProduct.name,
                description: newProduct.description,
                priceInCents: priceInCents,
                currency: 'usd'
            });

            // Reset and refresh
            setShowForm(false);
            setNewProduct({ name: '', description: '', price: '' });
            fetchProducts(userProfile.stripe_account_id);
        } catch (err) {
            console.error(err);
            alert("Failed to create product");
        } finally {
            setCreating(false);
        }
    };

    if (!userProfile.stripe_account_id) return null;

    return (
        <div className="bg-[#111] border border-neutral-800 rounded-xl p-6 mt-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Your Products</h2>
                    <p className="text-neutral-400 text-sm">
                        Create products that will appear on your storefront.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={16} /> New Product
                </button>
            </div>

            {showForm && (
                <div className="bg-neutral-900 rounded-xl p-5 mb-6 border border-neutral-800 animate-in slide-in-from-top-2 duration-200">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Product Name</label>
                            <input
                                type="text"
                                required
                                value={newProduct.name}
                                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white focus:border-primary focus:outline-none"
                                placeholder="e.g. Mixing Service"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Description</label>
                            <textarea
                                value={newProduct.description}
                                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white focus:border-primary focus:outline-none h-20"
                                placeholder="Describe your product..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase mb-1">Price (USD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-neutral-500">$</span>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                    className="w-full bg-black border border-neutral-800 rounded-lg p-2 pl-7 text-white focus:border-primary focus:outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-sm text-neutral-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="bg-primary text-black font-bold px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                            >
                                {creating ? <Loader2 className="animate-spin" size={16} /> : null}
                                Create Product
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-8 text-neutral-500">
                    <Loader2 className="animate-spin" />
                </div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(product => (
                        <div key={product.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2 bg-neutral-800 rounded-lg">
                                    <Package size={20} className="text-neutral-400" />
                                </div>
                                <span className="text-green-400 font-bold font-mono">
                                    ${(product.default_price?.unit_amount / 100).toFixed(2)}
                                </span>
                            </div>
                            <h3 className="text-white font-bold mb-1 truncate">{product.name}</h3>
                            <p className="text-neutral-500 text-xs line-clamp-2 h-8">{product.description || 'No description'}</p>

                            <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-500">
                                <span className={product.active ? 'text-green-500' : 'text-neutral-500'}>
                                    {product.active ? 'Active' : 'Archived'}
                                </span>
                                <span className="font-mono">{product.id}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-12 bg-neutral-900/50 border border-dashed border-neutral-800 rounded-xl">
                    <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-500">
                        <Package size={24} />
                    </div>
                    <h3 className="text-white font-bold mb-1">No products yet</h3>
                    <p className="text-neutral-500 text-sm mb-4">Create your first product to start selling.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="text-primary hover:text-primary/80 font-bold text-sm"
                    >
                        Create Product
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConnectProductManager;
