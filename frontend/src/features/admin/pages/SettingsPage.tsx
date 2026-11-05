import { useState, useEffect } from 'react';
import {
    Settings,
    Bell,
    Lock,
    User,
    Database,
    Palette,
    Save,
    Store,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/utils';
import { settingsApi } from '@/api/settings';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('General');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [generalSettings, setGeneralSettings] = useState({
        businessName: "JSPCS POS",
        currency: "₹",
        taxRate: "18",
        storeAddress: "",
        storePhone: "",
        storeGstin: "",
        receiptFooter: "Thank you for shopping with us! Visit again."
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);
                const data = await settingsApi.getAll();
                setGeneralSettings((prev) => ({
                    ...prev,
                    ...data
                }));
            } catch (error) {
                console.error("Failed to load settings from server", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            setSaving(true);
            await settingsApi.update(generalSettings);
            toast.success("Settings saved successfully to server!");
        } catch (error) {
            console.error("Failed to save settings", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
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
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'General' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>General Settings</CardTitle>
                                        <CardDescription>Configure core store parameters stored in the database.</CardDescription>
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
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Receipt Footer Message</label>
                                            <Input
                                                value={generalSettings.receiptFooter}
                                                onChange={(e) => setGeneralSettings({ ...generalSettings, receiptFooter: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2 pt-4">
                                            <Button onClick={handleSave} disabled={saving}>
                                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                                        <CardDescription>Details displayed on customer receipts and purchase orders.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Address</label>
                                            <Input
                                                placeholder="123 Main St, City"
                                                value={generalSettings.storeAddress}
                                                onChange={(e) => setGeneralSettings({ ...generalSettings, storeAddress: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Phone</label>
                                                <Input
                                                    placeholder="+91 9876543210"
                                                    value={generalSettings.storePhone}
                                                    onChange={(e) => setGeneralSettings({ ...generalSettings, storePhone: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">GSTIN</label>
                                                <Input
                                                    placeholder="29XXXXX0000X1Z5"
                                                    value={generalSettings.storeGstin}
                                                    onChange={(e) => setGeneralSettings({ ...generalSettings, storeGstin: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-4">
                                            <Button onClick={handleSave} disabled={saving}>
                                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Save Store Info
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {activeTab === 'Database' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Database Management</CardTitle>
                                        <CardDescription>System persistence status.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="border p-4 rounded-lg bg-emerald-500/10 border-emerald-500/20 text-emerald-700">
                                            <h4 className="font-bold">Database Connected</h4>
                                            <p className="text-sm text-emerald-600">All data is persisted safely in relational tables with foreign keys and movement ledgers.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
