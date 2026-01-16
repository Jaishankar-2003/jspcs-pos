import { useState } from 'react';
import {
    UserPlus,
    Search,
    Shield,
    UserCheck,
    UserX,
    MoreVertical,
    Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/utils';
import { Modal } from '@/components/ui/Modal';

export const UsersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    // Mock user data
    const usersData = [
        { id: 1, name: "Admin User", username: "admin", role: "ADMIN", status: "Active", lastLogin: "10m ago", email: "admin@jspcs.com" },
        { id: 2, name: "John Cashier", username: "cashier1", role: "CASHIER", status: "Active", lastLogin: "1h ago", email: "john@jspcs.com" },
        { id: 3, name: "Jane Smith", username: "cashier2", role: "CASHIER", status: "Inactive", lastLogin: "2d ago", email: "jane@jspcs.com" },
        { id: 4, name: "Super Admin", username: "super", role: "ADMIN", status: "Active", lastLogin: "Just now", email: "super@jspcs.com" },
    ];

    const filteredUsers = usersData.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage system users, roles, and access permissions.</p>
                </div>
                <Button onClick={() => setIsAddUserOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New User
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>System Users</CardTitle>
                            <CardDescription>All registered users with access to the POS system.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Activity</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">@{user.username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <Shield className={cn(
                                                "h-3.5 w-3.5",
                                                user.role === "ADMIN" ? "text-primary" : "text-muted-foreground"
                                            )} />
                                            <span className="text-sm font-medium">{user.role}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                            user.status === "Active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                        )}>
                                            {user.status === "Active" ? <UserCheck className="mr-1 h-3 w-3" /> : <UserX className="mr-1 h-3 w-3" />}
                                            {user.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Modal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                title="Add New User"
                description="Create a new system account with specific roles."
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input placeholder="Enter full name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Username</label>
                            <Input placeholder="username" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="email@example.com" className="pl-9" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                <option value="CASHIER">Cashier</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Initial Password</label>
                            <Input type="password" placeholder="••••••••" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                        <Button onClick={() => setIsAddUserOpen(false)}>Create Account</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
