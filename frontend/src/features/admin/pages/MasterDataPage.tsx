import { useState, useEffect } from 'react';
import { 
    Tag, 
    Ruler, 
    Plus, 
    Trash2, 
    Loader2, 
    AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

// Simple API helper for masters
const mastersApi = {
    getCategories: async () => {
        const res = await fetch('/api/masters/categories', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        return res.json();
    },
    addCategory: async (name: string) => {
        const res = await fetch('/api/masters/categories', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ name })
        });
        return res.json();
    },
    deleteCategory: async (id: string) => {
        await fetch(`/api/masters/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
    },
    getUnits: async () => {
        const res = await fetch('/api/masters/units', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        return res.json();
    },
    addUnit: async (name: string) => {
        const res = await fetch('/api/masters/units', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ name })
        });
        return res.json();
    },
    deleteUnit: async (id: string) => {
        await fetch(`/api/masters/units/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
    },
    getSubCategories: async (categoryId?: string) => {
        const url = categoryId ? `/api/masters/subcategories?category_id=${categoryId}` : '/api/masters/subcategories';
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        return res.json();
    },
    addSubCategory: async (name: string, categoryId: string) => {
        const res = await fetch('/api/masters/subcategories', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ name, categoryId })
        });
        return res.json();
    },
    deleteSubCategory: async (id: string) => {
        await fetch(`/api/masters/subcategories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
    }
};

export const MasterDataPage = () => {
    const [activeTab, setActiveTab] = useState<'categories' | 'units' | 'subcategories'>('categories');
    const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
    const [units, setUnits] = useState<{id: string, name: string}[]>([]);
    const [subCategories, setSubCategories] = useState<{id: string, name: string, categoryId: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [newValue, setNewValue] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cats, uns, subs] = await Promise.all([
                mastersApi.getCategories(),
                mastersApi.getUnits(),
                mastersApi.getSubCategories()
            ]);
            setCategories(Array.isArray(cats) ? cats : []);
            setUnits(Array.isArray(uns) ? uns : []);
            setSubCategories(Array.isArray(subs) ? subs : []);
        } catch (error) {
            console.error("Failed to fetch master data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async () => {
        if (!newValue.trim()) return;
        if (activeTab === 'subcategories' && !selectedCategoryId) {
            alert("Please select a parent category first.");
            return;
        }
        try {
            setSaving(true);
            if (activeTab === 'categories') {
                await mastersApi.addCategory(newValue.trim());
            } else if (activeTab === 'units') {
                await mastersApi.addUnit(newValue.trim());
            } else {
                await mastersApi.addSubCategory(newValue.trim(), selectedCategoryId);
            }
            setNewValue('');
            fetchData();
        } catch (error) {
            console.error("Failed to add", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this? It will not affect existing products but will remove it from future suggestions.")) return;
        try {
            if (activeTab === 'categories') {
                await mastersApi.deleteCategory(id);
            } else if (activeTab === 'units') {
                await mastersApi.deleteUnit(id);
            } else {
                await mastersApi.deleteSubCategory(id);
            }
            fetchData();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Master Data Management</h1>
                <p className="text-muted-foreground">Manage categories and units of measure used across the system.</p>
            </div>

            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                <Button 
                    variant={activeTab === 'categories' ? 'default' : 'ghost'} 
                    onClick={() => setActiveTab('categories')}
                    className="gap-2"
                >
                    <Tag className="h-4 w-4" />
                    Categories
                </Button>
                <Button 
                    variant={activeTab === 'units' ? 'default' : 'ghost'} 
                    onClick={() => setActiveTab('units')}
                    className="gap-2"
                >
                    <Ruler className="h-4 w-4" />
                    Units
                </Button>
                <Button 
                    variant={activeTab === 'subcategories' ? 'default' : 'ghost'} 
                    onClick={() => setActiveTab('subcategories')}
                    className="gap-2"
                >
                    <Tag className="h-4 w-4" />
                    Sub-Categories
                </Button>
            </div>

            <div className="grid md:grid-cols-[1fr,2fr] gap-6">
                {/* Add Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add {activeTab === 'categories' ? 'Category' : activeTab === 'units' ? 'Unit' : 'Sub-Category'}</CardTitle>
                        <CardDescription>Enter a new name to add it to the master list.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {activeTab === 'subcategories' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Parent Category</label>
                                <select 
                                    className="w-full p-2 bg-background border border-input rounded-md focus:ring-1 focus:ring-primary outline-none"
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                >
                                    <option value="">-- Choose Category --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input 
                                placeholder={activeTab === 'categories' ? "e.g. Beverages" : activeTab === 'units' ? "e.g. kg" : "e.g. Soft Drinks"} 
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                        </div>
                        <Button className="w-full" onClick={handleAdd} disabled={saving || !newValue.trim() || (activeTab === 'subcategories' && !selectedCategoryId)}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Add {activeTab === 'categories' ? 'Category' : activeTab === 'units' ? 'Unit' : 'Sub-Category'}
                        </Button>
                    </CardContent>
                </Card>

                {/* List Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Existing {activeTab === 'categories' ? 'Categories' : activeTab === 'units' ? 'Units' : 'Sub-Categories'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">S.No</TableHead>
                                        <TableHead>Name</TableHead>
                                        {activeTab === 'subcategories' && <TableHead>Parent Category</TableHead>}
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(activeTab === 'categories' ? categories : activeTab === 'units' ? units : subCategories).map((item: any, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            {activeTab === 'subcategories' && (
                                                <TableCell className="text-muted-foreground">
                                                    {categories.find(c => c.id === item.categoryId)?.name || 'Unknown'}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(activeTab === 'categories' ? categories : activeTab === 'units' ? units : subCategories).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={activeTab === 'subcategories' ? 4 : 3} className="text-center py-8 text-muted-foreground">
                                                No {activeTab} added yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
