import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Truck,
    Phone,
    Mail,
    Loader2
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { suppliersApi } from '@/api/suppliers';
import type { Supplier } from '@/types';
import toast from 'react-hot-toast';

export const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        notes: ''
    });

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const data = await suppliersApi.getAll(true);
            setSuppliers(data);
        } catch (error) {
            console.error('Failed to fetch suppliers', error);
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleOpenAdd = () => {
        setEditingSupplier(null);
        setFormData({
            name: '',
            contactPerson: '',
            phone: '',
            email: '',
            address: '',
            gstin: '',
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (sup: Supplier) => {
        setEditingSupplier(sup);
        setFormData({
            name: sup.name,
            contactPerson: sup.contactPerson || '',
            phone: sup.phone || '',
            email: sup.email || '',
            address: sup.address || '',
            gstin: sup.gstin || '',
            notes: sup.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Supplier name is required');
            return;
        }

        try {
            setSubmitting(true);
            if (editingSupplier) {
                await suppliersApi.update(editingSupplier.id, formData);
                toast.success('Supplier updated successfully');
            } else {
                await suppliersApi.create(formData);
                toast.success('Supplier created successfully');
            }
            setIsModalOpen(false);
            fetchSuppliers();
        } catch (error) {
            console.error('Failed to save supplier', error);
            toast.error('Failed to save supplier');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete/archive supplier "${name}"?`)) return;
        try {
            const res = await suppliersApi.delete(id);
            toast.success(res.message || 'Supplier deleted');
            fetchSuppliers();
        } catch (error) {
            console.error('Failed to delete supplier', error);
            toast.error('Failed to delete supplier');
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone || '').includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
                    <p className="text-muted-foreground">Manage vendors, contact details, and purchase channels.</p>
                </div>
                <Button onClick={handleOpenAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Supplier
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Vendor Directory</CardTitle>
                            <CardDescription>All registered suppliers and procurement contacts.</CardDescription>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, contact, phone..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p>No suppliers registered yet.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier Name</TableHead>
                                    <TableHead>Contact Person</TableHead>
                                    <TableHead>Phone & Email</TableHead>
                                    <TableHead>GSTIN</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSuppliers.map((sup) => (
                                    <TableRow key={sup.id}>
                                        <TableCell className="font-semibold">{sup.name}</TableCell>
                                        <TableCell>{sup.contactPerson || '-'}</TableCell>
                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                {sup.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{sup.phone}</div>}
                                                {sup.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{sup.email}</div>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{sup.gstin || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${sup.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                                {sup.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(sup)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600" onClick={() => handleDelete(sup.id, sup.name)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Supplier Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                description="Enter supplier contact details and tax info."
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Supplier / Company Name *</label>
                        <Input
                            placeholder="e.g. Acme Wholesale Pvt Ltd"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Contact Person</label>
                            <Input
                                placeholder="e.g. Ramesh Kumar"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Phone Number</label>
                            <Input
                                placeholder="e.g. 9876543210"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                placeholder="sales@supplier.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">GSTIN</label>
                            <Input
                                placeholder="29XXXXX0000X1Z5"
                                value={formData.gstin}
                                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Address</label>
                        <Input
                            placeholder="Full address / City"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Notes</label>
                        <Input
                            placeholder="Payment terms, delivery frequency..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={submitting}>
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Supplier
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
