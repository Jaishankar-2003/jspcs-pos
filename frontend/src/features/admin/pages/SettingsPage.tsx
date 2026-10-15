import { useState, useEffect } from 'react';
import {
    Settings,
    Bell,
    Lock,
    User,
    Database,
    Palette,
    HelpCircle,
    Save,
    Store,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/utils';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('General');
    const [loading, setLoading] = useState(false);

    // Store Info State
    const [generalSettings, setGeneralSettings] = useState({
        businessName: "JSPCS POS",
        currency: "₹ (INR)",
        taxRate: "18",
        language: "English (India)",
        timezone: "(GMT+05:30) India Standard Time"
    });

    useEffect(() => {
        const saved = localStorage.getItem('pos_general_settings');
        if (saved) {
            setGeneralSettings(JSON.parse(saved));
        }
    }, []);

    const handleSave = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            localStorage.setItem('pos_general_settings', JSON.stringify(generalSettings));
            setLoading(false);
            toast.success("Settings saved successfully!");
        }, 800);
    };

    const handleBackup = async () => {
        try {
            setLoading(true);
            // Simulate backup
            await new Promise(r => setTimeout(r, 1500));
            toast.success("Database backup created successfully!");
        } catch (error) {
            toast.error("Backup failed");
        } finally {
            setLoading(false);
        }
    };

    const navItems = [
        { name: "General", icon: Settings },
        { name: "Store Info", icon: Store },
        { name: "Account", icon: User },
        { name: "Security", icon: Lock },
        { name: "Notifications", icon: Bell },
        { name: "Appearance", icon: Palette },
        { name: "Database", icon: Database },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your application preferences and system configuration.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <div className="md:col-span-1">
                    <nav className="flex flex-col space-y-1">
                        {navItems.map((item) => (
                            <Button
                                key={item.name}
                                variant={activeTab === item.name ? "secondary" : "ghost"}
                                className={cn("justify-start", activeTab === item.name && "bg-secondary")}
                                onClick={() => setActiveTab(item.name)}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.name}
                            </Button>
                        ))}
                    </nav>
                </div>

                <div className="md:col-span-3 space-y-6">
                    {activeTab === 'General' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>General Settings</CardTitle>
                                <CardDescription>Configure basic application settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Business Name</label>
                                        <Input
                                            value={generalSettings.businessName}
                                            onChange={(e) => setGeneralSettings({ ...generalSettings, businessName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Currency Symbol</label>
                                        <Input
                                            value={generalSettings.currency}
                                            onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Default Tax Rate (%)</label>
                                    <Input
                                        type="number"
                                        value={generalSettings.taxRate}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, taxRate: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-4">
                                    <Button onClick={handleSave} disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'Store Info' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Store Information</CardTitle>
                                <CardDescription>Details displayed on invoices.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Address</label>
                                        <Input placeholder="123 Main St, City" />
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Phone</label>
                                            <Input placeholder="+91 9876543210" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">GSTIN</label>
                                            <Input placeholder="29XXXXX0000X1Z5" />
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <Button onClick={() => toast.success("Store Info Saved (Mock)")}>Save Info</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'Database' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Database Management</CardTitle>
                                <CardDescription>Backup and restore system data.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="border p-4 rounded-lg bg-yellow-500/10 border-yellow-500/20">
                                        <h4 className="font-bold text-yellow-700">Backup Warning</h4>
                                        <p className="text-sm text-yellow-600">Ensure no active sales are in progress before backing up.</p>
                                    </div>
                                    <Button onClick={handleBackup} disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                                        Create Backup Now
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Placeholder for other tabs */}
                    {['Account', 'Security', 'Notifications', 'Appearance'].includes(activeTab) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{activeTab} Settings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">This section is currently under development.</p>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="h-5 w-5 text-muted-foreground" />
                            <div className="text-sm">
                                <p className="font-medium">Need help with configuration?</p>
                                <p className="text-muted-foreground">Check our documentation or contact support.</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => window.open('https://docs.jspcs.com', '_blank')}>Documentation</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
